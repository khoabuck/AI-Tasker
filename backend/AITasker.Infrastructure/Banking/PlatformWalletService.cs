using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Banking
{
    public class PlatformWalletService : IPlatformWalletService
    {
        private const string MainWalletCode = "MAIN";
        private const string TransactionStatusSuccess = "SUCCESS";
        private const string TransactionTypePlatformFee = "PLATFORM_FEE";
        private const string TransactionTypeExpertServiceFee = "EXPERT_SERVICE_FEE";

        private readonly AITaskerDbContext _context;

        public PlatformWalletService(AITaskerDbContext context)
        {
            _context = context;
        }

        public async Task<PlatformWalletResponse> GetPlatformWalletAsync()
        {
            var wallet = await GetOrCreateMainWalletAsync(DateTime.UtcNow);

            await _context.SaveChangesAsync();

            return MapWallet(wallet);
        }

        public async Task<IReadOnlyList<PlatformTransactionResponse>> GetPlatformTransactionsAsync(
            string? type = null,
            int take = 100)
        {
            take = NormalizeTake(take);

            var query = _context.PlatformTransactions
                .AsNoTracking()
                .OrderByDescending(x => x.CreatedAt)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(type))
            {
                var normalizedType = type.Trim().ToUpperInvariant();
                query = query.Where(x => x.Type == normalizedType);
            }

            var transactions = await query
                .Take(take)
                .ToListAsync();

            var contexts = await TransactionDisplayResolver
                .LoadPlatformTransactionContextsAsync(_context, transactions);

            return transactions
                .Select(transaction =>
                {
                    contexts.TryGetValue(
                        transaction.PlatformTransactionId,
                        out var context);

                    return MapTransaction(transaction, context);
                })
                .ToList();
        }

        public async Task RecordPlatformFeeAsync(
            int projectId,
            int contractId,
            int clientUserId,
            decimal amount,
            string referenceId,
            DateTime createdAt)
        {
            if (amount <= 0)
            {
                return;
            }

            if (string.IsNullOrWhiteSpace(referenceId))
            {
                throw new InvalidOperationException("Platform fee reference id is required.");
            }

            var normalizedReferenceId = referenceId.Trim().ToUpperInvariant();

            var alreadyRecorded = await _context.PlatformTransactions.AnyAsync(x =>
                x.Type == TransactionTypePlatformFee &&
                x.Status == TransactionStatusSuccess &&
                x.ReferenceId == normalizedReferenceId);

            if (alreadyRecorded)
            {
                return;
            }

            var wallet = await GetOrCreateMainWalletAsync(createdAt);

            wallet.AvailableBalance += amount;
            wallet.TotalRevenue += amount;
            wallet.PlatformFeeRevenue += amount;
            wallet.UpdatedAt = createdAt;

            _context.PlatformTransactions.Add(new PlatformTransaction
            {
                PlatformWallet = wallet,
                ProjectId = projectId,
                ContractId = contractId,
                WithdrawalRequestId = null,
                UserId = clientUserId,
                Type = TransactionTypePlatformFee,
                Amount = amount,
                Status = TransactionStatusSuccess,
                Description = $"[Platform Fee] Collected platform fee for Project ID {projectId}",
                ReferenceId = normalizedReferenceId,
                CreatedAt = createdAt
            });
        }


        public async Task RecordExpertServiceFeeAsync(
            int projectId,
            int contractId,
            int expertUserId,
            decimal amount,
            string referenceId,
            DateTime createdAt)
        {
            if (amount <= 0)
            {
                return;
            }

            if (string.IsNullOrWhiteSpace(referenceId))
            {
                throw new InvalidOperationException("Expert service fee reference id is required.");
            }

            var normalizedReferenceId = referenceId.Trim().ToUpperInvariant();

            var alreadyRecorded = await _context.PlatformTransactions.AnyAsync(x =>
                x.Type == TransactionTypeExpertServiceFee &&
                x.Status == TransactionStatusSuccess &&
                x.ReferenceId == normalizedReferenceId);

            if (alreadyRecorded)
            {
                return;
            }

            var wallet = await GetOrCreateMainWalletAsync(createdAt);

            wallet.AvailableBalance += amount;
            wallet.TotalRevenue += amount;
            wallet.PlatformFeeRevenue += amount;
            wallet.UpdatedAt = createdAt;

            _context.PlatformTransactions.Add(new PlatformTransaction
            {
                PlatformWallet = wallet,
                ProjectId = projectId,
                ContractId = contractId,
                WithdrawalRequestId = null,
                UserId = expertUserId,
                Type = TransactionTypeExpertServiceFee,
                Amount = amount,
                Status = TransactionStatusSuccess,
                Description = $"[Expert Service Fee] Collected expert service fee for Project ID {projectId}",
                ReferenceId = normalizedReferenceId,
                CreatedAt = createdAt
            });
        }

        private async Task<PlatformWallet> GetOrCreateMainWalletAsync(DateTime now)
        {
            var wallet = await _context.PlatformWallets
                .FirstOrDefaultAsync(x => x.WalletCode == MainWalletCode);

            if (wallet != null)
            {
                return wallet;
            }

            wallet = new PlatformWallet
            {
                WalletCode = MainWalletCode,
                AvailableBalance = 0,
                TotalRevenue = 0,
                PlatformFeeRevenue = 0,
                WithdrawalFeeRevenue = 0,
                AdjustmentBalance = 0,
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.PlatformWallets.Add(wallet);

            return wallet;
        }

        private static int NormalizeTake(int take)
        {
            if (take <= 0)
            {
                return 100;
            }

            return Math.Min(take, 500);
        }

        private static PlatformWalletResponse MapWallet(PlatformWallet wallet)
        {
            return new PlatformWalletResponse
            {
                PlatformWalletId = wallet.PlatformWalletId,
                WalletCode = wallet.WalletCode,
                AvailableBalance = wallet.AvailableBalance,
                TotalRevenue = wallet.TotalRevenue,
                PlatformFeeRevenue = wallet.PlatformFeeRevenue,
                WithdrawalFeeRevenue = wallet.WithdrawalFeeRevenue,
                AdjustmentBalance = wallet.AdjustmentBalance,
                CreatedAt = wallet.CreatedAt,
                UpdatedAt = wallet.UpdatedAt
            };
        }

        private static PlatformTransactionResponse MapTransaction(
            PlatformTransaction transaction,
            TransactionDisplayContext? context)
        {
            var display = TransactionDisplayResolver.Resolve(
                transaction.Type,
                transaction.Status,
                transaction.Description,
                transaction.ReferenceId,
                context);

            return new PlatformTransactionResponse
            {
                PlatformTransactionId = transaction.PlatformTransactionId,
                PlatformWalletId = transaction.PlatformWalletId,
                ProjectId = transaction.ProjectId,
                ProjectTitle = context?.ProjectTitle,
                ContractId = transaction.ContractId ?? context?.ContractId,
                ContractTitle = context?.ContractTitle,
                ProposalId = context?.ProposalId,
                ProposalTitle = context?.ProposalTitle,
                JobId = context?.JobId,
                JobTitle = context?.JobTitle,
                WithdrawalRequestId = transaction.WithdrawalRequestId,
                UserId = transaction.UserId,
                Type = transaction.Type,
                Amount = transaction.Amount,
                Status = transaction.Status,
                Description = transaction.Description,
                DisplayTitle = display.DisplayTitle,
                DisplaySubtitle = display.DisplaySubtitle,
                DisplayDescription = display.DisplayDescription,
                ReferenceType = display.ReferenceType,
                ReferenceDisplayName = display.ReferenceDisplayName,
                ReferenceId = transaction.ReferenceId,
                CreatedAt = transaction.CreatedAt
            };
        }
    }
}