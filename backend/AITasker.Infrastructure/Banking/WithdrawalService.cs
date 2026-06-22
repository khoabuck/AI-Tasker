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
        private const decimal MinimumWithdrawalAmount = 1000m;
        private const decimal WithdrawalFeeRate = 0.10m;

        private const string WithdrawalStatusPaidSimulated = "PAID_SIMULATED";
        private const string WithdrawalStatusFailed = "FAILED";
        private const string WithdrawalStatusPending = "PENDING";
        private const string WithdrawalStatusApproved = "APPROVED";
        private const string WithdrawalStatusRejected = "REJECTED";

        private const string BankVerificationStatusVerified = "VERIFIED";
        private const string BankVerificationStatusFailed = "FAILED";

        private const string TransactionStatusSuccess = "SUCCESS";
        private const string TransactionStatusFailed = "FAILED";

        private const string TransactionTypeWithdrawalSimulated = "WITHDRAWAL_SIMULATED";
        private const string TransactionTypeWithdrawalFee = "WITHDRAWAL_FEE";

        private readonly AITaskerDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly IBankAccountVerificationService _bankAccountVerificationService;

        public WithdrawalService(
            AITaskerDbContext context,
            INotificationService notificationService,
            IBankAccountVerificationService bankAccountVerificationService)
        {
            _context = context;
            _notificationService = notificationService;
            _bankAccountVerificationService = bankAccountVerificationService;
        }

        public async Task<WithdrawalResponse> CreateWithdrawalRequestAsync(
            int userId,
            CreateWithdrawalRequest request)
        {
            ValidateCreateWithdrawalRequest(request);

            await using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var userExists = await _context.Users.AnyAsync(u => u.UserId == userId);

                if (!userExists)
                    throw new InvalidOperationException("User not found.");

                var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);

                if (wallet == null)
                    throw new InvalidOperationException("Wallet not found.");

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
                        Type = TransactionTypeWithdrawalSimulated,
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
                    throw new InvalidOperationException("Insufficient available balance.");

                var feeAmount = CalculateWithdrawalFee(request.Amount);
                var netAmount = request.Amount - feeAmount;

                if (netAmount <= 0)
                    throw new InvalidOperationException("Net withdrawal amount must be greater than 0.");

                wallet.AvailableBalance -= request.Amount;
                wallet.UpdatedAt = now;

                var payoutReference = $"SIM-WD-{now:yyyyMMddHHmmss}-{userId}";

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
                    PayoutReferenceCode = payoutReference,
                    Status = WithdrawalStatusPaidSimulated,
                    AdminNote = "Withdrawal paid in simulated mode. No real bank transfer was executed.",
                    CreatedAt = now,
                    ProcessedAt = now,
                    ProcessedByAdminId = null
                };

                _context.WithdrawalRequests.Add(withdrawalRequest);

                _context.Transactions.Add(new Transaction
                {
                    UserId = userId,
                    ProjectId = null,
                    MilestoneId = null,
                    EscrowId = null,
                    Amount = -netAmount,
                    Type = TransactionTypeWithdrawalSimulated,
                    Status = TransactionStatusSuccess,
                    Description = $"[Withdrawal Simulated] Bank: {withdrawalRequest.BankCode} - {withdrawalRequest.BankName}, Account: {withdrawalRequest.BankAccountNumber}, Net amount: {netAmount:N0}",
                    ReferenceId = payoutReference,
                    CreatedAt = now
                });

                if (feeAmount > 0)
                {
                    _context.Transactions.Add(new Transaction
                    {
                        UserId = userId,
                        ProjectId = null,
                        MilestoneId = null,
                        EscrowId = null,
                        Amount = -feeAmount,
                        Type = TransactionTypeWithdrawalFee,
                        Status = TransactionStatusSuccess,
                        Description = $"[Withdrawal Fee] Fee 10% for simulated withdrawal {payoutReference}",
                        ReferenceId = payoutReference,
                        CreatedAt = now
                    });
                }

                await _context.SaveChangesAsync();
                await dbTransaction.CommitAsync();

                await _notificationService.CreateNotificationAsync(
                    userId,
                    "Withdrawal paid simulated",
                    $"Your withdrawal of {request.Amount:N0} VND was processed in simulated mode. Fee: {feeAmount:N0} VND. Net amount: {netAmount:N0} VND.",
                    "WITHDRAWAL_PAID_SIMULATED");

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
            await using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var withdrawalRequest = await _context.WithdrawalRequests
                    .FirstOrDefaultAsync(w => w.WithdrawalRequestId == withdrawalRequestId);

                if (withdrawalRequest == null)
                    throw new InvalidOperationException("Withdrawal request not found.");

                if (withdrawalRequest.Status != WithdrawalStatusPending)
                    throw new InvalidOperationException("Only pending withdrawal requests can be approved.");

                var wallet = await _context.Wallets
                    .FirstOrDefaultAsync(w => w.UserId == withdrawalRequest.UserId);

                if (wallet == null || wallet.AvailableBalance < withdrawalRequest.Amount)
                    throw new InvalidOperationException("Insufficient available balance.");

                var now = DateTime.UtcNow;

                wallet.AvailableBalance -= withdrawalRequest.Amount;
                wallet.UpdatedAt = now;

                withdrawalRequest.Status = WithdrawalStatusApproved;
                withdrawalRequest.AdminNote = string.IsNullOrWhiteSpace(request.AdminNote)
                    ? null
                    : request.AdminNote.Trim();
                withdrawalRequest.ProcessedAt = now;
                withdrawalRequest.ProcessedByAdminId = adminId;

                var transaction = new Transaction
                {
                    UserId = withdrawalRequest.UserId,
                    ProjectId = null,
                    MilestoneId = null,
                    EscrowId = null,
                    Amount = -withdrawalRequest.Amount,
                    Type = "Withdraw",
                    Status = TransactionStatusSuccess,
                    Description = $"[Withdrawal Approved] Bank: {withdrawalRequest.BankName}, Account: {withdrawalRequest.BankAccountNumber}",
                    ReferenceId = withdrawalRequest.WithdrawalRequestId.ToString(),
                    CreatedAt = now
                };

                _context.Transactions.Add(transaction);
                await _context.SaveChangesAsync();

                await dbTransaction.CommitAsync();

                await _notificationService.CreateNotificationAsync(
                    withdrawalRequest.UserId,
                    "Withdrawal approved",
                    $"Your withdrawal request of {withdrawalRequest.Amount:N0} VND has been approved.",
                    "WITHDRAWAL_APPROVED");

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
            var withdrawalRequest = await _context.WithdrawalRequests
                .FirstOrDefaultAsync(w => w.WithdrawalRequestId == withdrawalRequestId);

            if (withdrawalRequest == null)
                throw new InvalidOperationException("Withdrawal request not found.");

            if (withdrawalRequest.Status != WithdrawalStatusPending)
                throw new InvalidOperationException("Only pending withdrawal requests can be rejected.");

            withdrawalRequest.Status = WithdrawalStatusRejected;
            withdrawalRequest.AdminNote = string.IsNullOrWhiteSpace(request.AdminNote)
                ? null
                : request.AdminNote.Trim();
            withdrawalRequest.ProcessedAt = DateTime.UtcNow;
            withdrawalRequest.ProcessedByAdminId = adminId;

            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                withdrawalRequest.UserId,
                "Withdrawal rejected",
                string.IsNullOrWhiteSpace(withdrawalRequest.AdminNote)
                    ? $"Your withdrawal request of {withdrawalRequest.Amount:N0} VND has been rejected."
                    : $"Your withdrawal request of {withdrawalRequest.Amount:N0} VND has been rejected. Reason: {withdrawalRequest.AdminNote}",
                "WITHDRAWAL_REJECTED");

            return await BuildResponseAsync(withdrawalRequestId);
        }

        private static void ValidateCreateWithdrawalRequest(CreateWithdrawalRequest request)
        {
            if (request == null)
                throw new InvalidOperationException("Withdrawal request is required.");

            if (request.Amount < MinimumWithdrawalAmount)
                throw new InvalidOperationException($"Minimum withdrawal amount is {MinimumWithdrawalAmount:N0} VND.");

            if (string.IsNullOrWhiteSpace(request.BankCode))
                throw new InvalidOperationException("Bank code is required.");

            if (string.IsNullOrWhiteSpace(request.BankName))
                throw new InvalidOperationException("Bank name is required.");

            if (string.IsNullOrWhiteSpace(request.BankAccountNumber))
                throw new InvalidOperationException("Bank account number is required.");

            if (string.IsNullOrWhiteSpace(request.BankAccountHolder))
                throw new InvalidOperationException("Bank account holder is required.");
        }

        private static decimal CalculateWithdrawalFee(decimal amount)
        {
            return Math.Round(amount * WithdrawalFeeRate, 0, MidpointRounding.AwayFromZero);
        }

        private static string NormalizeBankCode(string? bankCode)
        {
            return string.IsNullOrWhiteSpace(bankCode)
                ? string.Empty
                : bankCode.Trim().ToUpperInvariant();
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