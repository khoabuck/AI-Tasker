using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Banking
{
    public class WithdrawalService : IWithdrawalService
    {
        private const string WithdrawalStatusFailed = "FAILED";
        private const string WithdrawalStatusPending = "PENDING";
        private const string WithdrawalStatusPaid = "PAID";
        private const string WithdrawalStatusRejected = "REJECTED";

        private const string BankVerificationStatusVerified = "VERIFIED";
        private const string BankVerificationStatusFailed = "FAILED";

        private const string TransactionStatusSuccess = "SUCCESS";
        private const string TransactionStatusFailed = "FAILED";

        private const string TransactionTypeWithdrawalFailed = "WITHDRAWAL_FAILED";
        private const string TransactionTypeWithdrawalHold = "WITHDRAWAL_HOLD";
        private const string TransactionTypeWithdrawalPaid = "WITHDRAWAL_PAID";
        private const string TransactionTypeWithdrawalFee = "WITHDRAWAL_FEE";
        private const string TransactionTypeWithdrawalRejected = "WITHDRAWAL_REJECTED";

        private const string PlatformWalletCodeMain = "MAIN";
        private const string PlatformTransactionTypeWithdrawalFee = "WITHDRAWAL_FEE";

        private readonly AITaskerDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly IBankAccountVerificationService _bankAccountVerificationService;
        private readonly IMarketplaceWorkflowPolicyService _workflowPolicyService;

        public WithdrawalService(
            AITaskerDbContext context,
            INotificationService notificationService,
            IBankAccountVerificationService bankAccountVerificationService,
            IMarketplaceWorkflowPolicyService workflowPolicyService)
        {
            _context = context;
            _notificationService = notificationService;
            _bankAccountVerificationService = bankAccountVerificationService;
            _workflowPolicyService = workflowPolicyService;
        }

        public async Task<WithdrawalResponse> CreateWithdrawalRequestAsync(
            int userId,
            CreateWithdrawalRequest request)
        {
            var workflowPolicy = await _workflowPolicyService.GetActivePolicyAsync();

            ValidateCreateWithdrawalRequest(
                request,
                workflowPolicy.MinimumWithdrawalAmount);

            await using var dbTransaction = await _context.Database.BeginTransactionAsync();

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

                var now = DateTime.UtcNow;

                var bankVerification = await _bankAccountVerificationService.VerifyAsync(
                    new BankAccountVerificationRequest
                    {
                        BankCode = request.BankCode,
                        BankBin = request.BankBin,
                        BankName = request.BankName,
                        BankAccountNumber = request.BankAccountNumber,
                        BankAccountHolder = request.BankAccountHolder
                    });

                if (!bankVerification.IsValid)
                {
                    var failedWithdrawal = new WithdrawalRequest
                    {
                        UserId = userId,
                        Amount = request.Amount,
                        FeeAmount = 0,
                        NetAmount = 0,
                        BankCode = NormalizeBankCode(request.BankCode),
                        BankName = request.BankName.Trim(),
                        BankAccountNumber = request.BankAccountNumber.Trim(),
                        BankAccountHolder = request.BankAccountHolder.Trim(),
                        BankVerificationStatus = BankVerificationStatusFailed,
                        BankVerificationMessage = bankVerification.Message,
                        PayoutReferenceCode = null,
                        Status = WithdrawalStatusFailed,
                        AdminNote = bankVerification.Message,
                        CreatedAt = now,
                        ProcessedAt = now,
                        ProcessedByAdminId = null
                    };

                    _context.WithdrawalRequests.Add(failedWithdrawal);

                    _context.Transactions.Add(new Transaction
                    {
                        UserId = userId,
                        ProjectId = null,
                        MilestoneId = null,
                        EscrowId = null,
                        Amount = 0,
                        Type = TransactionTypeWithdrawalFailed,
                        Status = TransactionStatusFailed,
                        Description = $"[Withdrawal Failed] Bank verification failed. Reason: {bankVerification.Message}",
                        ReferenceId = null,
                        CreatedAt = now
                    });

                    await _context.SaveChangesAsync();
                    await dbTransaction.CommitAsync();

                    await _notificationService.CreateNotificationAsync(
                        userId,
                        "Withdrawal failed",
                        $"Your withdrawal request failed because bank account verification failed. Reason: {bankVerification.Message}",
                        "WITHDRAWAL_FAILED");

                    return await BuildResponseAsync(failedWithdrawal.WithdrawalRequestId);
                }

                if (wallet.AvailableBalance < request.Amount)
                {
                    throw new InvalidOperationException("Insufficient available balance.");
                }

                var feeAmount = CalculateWithdrawalFee(
                    request.Amount,
                    workflowPolicy.WithdrawalFeeRate);
                var netAmount = request.Amount - feeAmount;

                if (netAmount <= 0)
                {
                    throw new InvalidOperationException("Net withdrawal amount must be greater than 0.");
                }

                wallet.AvailableBalance -= request.Amount;
                wallet.LockedBalance += request.Amount;
                wallet.UpdatedAt = now;

                var withdrawalRequest = new WithdrawalRequest
                {
                    UserId = userId,
                    Amount = request.Amount,
                    FeeAmount = feeAmount,
                    NetAmount = netAmount,
                    BankCode = NormalizeBankCode(request.BankCode),
                    BankName = request.BankName.Trim(),
                    BankAccountNumber = request.BankAccountNumber.Trim(),
                    BankAccountHolder = request.BankAccountHolder.Trim(),
                    BankVerificationStatus = BankVerificationStatusVerified,
                    BankVerificationMessage = bankVerification.Message,
                    PayoutReferenceCode = null,
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
                    Description = $"[Withdrawal Hold] Held {request.Amount:N0} VND for Withdrawal Request ID {withdrawalRequest.WithdrawalRequestId}. Net payout: {netAmount:N0} VND. Fee: {feeAmount:N0} VND.",
                    ReferenceId = referenceId,
                    CreatedAt = now
                });

                await _context.SaveChangesAsync();
                await dbTransaction.CommitAsync();

                await _notificationService.CreateNotificationAsync(
                    userId,
                    "Withdrawal request submitted",
                    $"Your withdrawal request of {request.Amount:N0} VND has been submitted. Net payout: {netAmount:N0} VND. Fee: {feeAmount:N0} VND. The amount is held until admin completes the bank transfer.",
                    "WITHDRAWAL_REQUESTED");

                return await BuildResponseAsync(withdrawalRequest.WithdrawalRequestId);
            }
            catch
            {
                await dbTransaction.RollbackAsync();
                throw;
            }
        }

        public async Task<IReadOnlyList<WithdrawalResponse>> GetMyWithdrawalRequestsAsync(int userId)
        {
            return await _context.WithdrawalRequests
                .AsNoTracking()
                .Where(w => w.UserId == userId)
                .OrderByDescending(w => w.CreatedAt)
                .Select(w => new WithdrawalResponse
                {
                    WithdrawalRequestId = w.WithdrawalRequestId,
                    UserId = w.UserId,
                    UserFullName = w.User.FullName,
                    UserEmail = w.User.Email,
                    Amount = w.Amount,
                    FeeAmount = w.FeeAmount,
                    NetAmount = w.NetAmount,
                    BankCode = w.BankCode,
                    BankName = w.BankName,
                    BankAccountNumber = w.BankAccountNumber,
                    BankAccountHolder = w.BankAccountHolder,
                    BankVerificationStatus = w.BankVerificationStatus,
                    BankVerificationMessage = w.BankVerificationMessage,
                    PayoutReferenceCode = w.PayoutReferenceCode,
                    Status = w.Status,
                    AdminNote = w.AdminNote,
                    CreatedAt = w.CreatedAt,
                    ProcessedAt = w.ProcessedAt,
                    ProcessedByAdminId = w.ProcessedByAdminId
                })
                .ToListAsync();
        }

        public async Task<IReadOnlyList<WithdrawalResponse>> GetAllWithdrawalRequestsAsync(string? status)
        {
            var query = _context.WithdrawalRequests
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
            {
                var normalizedStatus = status.Trim().ToUpperInvariant();
                query = query.Where(w => w.Status == normalizedStatus);
            }

            return await query
                .OrderByDescending(w => w.CreatedAt)
                .Select(w => new WithdrawalResponse
                {
                    WithdrawalRequestId = w.WithdrawalRequestId,
                    UserId = w.UserId,
                    UserFullName = w.User.FullName,
                    UserEmail = w.User.Email,
                    Amount = w.Amount,
                    FeeAmount = w.FeeAmount,
                    NetAmount = w.NetAmount,
                    BankCode = w.BankCode,
                    BankName = w.BankName,
                    BankAccountNumber = w.BankAccountNumber,
                    BankAccountHolder = w.BankAccountHolder,
                    BankVerificationStatus = w.BankVerificationStatus,
                    BankVerificationMessage = w.BankVerificationMessage,
                    PayoutReferenceCode = w.PayoutReferenceCode,
                    Status = w.Status,
                    AdminNote = w.AdminNote,
                    CreatedAt = w.CreatedAt,
                    ProcessedAt = w.ProcessedAt,
                    ProcessedByAdminId = w.ProcessedByAdminId
                })
                .ToListAsync();
        }

        public async Task<WithdrawalResponse> ApproveWithdrawalAsync(
            int withdrawalRequestId,
            int adminId,
            ProcessWithdrawalRequest request)
        {
            ValidateApproveWithdrawalRequest(request);

            await using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var withdrawalRequest = await _context.WithdrawalRequests
                    .FirstOrDefaultAsync(w => w.WithdrawalRequestId == withdrawalRequestId);

                if (withdrawalRequest == null)
                {
                    throw new InvalidOperationException("Withdrawal request not found.");
                }

                if (withdrawalRequest.Status != WithdrawalStatusPending)
                {
                    throw new InvalidOperationException("Only pending withdrawal requests can be marked as paid.");
                }

                var wallet = await _context.Wallets
                    .FirstOrDefaultAsync(w => w.UserId == withdrawalRequest.UserId);

                if (wallet == null)
                {
                    throw new InvalidOperationException("Wallet not found.");
                }

                if (wallet.LockedBalance < withdrawalRequest.Amount)
                {
                    throw new InvalidOperationException("Held withdrawal balance is insufficient.");
                }

                var now = DateTime.UtcNow;
                var payoutReferenceCode = request.PayoutReferenceCode!.Trim();
                var referenceId = BuildWithdrawalReference(withdrawalRequest.WithdrawalRequestId);

                wallet.LockedBalance -= withdrawalRequest.Amount;
                wallet.UpdatedAt = now;

                withdrawalRequest.Status = WithdrawalStatusPaid;
                withdrawalRequest.PayoutReferenceCode = payoutReferenceCode;
                withdrawalRequest.AdminNote = NormalizeOptionalText(request.AdminNote);
                withdrawalRequest.ProcessedAt = now;
                withdrawalRequest.ProcessedByAdminId = adminId;

                _context.Transactions.Add(new Transaction
                {
                    UserId = withdrawalRequest.UserId,
                    ProjectId = null,
                    MilestoneId = null,
                    EscrowId = null,
                    Amount = -withdrawalRequest.NetAmount,
                    Type = TransactionTypeWithdrawalPaid,
                    Status = TransactionStatusSuccess,
                    Description = $"[Withdrawal Paid] Paid {withdrawalRequest.NetAmount:N0} VND to {withdrawalRequest.BankName} account {withdrawalRequest.BankAccountNumber}.",
                    ReferenceId = payoutReferenceCode,
                    CreatedAt = now
                });

                if (withdrawalRequest.FeeAmount > 0)
                {
                    _context.Transactions.Add(new Transaction
                    {
                        UserId = withdrawalRequest.UserId,
                        ProjectId = null,
                        MilestoneId = null,
                        EscrowId = null,
                        Amount = -withdrawalRequest.FeeAmount,
                        Type = TransactionTypeWithdrawalFee,
                        Status = TransactionStatusSuccess,
                        Description = $"[Withdrawal Fee] Collected {withdrawalRequest.FeeAmount:N0} VND withdrawal fee for Withdrawal Request ID {withdrawalRequest.WithdrawalRequestId}.",
                        ReferenceId = referenceId,
                        CreatedAt = now
                    });

                    await RecordPlatformWithdrawalFeeAsync(
                        withdrawalRequest,
                        referenceId,
                        now);
                }

                await _context.SaveChangesAsync();
                await dbTransaction.CommitAsync();

                await _notificationService.CreateNotificationAsync(
                    withdrawalRequest.UserId,
                    "Withdrawal paid",
                    $"Your withdrawal request of {withdrawalRequest.Amount:N0} VND has been paid. Net payout: {withdrawalRequest.NetAmount:N0} VND. Fee: {withdrawalRequest.FeeAmount:N0} VND.",
                    "WITHDRAWAL_PAID");

                return await BuildResponseAsync(withdrawalRequestId);
            }
            catch
            {
                await dbTransaction.RollbackAsync();
                throw;
            }
        }

        public async Task<WithdrawalResponse> RejectWithdrawalAsync(
            int withdrawalRequestId,
            int adminId,
            ProcessWithdrawalRequest request)
        {
            await using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var withdrawalRequest = await _context.WithdrawalRequests
                    .FirstOrDefaultAsync(w => w.WithdrawalRequestId == withdrawalRequestId);

                if (withdrawalRequest == null)
                {
                    throw new InvalidOperationException("Withdrawal request not found.");
                }

                if (withdrawalRequest.Status != WithdrawalStatusPending)
                {
                    throw new InvalidOperationException("Only pending withdrawal requests can be rejected.");
                }

                var wallet = await _context.Wallets
                    .FirstOrDefaultAsync(w => w.UserId == withdrawalRequest.UserId);

                if (wallet == null)
                {
                    throw new InvalidOperationException("Wallet not found.");
                }

                if (wallet.LockedBalance < withdrawalRequest.Amount)
                {
                    throw new InvalidOperationException("Held withdrawal balance is insufficient.");
                }

                var now = DateTime.UtcNow;
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

                await _notificationService.CreateNotificationAsync(
                    withdrawalRequest.UserId,
                    "Withdrawal rejected",
                    string.IsNullOrWhiteSpace(withdrawalRequest.AdminNote)
                        ? $"Your withdrawal request of {withdrawalRequest.Amount:N0} VND has been rejected. The held amount has been returned to your available balance."
                        : $"Your withdrawal request of {withdrawalRequest.Amount:N0} VND has been rejected. Reason: {withdrawalRequest.AdminNote}. The held amount has been returned to your available balance.",
                    "WITHDRAWAL_REJECTED");

                return await BuildResponseAsync(withdrawalRequestId);
            }
            catch
            {
                await dbTransaction.RollbackAsync();
                throw;
            }
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

            if (string.IsNullOrWhiteSpace(request.BankCode))
            {
                throw new InvalidOperationException("Bank code is required.");
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
                throw new InvalidOperationException("Payout reference code is required after completing the real bank transfer.");
            }
        }

        private static decimal CalculateWithdrawalFee(
            decimal amount,
            decimal withdrawalFeeRate)
        {
            return Math.Round(amount * withdrawalFeeRate, 0, MidpointRounding.AwayFromZero);
        }

        private static string NormalizeBankCode(string? bankCode)
        {
            return string.IsNullOrWhiteSpace(bankCode)
                ? string.Empty
                : bankCode.Trim().ToUpperInvariant();
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

        private async Task RecordPlatformWithdrawalFeeAsync(
            WithdrawalRequest withdrawalRequest,
            string referenceId,
            DateTime now)
        {
            if (withdrawalRequest.FeeAmount <= 0)
            {
                return;
            }

            var alreadyRecorded = await _context.PlatformTransactions.AnyAsync(x =>
                x.Type == PlatformTransactionTypeWithdrawalFee &&
                x.Status == TransactionStatusSuccess &&
                x.ReferenceId == referenceId);

            if (alreadyRecorded)
            {
                return;
            }

            var platformWallet = await GetOrCreateMainPlatformWalletAsync(now);

            platformWallet.AvailableBalance += withdrawalRequest.FeeAmount;
            platformWallet.TotalRevenue += withdrawalRequest.FeeAmount;
            platformWallet.WithdrawalFeeRevenue += withdrawalRequest.FeeAmount;
            platformWallet.UpdatedAt = now;

            _context.PlatformTransactions.Add(new PlatformTransaction
            {
                PlatformWallet = platformWallet,
                ProjectId = null,
                ContractId = null,
                WithdrawalRequestId = withdrawalRequest.WithdrawalRequestId,
                UserId = withdrawalRequest.UserId,
                Type = PlatformTransactionTypeWithdrawalFee,
                Amount = withdrawalRequest.FeeAmount,
                Status = TransactionStatusSuccess,
                Description = $"[Withdrawal Fee] Collected withdrawal fee from Withdrawal Request ID {withdrawalRequest.WithdrawalRequestId}",
                ReferenceId = referenceId,
                CreatedAt = now
            });
        }

        private async Task<PlatformWallet> GetOrCreateMainPlatformWalletAsync(DateTime now)
        {
            var platformWallet = await _context.PlatformWallets
                .FirstOrDefaultAsync(x => x.WalletCode == PlatformWalletCodeMain);

            if (platformWallet != null)
            {
                return platformWallet;
            }

            platformWallet = new PlatformWallet
            {
                WalletCode = PlatformWalletCodeMain,
                AvailableBalance = 0,
                TotalRevenue = 0,
                PlatformFeeRevenue = 0,
                WithdrawalFeeRevenue = 0,
                AdjustmentBalance = 0,
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.PlatformWallets.Add(platformWallet);

            return platformWallet;
        }

        private async Task<WithdrawalResponse> BuildResponseAsync(int withdrawalRequestId)
        {
            return await _context.WithdrawalRequests
                .AsNoTracking()
                .Where(w => w.WithdrawalRequestId == withdrawalRequestId)
                .Select(w => new WithdrawalResponse
                {
                    WithdrawalRequestId = w.WithdrawalRequestId,
                    UserId = w.UserId,
                    UserFullName = w.User.FullName,
                    UserEmail = w.User.Email,
                    Amount = w.Amount,
                    FeeAmount = w.FeeAmount,
                    NetAmount = w.NetAmount,
                    BankCode = w.BankCode,
                    BankName = w.BankName,
                    BankAccountNumber = w.BankAccountNumber,
                    BankAccountHolder = w.BankAccountHolder,
                    BankVerificationStatus = w.BankVerificationStatus,
                    BankVerificationMessage = w.BankVerificationMessage,
                    PayoutReferenceCode = w.PayoutReferenceCode,
                    Status = w.Status,
                    AdminNote = w.AdminNote,
                    CreatedAt = w.CreatedAt,
                    ProcessedAt = w.ProcessedAt,
                    ProcessedByAdminId = w.ProcessedByAdminId
                })
                .FirstAsync();
        }
    }
}
