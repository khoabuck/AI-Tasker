using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using AITasker.Infrastructure.Common;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Banking
{
    public class WithdrawalService : IWithdrawalService
    {
        private const string WithdrawalStatusFailed = "FAILED";
        private const string WithdrawalStatusPending = "PENDING";
        private const string WithdrawalStatusProcessing = "PROCESSING";
        private const string WithdrawalStatusPaid = "PAID";
        private const string WithdrawalStatusRejected = "REJECTED";
        private const string WithdrawalStatusExpired = "EXPIRED";

        private const string BankVerificationStatusResolved = "BANK_NAME_RESOLVED";

        private const string TransactionStatusSuccess = "SUCCESS";
        private const string TransactionStatusFailed = "FAILED";

        private const string TransactionTypeWithdrawalFailed = "WITHDRAWAL_FAILED";
        private const string TransactionTypeWithdrawalHold = "WITHDRAWAL_HOLD";
        private const string TransactionTypeWithdrawalPaid = "WITHDRAWAL_PAID";
        private const string TransactionTypeWithdrawalRejected = "WITHDRAWAL_REJECTED";
        private const string TransactionTypeWithdrawalExpired = "WITHDRAWAL_EXPIRED";
        private const string TransactionTypeWithdrawalPayoutProcessing = "WITHDRAWAL_PAYOUT_PROCESSING";
        private const string TransactionTypeWithdrawalPayoutFailed = "WITHDRAWAL_PAYOUT_FAILED";

        private const string PayoutProviderManual = "MANUAL";
        private const string PayoutProviderPayOs = "PAYOS";

        private readonly AITaskerDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly IMarketplaceWorkflowPolicyService _workflowPolicyService;
        private readonly IPayOsPayoutService _payOsPayoutService;

        public WithdrawalService(
            AITaskerDbContext context,
            INotificationService notificationService,
            IMarketplaceWorkflowPolicyService workflowPolicyService,
            IPayOsPayoutService payOsPayoutService)
        {
            _context = context;
            _notificationService = notificationService;
            _workflowPolicyService = workflowPolicyService;
            _payOsPayoutService = payOsPayoutService;
        }

        public async Task<WithdrawalResponse> CreateWithdrawalRequestAsync(
            int userId,
            CreateWithdrawalRequest request)
        {
            var workflowPolicy = await _workflowPolicyService.GetActivePolicyAsync();

            var resolvedBank = ResolveWithdrawalBank(request);

            ValidateCreateWithdrawalRequest(
                request,
                workflowPolicy.MinimumWithdrawalAmount);

            await using var dbTransaction = await _context.Database.BeginTransactionAsync();
            var dbTransactionCompleted = false;

            try
            {
                var userExists = await _context.Users.AnyAsync(u => u.UserId == userId);

                if (!userExists)
                {
                    throw new InvalidOperationException("User not found.");
                }

                var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);

                if (wallet == null)
                {
                    throw new InvalidOperationException("Wallet not found.");
                }

                var now = VietnamDateTime.Now;
                var bankResolveMessage = $"Bank name resolved to {resolvedBank.DisplayName} ({resolvedBank.Bin}) for PayOS payout. No external bank account verification is performed.";

                if (wallet.AvailableBalance < request.Amount)
                {
                    throw new InvalidOperationException("Insufficient available balance.");
                }

                var feeAmount = 0m;
                var netAmount = request.Amount;

                wallet.AvailableBalance -= request.Amount;
                wallet.LockedBalance += request.Amount;
                wallet.UpdatedAt = now;

                var withdrawalRequest = new WithdrawalRequest
                {
                    UserId = userId,
                    Amount = request.Amount,
                    FeeAmount = feeAmount,
                    NetAmount = netAmount,
                    BankCode = resolvedBank.Code,
                    BankBin = resolvedBank.Bin,
                    BankName = resolvedBank.DisplayName,
                    BankAccountNumber = request.BankAccountNumber.Trim(),
                    BankAccountHolder = request.BankAccountHolder.Trim(),
                    BankVerificationStatus = BankVerificationStatusResolved,
                    BankVerificationMessage = bankResolveMessage,
                    PayoutReferenceCode = null,
                    PayoutProvider = null,
                    Status = WithdrawalStatusPending,
                    AdminNote = null,
                    CreatedAt = now,
                    ProcessedAt = null,
                    ProcessedByAdminId = null
                };

                _context.WithdrawalRequests.Add(withdrawalRequest);

                await _context.SaveChangesAsync();

                var referenceId = BuildWithdrawalReference(withdrawalRequest.WithdrawalRequestId);

                _context.Transactions.Add(new Transaction
                {
                    UserId = userId,
                    ProjectId = null,
                    MilestoneId = null,
                    EscrowId = null,
                    Amount = -request.Amount,
                    Type = TransactionTypeWithdrawalHold,
                    Status = TransactionStatusSuccess,
                    Description = $"[Withdrawal Hold] Held {request.Amount:N0} VND for Withdrawal Request ID {withdrawalRequest.WithdrawalRequestId}. Net payout: {netAmount:N0} VND.",
                    ReferenceId = referenceId,
                    CreatedAt = now
                });

                await _context.SaveChangesAsync();
                await dbTransaction.CommitAsync();
                dbTransactionCompleted = true;
                await dbTransaction.DisposeAsync();

                await _notificationService.CreateNotificationAsync(
                    userId,
                    "Withdrawal request submitted",
                    $"Your withdrawal request of {request.Amount:N0} VND has been submitted. Net payout: {netAmount:N0} VND. The amount is held until admin processes the payout.",
                    "WITHDRAWAL_REQUESTED",
                    relatedEntityType: "WITHDRAWAL",
                    relatedEntityId: withdrawalRequest.WithdrawalRequestId);

                return await BuildResponseAsync(withdrawalRequest.WithdrawalRequestId);
            }
            catch
            {
                if (!dbTransactionCompleted)
                {
                    await dbTransaction.RollbackAsync();
                }

                throw;
            }
        }

        public async Task<IReadOnlyList<WithdrawalResponse>> GetMyWithdrawalRequestsAsync(int userId)
        {
            var workflowPolicy = await _workflowPolicyService.GetActivePolicyAsync();
            var requests = await BuildWithdrawalQuery()
                .Where(w => w.UserId == userId)
                .OrderByDescending(w => w.CreatedAt)
                .ToListAsync();

            return requests
                .Select(w => MapWithdrawalResponse(w, workflowPolicy))
                .ToList();
        }

        public async Task<IReadOnlyList<WithdrawalResponse>> GetAllWithdrawalRequestsAsync(string? status)
        {
            var workflowPolicy = await _workflowPolicyService.GetActivePolicyAsync();
            var query = BuildWithdrawalQuery();

            if (!string.IsNullOrWhiteSpace(status))
            {
                var normalizedStatus = status.Trim().ToUpperInvariant();
                query = query.Where(w => w.Status == normalizedStatus);
            }

            var requests = await query
                .OrderByDescending(w => w.CreatedAt)
                .ToListAsync();

            return requests
                .Select(w => MapWithdrawalResponse(w, workflowPolicy))
                .ToList();
        }

        public async Task<WithdrawalResponse> ApproveWithdrawalAsync(
            int withdrawalRequestId,
            int adminId,
            ProcessWithdrawalRequest request)
        {
            ValidateApproveWithdrawalRequest(request);

            await using var dbTransaction = await _context.Database.BeginTransactionAsync();
            var dbTransactionCompleted = false;

            try
            {
                var withdrawalRequest = await GetWithdrawalForUpdateAsync(withdrawalRequestId);

                EnsurePending(withdrawalRequest, "Only pending withdrawal requests can be marked as paid.");
                await EnsurePendingWithinApprovalWindowAsync(withdrawalRequest);

                var wallet = await GetWalletForWithdrawalAsync(withdrawalRequest);
                EnsureHeldBalance(wallet, withdrawalRequest);

                var now = VietnamDateTime.Now;
                var payoutReferenceCode = request.PayoutReferenceCode!.Trim();

                await FinalizePaidWithdrawalAsync(
                    withdrawalRequest,
                    wallet,
                    adminId,
                    now,
                    payoutReferenceCode,
                    PayoutProviderManual,
                    NormalizeOptionalText(request.AdminNote));

                await _context.SaveChangesAsync();
                await dbTransaction.CommitAsync();
                dbTransactionCompleted = true;
                await dbTransaction.DisposeAsync();

                await _notificationService.CreateNotificationAsync(
                    withdrawalRequest.UserId,
                    "Withdrawal paid",
                    $"Your withdrawal request of {withdrawalRequest.Amount:N0} VND has been paid. Net payout: {withdrawalRequest.NetAmount:N0} VND.",
                    "WITHDRAWAL_PAID",
                    relatedEntityType: "WITHDRAWAL",
                    relatedEntityId: withdrawalRequest.WithdrawalRequestId);

                return await BuildResponseAsync(withdrawalRequestId);
            }
            catch
            {
                if (!dbTransactionCompleted)
                {
                    await dbTransaction.RollbackAsync();
                }

                throw;
            }
        }

        public async Task<WithdrawalResponse> ApproveWithdrawalWithPayOsAsync(
            int withdrawalRequestId,
            int adminId,
            ProcessWithdrawalRequest request)
        {
            string referenceId;
            string idempotencyKey;
            long payoutAmount;
            string payoutDescription;
            string bankBin;
            string bankAccountNumber;
            string? adminNote;

            await using (var prepareTransaction = await _context.Database.BeginTransactionAsync())
            {
                var prepareTransactionCompleted = false;

                try
                {
                    var withdrawalRequest = await GetWithdrawalForUpdateAsync(withdrawalRequestId);

                    EnsurePending(withdrawalRequest, "Only pending withdrawal requests can be sent to PayOS payout.");
                    await EnsurePendingWithinApprovalWindowAsync(withdrawalRequest);

                    var wallet = await GetWalletForWithdrawalAsync(withdrawalRequest);
                    EnsureHeldBalance(wallet, withdrawalRequest);
                    EnsurePayOsBankFieldsReady(withdrawalRequest);

                    withdrawalRequest.FeeAmount = 0m;
                    withdrawalRequest.NetAmount = withdrawalRequest.Amount;

                    referenceId = BuildWithdrawalReference(withdrawalRequest.WithdrawalRequestId);
                    idempotencyKey = string.IsNullOrWhiteSpace(withdrawalRequest.PayOsIdempotencyKey)
                        ? Guid.NewGuid().ToString("N")
                        : withdrawalRequest.PayOsIdempotencyKey!;
                    payoutAmount = DecimalToVndLong(withdrawalRequest.NetAmount);
                    payoutDescription = BuildPayOsPayoutDescription(withdrawalRequest.WithdrawalRequestId);
                    bankBin = withdrawalRequest.BankBin;
                    bankAccountNumber = withdrawalRequest.BankAccountNumber;
                    adminNote = NormalizeOptionalText(request?.AdminNote);

                    withdrawalRequest.PayOsIdempotencyKey = idempotencyKey;
                    withdrawalRequest.AdminNote = adminNote;

                    await _context.SaveChangesAsync();
                    await prepareTransaction.CommitAsync();
                    prepareTransactionCompleted = true;
                }
                catch
                {
                    if (!prepareTransactionCompleted)
                    {
                        await prepareTransaction.RollbackAsync();
                    }

                    throw;
                }
            }

            var payout = await _payOsPayoutService.CreateSinglePayoutAsync(
                new PayOsPayoutCreateRequest
                {
                    ReferenceId = referenceId,
                    Amount = payoutAmount,
                    Description = payoutDescription,
                    ToBin = bankBin,
                    ToAccountNumber = bankAccountNumber,
                    Category = new[] { "withdrawal" },
                    IdempotencyKey = idempotencyKey
                });

            await using var dbTransaction = await _context.Database.BeginTransactionAsync();
            var dbTransactionCompleted = false;

            try
            {
                var withdrawalRequest = await GetWithdrawalForUpdateAsync(withdrawalRequestId);

                EnsurePending(withdrawalRequest, "Only pending withdrawal requests can be sent to PayOS payout.");

                var wallet = await GetWalletForWithdrawalAsync(withdrawalRequest);
                EnsureHeldBalance(wallet, withdrawalRequest);

                var now = VietnamDateTime.Now;

                withdrawalRequest.Status = WithdrawalStatusProcessing;
                withdrawalRequest.PayoutProvider = PayoutProviderPayOs;
                withdrawalRequest.PayoutReferenceCode = string.IsNullOrWhiteSpace(payout.ReferenceId)
                    ? referenceId
                    : payout.ReferenceId;
                withdrawalRequest.PayOsPayoutId = payout.PayoutId;
                withdrawalRequest.PayOsReferenceId = payout.ReferenceId;
                withdrawalRequest.PayOsIdempotencyKey = idempotencyKey;
                withdrawalRequest.PayOsApprovalState = payout.ApprovalState;
                withdrawalRequest.PayOsRawResponse = payout.RawResponse;
                withdrawalRequest.PayOsTransactionId = payout.FirstTransaction?.TransactionId;
                withdrawalRequest.PayOsTransactionState = payout.FirstTransaction?.State;
                withdrawalRequest.PayoutRequestedAt = now;
                withdrawalRequest.ProcessedByAdminId = adminId;
                withdrawalRequest.AdminNote = adminNote;

                var transactionReferenceId = withdrawalRequest.PayOsPayoutId ?? referenceId;
                var hasProcessingTransaction = await _context.Transactions.AnyAsync(x =>
                    x.UserId == withdrawalRequest.UserId &&
                    x.Type == TransactionTypeWithdrawalPayoutProcessing &&
                    x.ReferenceId == transactionReferenceId);

                if (!hasProcessingTransaction)
                {
                    _context.Transactions.Add(new Transaction
                    {
                        UserId = withdrawalRequest.UserId,
                        ProjectId = null,
                        MilestoneId = null,
                        EscrowId = null,
                        Amount = 0,
                        Type = TransactionTypeWithdrawalPayoutProcessing,
                        Status = TransactionStatusSuccess,
                        Description = $"[PayOS Payout Processing] PayOS payout created for Withdrawal Request ID {withdrawalRequest.WithdrawalRequestId}. Payout ID: {withdrawalRequest.PayOsPayoutId}.",
                        ReferenceId = transactionReferenceId,
                        CreatedAt = now
                    });
                }

                await _context.SaveChangesAsync();
                await dbTransaction.CommitAsync();
                dbTransactionCompleted = true;
            }
            catch
            {
                if (!dbTransactionCompleted)
                {
                    await dbTransaction.RollbackAsync();
                }

                throw;
            }

            var response = await BuildResponseAsync(withdrawalRequestId);

            await _notificationService.CreateNotificationAsync(
                response.UserId,
                "Withdrawal payout processing",
                $"Your withdrawal request of {response.Amount:N0} VND is being processed by PayOS. Net payout: {response.NetAmount:N0} VND.",
                "WITHDRAWAL_PROCESSING",
                relatedEntityType: "WITHDRAWAL",
                relatedEntityId: response.WithdrawalRequestId);

            return response;
        }

        public async Task<WithdrawalResponse> SyncPayOsWithdrawalAsync(
            int withdrawalRequestId,
            int adminId)
        {
            await using var dbTransaction = await _context.Database.BeginTransactionAsync();
            var dbTransactionCompleted = false;

            try
            {
                var withdrawalRequest = await GetWithdrawalForUpdateAsync(withdrawalRequestId);

                if (withdrawalRequest.Status != WithdrawalStatusProcessing)
                {
                    throw new InvalidOperationException("Only processing PayOS withdrawal requests can be synchronized.");
                }

                if (!string.Equals(withdrawalRequest.PayoutProvider, PayoutProviderPayOs, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException("This withdrawal request is not a PayOS payout.");
                }

                if (string.IsNullOrWhiteSpace(withdrawalRequest.PayOsPayoutId))
                {
                    throw new InvalidOperationException("PayOS payout id is missing.");
                }

                var payout = await _payOsPayoutService.GetPayoutAsync(withdrawalRequest.PayOsPayoutId);
                var wallet = await GetWalletForWithdrawalAsync(withdrawalRequest);
                var now = VietnamDateTime.Now;

                withdrawalRequest.PayOsApprovalState = payout.ApprovalState;
                withdrawalRequest.PayOsRawResponse = payout.RawResponse;
                withdrawalRequest.PayOsReferenceId = string.IsNullOrWhiteSpace(payout.ReferenceId)
                    ? withdrawalRequest.PayOsReferenceId
                    : payout.ReferenceId;
                withdrawalRequest.PayOsTransactionId = string.IsNullOrWhiteSpace(payout.FirstTransaction?.TransactionId)
                    ? withdrawalRequest.PayOsTransactionId
                    : payout.FirstTransaction!.TransactionId;
                withdrawalRequest.PayOsTransactionState = string.IsNullOrWhiteSpace(payout.FirstTransaction?.State)
                    ? withdrawalRequest.PayOsTransactionState
                    : payout.FirstTransaction!.State;

                var payoutState = withdrawalRequest.PayOsApprovalState;
                var transactionState = withdrawalRequest.PayOsTransactionState;

                if (IsPayOsSuccessState(payoutState) || IsPayOsSuccessState(transactionState))
                {
                    EnsureHeldBalance(wallet, withdrawalRequest);

                    await FinalizePaidWithdrawalAsync(
                        withdrawalRequest,
                        wallet,
                        adminId,
                        now,
                        withdrawalRequest.PayOsTransactionId
                            ?? withdrawalRequest.PayOsPayoutId
                            ?? BuildWithdrawalReference(withdrawalRequest.WithdrawalRequestId),
                        PayoutProviderPayOs,
                        withdrawalRequest.AdminNote);

                    withdrawalRequest.PayoutConfirmedAt = now;

                    await _context.SaveChangesAsync();
                    await dbTransaction.CommitAsync();
                dbTransactionCompleted = true;
                await dbTransaction.DisposeAsync();

                    await _notificationService.CreateNotificationAsync(
                        withdrawalRequest.UserId,
                        "Withdrawal paid",
                        $"Your withdrawal request of {withdrawalRequest.Amount:N0} VND has been paid through PayOS. Net payout: {withdrawalRequest.NetAmount:N0} VND.",
                        "WITHDRAWAL_PAID",
                        relatedEntityType: "WITHDRAWAL",
                        relatedEntityId: withdrawalRequest.WithdrawalRequestId);
                }
                else if (IsPayOsFailedState(payoutState) || IsPayOsFailedState(transactionState))
                {
                    EnsureHeldBalance(wallet, withdrawalRequest);

                    var failureReason = payout.FirstTransaction?.ErrorMessage
                        ?? payout.FirstTransaction?.ErrorCode
                        ?? $"PayOS payout failed. ApprovalState={payoutState}, TransactionState={transactionState}";

                    wallet.LockedBalance -= withdrawalRequest.Amount;
                    wallet.AvailableBalance += withdrawalRequest.Amount;
                    wallet.UpdatedAt = now;

                    withdrawalRequest.Status = WithdrawalStatusFailed;
                    withdrawalRequest.FailureReason = failureReason;
                    withdrawalRequest.ProcessedAt = now;
                    withdrawalRequest.ProcessedByAdminId = adminId;

                    _context.Transactions.Add(new Transaction
                    {
                        UserId = withdrawalRequest.UserId,
                        ProjectId = null,
                        MilestoneId = null,
                        EscrowId = null,
                        Amount = withdrawalRequest.Amount,
                        Type = TransactionTypeWithdrawalPayoutFailed,
                        Status = TransactionStatusFailed,
                        Description = $"[PayOS Payout Failed] Returned held amount for Withdrawal Request ID {withdrawalRequest.WithdrawalRequestId}. Reason: {failureReason}",
                        ReferenceId = withdrawalRequest.PayOsPayoutId,
                        CreatedAt = now
                    });

                    await _context.SaveChangesAsync();
                    await dbTransaction.CommitAsync();
                dbTransactionCompleted = true;
                await dbTransaction.DisposeAsync();

                    await _notificationService.CreateNotificationAsync(
                        withdrawalRequest.UserId,
                        "Withdrawal failed",
                        $"Your withdrawal request of {withdrawalRequest.Amount:N0} VND failed during PayOS payout. The held amount has been returned to your available balance. Reason: {failureReason}",
                        "WITHDRAWAL_FAILED",
                        relatedEntityType: "WITHDRAWAL",
                        relatedEntityId: withdrawalRequest.WithdrawalRequestId);
                }
                else
                {
                    await _context.SaveChangesAsync();
                    await dbTransaction.CommitAsync();
                dbTransactionCompleted = true;
                await dbTransaction.DisposeAsync();
                }

                return await BuildResponseAsync(withdrawalRequestId);
            }
            catch
            {
                if (!dbTransactionCompleted)
                {
                    await dbTransaction.RollbackAsync();
                }

                throw;
            }
        }

        public async Task<WithdrawalResponse> RejectWithdrawalAsync(
            int withdrawalRequestId,
            int adminId,
            ProcessWithdrawalRequest request)
        {
            await using var dbTransaction = await _context.Database.BeginTransactionAsync();
            var dbTransactionCompleted = false;

            try
            {
                var withdrawalRequest = await GetWithdrawalForUpdateAsync(withdrawalRequestId);

                EnsurePending(withdrawalRequest, "Only pending withdrawal requests can be rejected.");
                await EnsurePendingWithinApprovalWindowAsync(withdrawalRequest);

                var wallet = await GetWalletForWithdrawalAsync(withdrawalRequest);
                EnsureHeldBalance(wallet, withdrawalRequest);

                var now = VietnamDateTime.Now;
                var referenceId = BuildWithdrawalReference(withdrawalRequest.WithdrawalRequestId);

                wallet.LockedBalance -= withdrawalRequest.Amount;
                wallet.AvailableBalance += withdrawalRequest.Amount;
                wallet.UpdatedAt = now;

                withdrawalRequest.Status = WithdrawalStatusRejected;
                withdrawalRequest.AdminNote = NormalizeOptionalText(request.AdminNote);
                withdrawalRequest.ProcessedAt = now;
                withdrawalRequest.ProcessedByAdminId = adminId;

                _context.Transactions.Add(new Transaction
                {
                    UserId = withdrawalRequest.UserId,
                    ProjectId = null,
                    MilestoneId = null,
                    EscrowId = null,
                    Amount = withdrawalRequest.Amount,
                    Type = TransactionTypeWithdrawalRejected,
                    Status = TransactionStatusSuccess,
                    Description = $"[Withdrawal Rejected] Returned held withdrawal amount for Withdrawal Request ID {withdrawalRequest.WithdrawalRequestId}.",
                    ReferenceId = referenceId,
                    CreatedAt = now
                });

                await _context.SaveChangesAsync();
                await dbTransaction.CommitAsync();
                dbTransactionCompleted = true;
                await dbTransaction.DisposeAsync();

                await _notificationService.CreateNotificationAsync(
                    withdrawalRequest.UserId,
                    "Withdrawal rejected",
                    string.IsNullOrWhiteSpace(withdrawalRequest.AdminNote)
                        ? $"Your withdrawal request of {withdrawalRequest.Amount:N0} VND has been rejected. The held amount has been returned to your available balance."
                        : $"Your withdrawal request of {withdrawalRequest.Amount:N0} VND has been rejected. Reason: {withdrawalRequest.AdminNote}. The held amount has been returned to your available balance.",
                    "WITHDRAWAL_REJECTED",
                    relatedEntityType: "WITHDRAWAL",
                    relatedEntityId: withdrawalRequest.WithdrawalRequestId);

                return await BuildResponseAsync(withdrawalRequestId);
            }
            catch
            {
                if (!dbTransactionCompleted)
                {
                    await dbTransaction.RollbackAsync();
                }

                throw;
            }
        }

        private async Task FinalizePaidWithdrawalAsync(
            WithdrawalRequest withdrawalRequest,
            Wallet wallet,
            int adminId,
            DateTime now,
            string payoutReferenceCode,
            string payoutProvider,
            string? adminNote)
        {
            withdrawalRequest.FeeAmount = 0m;
            withdrawalRequest.NetAmount = withdrawalRequest.Amount;

            wallet.LockedBalance -= withdrawalRequest.Amount;
            wallet.UpdatedAt = now;

            withdrawalRequest.Status = WithdrawalStatusPaid;
            withdrawalRequest.PayoutProvider = payoutProvider;
            withdrawalRequest.PayoutReferenceCode = payoutReferenceCode;
            withdrawalRequest.AdminNote = adminNote;
            withdrawalRequest.ProcessedAt = now;
            withdrawalRequest.ProcessedByAdminId = adminId;
            withdrawalRequest.FailureReason = null;

            _context.Transactions.Add(new Transaction
            {
                UserId = withdrawalRequest.UserId,
                ProjectId = null,
                MilestoneId = null,
                EscrowId = null,
                Amount = -withdrawalRequest.NetAmount,
                Type = TransactionTypeWithdrawalPaid,
                Status = TransactionStatusSuccess,
                Description = $"[Withdrawal Paid] Paid {withdrawalRequest.NetAmount:N0} VND to {withdrawalRequest.BankName} account {withdrawalRequest.BankAccountNumber} via {payoutProvider}.",
                ReferenceId = payoutReferenceCode,
                CreatedAt = now
            });

        }

        private static VietnamBankInfo ResolveWithdrawalBank(CreateWithdrawalRequest request)
        {
            if (request == null)
            {
                throw new InvalidOperationException("Withdrawal request is required.");
            }

            return VietnamBankResolver.Resolve(
                bankCode: null,
                bankBin: null,
                bankName: request.BankName);
        }

        private static void ValidateCreateWithdrawalRequest(
            CreateWithdrawalRequest request,
            decimal minimumWithdrawalAmount)
        {
            if (request == null)
            {
                throw new InvalidOperationException("Withdrawal request is required.");
            }

            if (request.Amount < minimumWithdrawalAmount)
            {
                throw new InvalidOperationException($"Minimum withdrawal amount is {minimumWithdrawalAmount:N0} VND.");
            }

            if (request.Amount != decimal.Truncate(request.Amount))
            {
                throw new InvalidOperationException("Withdrawal amount must be a whole VND amount.");
            }

            if (string.IsNullOrWhiteSpace(request.BankName))
            {
                throw new InvalidOperationException("Bank name is required.");
            }

            if (string.IsNullOrWhiteSpace(request.BankAccountNumber))
            {
                throw new InvalidOperationException("Bank account number is required.");
            }

            if (string.IsNullOrWhiteSpace(request.BankAccountHolder))
            {
                throw new InvalidOperationException("Bank account holder is required.");
            }
        }

        private static void ValidateApproveWithdrawalRequest(ProcessWithdrawalRequest request)
        {
            if (request == null)
            {
                throw new InvalidOperationException("Withdrawal processing request is required.");
            }

            if (string.IsNullOrWhiteSpace(request.PayoutReferenceCode))
            {
                throw new InvalidOperationException("Payout reference code is required after completing the manual bank transfer.");
            }
        }


        private static string? NormalizeOptionalText(string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? null
                : value.Trim();
        }

        private static string BuildWithdrawalReference(int withdrawalRequestId)
        {
            return $"WITHDRAWAL_{withdrawalRequestId}";
        }

        private static string BuildPayOsPayoutDescription(int withdrawalRequestId)
        {
            return $"AITASKER WD {withdrawalRequestId}";
        }

        private static long DecimalToVndLong(decimal amount)
        {
            if (amount != decimal.Truncate(amount))
            {
                throw new InvalidOperationException("PayOS payout amount must be a whole VND amount.");
            }

            if (amount <= 0 || amount > long.MaxValue)
            {
                throw new InvalidOperationException("Invalid PayOS payout amount.");
            }

            return decimal.ToInt64(amount);
        }

        private static bool IsPayOsSuccessState(string? state)
        {
            if (string.IsNullOrWhiteSpace(state))
            {
                return false;
            }

            return state.Trim().ToUpperInvariant() is "SUCCEEDED" or "SUCCESS" or "COMPLETED" or "PAID";
        }

        private static bool IsPayOsFailedState(string? state)
        {
            if (string.IsNullOrWhiteSpace(state))
            {
                return false;
            }

            return state.Trim().ToUpperInvariant() is "FAILED" or "FAIL" or "CANCELLED" or "CANCELED" or "REJECTED";
        }

        private static void EnsurePending(WithdrawalRequest withdrawalRequest, string message)
        {
            if (withdrawalRequest.Status != WithdrawalStatusPending)
            {
                throw new InvalidOperationException(message);
            }
        }

        private static void EnsureHeldBalance(Wallet wallet, WithdrawalRequest withdrawalRequest)
        {
            if (wallet.LockedBalance < withdrawalRequest.Amount)
            {
                throw new InvalidOperationException("Held withdrawal balance is insufficient.");
            }
        }

        private static void EnsurePayOsBankFieldsReady(WithdrawalRequest withdrawalRequest)
        {
            var resolvedBank = VietnamBankResolver.Resolve(
                withdrawalRequest.BankCode,
                withdrawalRequest.BankBin,
                withdrawalRequest.BankName);

            withdrawalRequest.BankCode = resolvedBank.Code;
            withdrawalRequest.BankBin = resolvedBank.Bin;
            withdrawalRequest.BankName = resolvedBank.DisplayName;
        }


        private async Task EnsurePendingWithinApprovalWindowAsync(WithdrawalRequest withdrawalRequest)
        {
            var workflowPolicy = await _workflowPolicyService.GetActivePolicyAsync();
            var approvalDeadlineAt = withdrawalRequest.CreatedAt.AddHours(workflowPolicy.WithdrawalApprovalWindowHours);

            if (approvalDeadlineAt <= VietnamDateTime.Now)
            {
                throw new InvalidOperationException("Withdrawal request expired before admin processing. Wait for the expiry job to return the held amount, or run the expiry check first.");
            }
        }

        private async Task<WithdrawalRequest> GetWithdrawalForUpdateAsync(int withdrawalRequestId)
        {
            var withdrawalRequest = await _context.WithdrawalRequests
                .FirstOrDefaultAsync(w => w.WithdrawalRequestId == withdrawalRequestId);

            if (withdrawalRequest == null)
            {
                throw new InvalidOperationException("Withdrawal request not found.");
            }

            return withdrawalRequest;
        }

        private async Task<Wallet> GetWalletForWithdrawalAsync(WithdrawalRequest withdrawalRequest)
        {
            var wallet = await _context.Wallets
                .FirstOrDefaultAsync(w => w.UserId == withdrawalRequest.UserId);

            if (wallet == null)
            {
                throw new InvalidOperationException("Wallet not found.");
            }

            return wallet;
        }

        private IQueryable<WithdrawalRequest> BuildWithdrawalQuery()
        {
            return _context.WithdrawalRequests
                .AsNoTracking()
                .Include(w => w.User);
        }

        private async Task<WithdrawalResponse> BuildResponseAsync(int withdrawalRequestId)
        {
            var workflowPolicy = await _workflowPolicyService.GetActivePolicyAsync();
            var withdrawalRequest = await BuildWithdrawalQuery()
                .Where(w => w.WithdrawalRequestId == withdrawalRequestId)
                .FirstAsync();

            return MapWithdrawalResponse(withdrawalRequest, workflowPolicy);
        }

        private static WithdrawalResponse MapWithdrawalResponse(WithdrawalRequest w, MarketplaceWorkflowPolicyResponse policy)
        {
            var approvalDeadlineAt = w.Status == WithdrawalStatusPending
                ? w.CreatedAt.AddHours(policy.WithdrawalApprovalWindowHours)
                : (DateTime?)null;
            var payoutSyncWarningAt = w.Status == WithdrawalStatusProcessing && w.PayoutRequestedAt.HasValue
                ? w.PayoutRequestedAt.Value.AddHours(policy.WithdrawalPayoutSyncWarningHours)
                : (DateTime?)null;

            return new WithdrawalResponse
            {
                WithdrawalRequestId = w.WithdrawalRequestId,
                UserId = w.UserId,
                UserFullName = w.User == null ? string.Empty : w.User.FullName,
                UserEmail = w.User == null ? string.Empty : w.User.Email,
                Amount = w.Amount,
                FeeAmount = w.FeeAmount,
                NetAmount = w.NetAmount,
                BankCode = w.BankCode,
                BankBin = w.BankBin,
                BankName = w.BankName,
                BankAccountNumber = w.BankAccountNumber,
                BankAccountHolder = w.BankAccountHolder,
                BankVerificationStatus = w.BankVerificationStatus,
                BankVerificationMessage = w.BankVerificationMessage,
                PayoutReferenceCode = w.PayoutReferenceCode,
                PayoutProvider = w.PayoutProvider,
                PayOsPayoutId = w.PayOsPayoutId,
                PayOsTransactionId = w.PayOsTransactionId,
                PayOsReferenceId = w.PayOsReferenceId,
                PayOsApprovalState = w.PayOsApprovalState,
                PayOsTransactionState = w.PayOsTransactionState,
                PayoutRequestedAt = w.PayoutRequestedAt,
                PayoutConfirmedAt = w.PayoutConfirmedAt,
                FailureReason = w.FailureReason,
                Status = w.Status,
                ApprovalDeadlineAt = approvalDeadlineAt,
                IsApprovalExpired = approvalDeadlineAt.HasValue && approvalDeadlineAt.Value <= VietnamDateTime.Now,
                PayoutSyncWarningAt = payoutSyncWarningAt,
                IsPayoutSyncOverdue = payoutSyncWarningAt.HasValue && payoutSyncWarningAt.Value <= VietnamDateTime.Now,
                AdminNote = w.AdminNote,
                CreatedAt = w.CreatedAt,
                ProcessedAt = w.ProcessedAt,
                ProcessedByAdminId = w.ProcessedByAdminId
            };
        }
    }
}
