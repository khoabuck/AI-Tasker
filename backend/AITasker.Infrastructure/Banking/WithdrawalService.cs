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
        private readonly AITaskerDbContext _context;

        public WithdrawalService(AITaskerDbContext context)
        {
            _context = context;
        }

        public async Task<WithdrawalResponse> CreateWithdrawalRequestAsync(
            int userId,
            CreateWithdrawalRequest request)
        {
            if (request.Amount <= 0)
                throw new InvalidOperationException("Withdrawal amount must be greater than 0.");

            if (string.IsNullOrWhiteSpace(request.BankName))
                throw new InvalidOperationException("Bank name is required.");

            if (string.IsNullOrWhiteSpace(request.BankAccountNumber))
                throw new InvalidOperationException("Bank account number is required.");

            if (string.IsNullOrWhiteSpace(request.BankAccountHolder))
                throw new InvalidOperationException("Bank account holder is required.");

            var userExists = await _context.Users.AnyAsync(u => u.UserId == userId);

            if (!userExists)
                throw new InvalidOperationException("User not found.");

            var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);

            if (wallet == null || wallet.AvailableBalance < request.Amount)
                throw new InvalidOperationException("Insufficient available balance.");

            var hasPendingRequest = await _context.WithdrawalRequests.AnyAsync(w =>
                w.UserId == userId &&
                w.Status == "PENDING");

            if (hasPendingRequest)
                throw new InvalidOperationException("You already have a pending withdrawal request.");

            var withdrawalRequest = new WithdrawalRequest
            {
                UserId = userId,
                Amount = request.Amount,
                BankName = request.BankName.Trim(),
                BankAccountNumber = request.BankAccountNumber.Trim(),
                BankAccountHolder = request.BankAccountHolder.Trim(),
                Status = "PENDING",
                CreatedAt = DateTime.UtcNow
            };

            _context.WithdrawalRequests.Add(withdrawalRequest);
            await _context.SaveChangesAsync();

            return await BuildResponseAsync(withdrawalRequest.WithdrawalRequestId);
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
                    BankName = w.BankName,
                    BankAccountNumber = w.BankAccountNumber,
                    BankAccountHolder = w.BankAccountHolder,
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
                    BankName = w.BankName,
                    BankAccountNumber = w.BankAccountNumber,
                    BankAccountHolder = w.BankAccountHolder,
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

                if (withdrawalRequest.Status != "PENDING")
                    throw new InvalidOperationException("Only pending withdrawal requests can be approved.");

                var wallet = await _context.Wallets
                    .FirstOrDefaultAsync(w => w.UserId == withdrawalRequest.UserId);

                if (wallet == null || wallet.AvailableBalance < withdrawalRequest.Amount)
                    throw new InvalidOperationException("Insufficient available balance.");

                wallet.AvailableBalance -= withdrawalRequest.Amount;
                wallet.UpdatedAt = DateTime.UtcNow;

                withdrawalRequest.Status = "APPROVED";
                withdrawalRequest.AdminNote = string.IsNullOrWhiteSpace(request.AdminNote)
                    ? null
                    : request.AdminNote.Trim();
                withdrawalRequest.ProcessedAt = DateTime.UtcNow;
                withdrawalRequest.ProcessedByAdminId = adminId;

                var transaction = new Transaction
                {
                    UserId = withdrawalRequest.UserId,
                    ProjectId = null,
                    MilestoneId = null,
                    Amount = -withdrawalRequest.Amount,
                    Type = "Withdraw",
                    Status = "SUCCESS",
                    Description = $"[Withdrawal Approved] Bank: {withdrawalRequest.BankName}, Account: {withdrawalRequest.BankAccountNumber}",
                    ReferenceId = withdrawalRequest.WithdrawalRequestId.ToString(),
                    CreatedAt = DateTime.UtcNow
                };

                _context.Transactions.Add(transaction);
                await _context.SaveChangesAsync();

                await dbTransaction.CommitAsync();

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

            if (withdrawalRequest.Status != "PENDING")
                throw new InvalidOperationException("Only pending withdrawal requests can be rejected.");

            withdrawalRequest.Status = "REJECTED";
            withdrawalRequest.AdminNote = string.IsNullOrWhiteSpace(request.AdminNote)
                ? null
                : request.AdminNote.Trim();
            withdrawalRequest.ProcessedAt = DateTime.UtcNow;
            withdrawalRequest.ProcessedByAdminId = adminId;

            await _context.SaveChangesAsync();

            return await BuildResponseAsync(withdrawalRequestId);
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
                    BankName = w.BankName,
                    BankAccountNumber = w.BankAccountNumber,
                    BankAccountHolder = w.BankAccountHolder,
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