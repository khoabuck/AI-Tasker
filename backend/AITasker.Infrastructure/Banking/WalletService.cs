using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;

namespace AITasker.Infrastructure.Banking
{
    public class WalletService : IWalletService
    {
        private readonly AITaskerDbContext _context;

        public WalletService(AITaskerDbContext context)
        {
            _context = context;
        }

        private async Task<Wallet> GetOrCreateWalletAsync(int userId)
        {
            var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);
            if (wallet == null)
            {
                wallet = new Wallet { UserId = userId, Balance = 0m, UpdatedAt = DateTime.UtcNow };
                _context.Wallets.Add(wallet);
                await _context.SaveChangesAsync();
            }
            return wallet;
        }

        public async Task<decimal> GetBalanceAsync(int userId)
        {
            var wallet = await GetOrCreateWalletAsync(userId);
            return wallet.Balance;
        }

        public async Task<bool> DepositAsync(int userId, decimal amount, string description, string referenceId)
        {
            if (amount <= 0) return false;

            var wallet = await GetOrCreateWalletAsync(userId);
            wallet.Balance += amount;
            wallet.UpdatedAt = DateTime.UtcNow;

            var transaction = new Transaction
            {
                UserId = userId,
                Amount = amount,
                Type = "Deposit",
                Description = description,
                ReferenceId = referenceId
            };

            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> WithdrawAsync(int userId, decimal amount, string description)
        {
            var wallet = await GetOrCreateWalletAsync(userId);
            if (amount <= 0 || wallet.Balance < amount) return false;

            wallet.Balance -= amount;
            wallet.UpdatedAt = DateTime.UtcNow;

            var transaction = new Transaction
            {
                UserId = userId,
                Amount = -amount,
                Type = "Withdraw",
                Description = description,
                ReferenceId = "INTERNAL"
            };

            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> HoldEscrowAsync(int clientId, decimal amount, string referenceJobId)
        {
            var success = await WithdrawAsync(clientId, amount, $"[Escrow Hold] Giam tien coc cho Job {referenceJobId}");
            if (success)
            {
                var txn = await _context.Transactions
                    .FirstOrDefaultAsync(t => t.UserId == clientId && t.Type == "Withdraw" && t.Description.Contains(referenceJobId));
                if (txn != null)
                {
                    txn.Type = "EscrowHold";
                    txn.ReferenceId = referenceJobId;
                    await _context.SaveChangesAsync();
                }
                return true;
            }
            return false;
        }

        public async Task<bool> ReleaseEscrowAsync(string referenceJobId, int expertId)
        {
            var holdTxn = await _context.Transactions
                .FirstOrDefaultAsync(t => t.ReferenceId == referenceJobId && t.Type == "EscrowHold");

            if (holdTxn == null) return false;

            decimal escrowAmount = Math.Abs(holdTxn.Amount);

            var success = await DepositAsync(expertId, escrowAmount, $"[Escrow Release] Giai ngan du an {referenceJobId} thanh cong", referenceJobId);
            if (success)
            {
                holdTxn.Type = "EscrowReleased";
                await _context.SaveChangesAsync();
                return true;
            }
            return false;
        }
    }
}