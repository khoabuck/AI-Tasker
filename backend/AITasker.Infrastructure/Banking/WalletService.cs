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
                wallet = new Wallet 
                { 
                    UserId = userId, 
                    AvailableBalance = 0m, 
                    LockedBalance = 0m, 
                    UpdatedAt = DateTime.UtcNow 
                };
                _context.Wallets.Add(wallet);
                await _context.SaveChangesAsync();
            }
            return wallet;
        }

        public async Task<decimal> GetBalanceAsync(int userId)
        {
            var wallet = await GetOrCreateWalletAsync(userId);
            return wallet.AvailableBalance; 
        }

        public async Task<bool> DepositAsync(int userId, decimal amount, string description, string referenceId)
        {
            if (amount <= 0) return false;

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var wallet = await GetOrCreateWalletAsync(userId);
                wallet.AvailableBalance += amount;
                wallet.UpdatedAt = DateTime.UtcNow;

                var txn = new Transaction
                {
                    UserId = userId,
                    Amount = amount,
                    Type = "Deposit",
                    Description = description,
                    ReferenceId = referenceId
                };

                _context.Transactions.Add(txn);
                await _context.SaveChangesAsync();
                
                await transaction.CommitAsync();
                return true;
            }
            catch
            {
                await transaction.RollbackAsync();  
                return false;
            }
        }

        public async Task<bool> WithdrawAsync(int userId, decimal amount, string description)
        {
            if (amount <= 0) return false;

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var wallet = await GetOrCreateWalletAsync(userId);
                if (wallet.AvailableBalance < amount) return false;

                wallet.AvailableBalance -= amount;
                wallet.UpdatedAt = DateTime.UtcNow;

                var txn = new Transaction
                {
                    UserId = userId,
                    Amount = -amount,
                    Type = "Withdraw",
                    Description = description,
                    ReferenceId = "INTERNAL"
                };

                _context.Transactions.Add(txn);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                return false;
            }
        }

        public async Task<bool> HoldEscrowAsync(int clientId, decimal amount, string referenceJobId)
        {
            if (amount <= 0) return false;

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var wallet = await GetOrCreateWalletAsync(clientId);
                if (wallet.AvailableBalance < amount) return false;

                wallet.AvailableBalance -= amount;
                wallet.LockedBalance += amount;
                wallet.UpdatedAt = DateTime.UtcNow;

                var txn = new Transaction
                {
                    UserId = clientId,
                    Amount = -amount,
                    Type = "EscrowHold",
                    Description = $"[Escrow Hold] Locked funds for Job ID {referenceJobId}",
                    ReferenceId = referenceJobId
                };

                _context.Transactions.Add(txn);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                return false;
            }
        }

        public async Task<bool> ReleaseEscrowAsync(string referenceJobId, int expertId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var holdTxn = await _context.Transactions
                    .FirstOrDefaultAsync(t => t.ReferenceId == referenceJobId && t.Type == "EscrowHold");

                if (holdTxn == null) return false;

                int clientId = holdTxn.UserId;
                decimal escrowAmount = Math.Abs(holdTxn.Amount);

                var clientWallet = await GetOrCreateWalletAsync(clientId);
                var expertWallet = await GetOrCreateWalletAsync(expertId);

                if (clientWallet.LockedBalance < escrowAmount) return false;

                clientWallet.LockedBalance -= escrowAmount;
                expertWallet.AvailableBalance += escrowAmount;

                clientWallet.UpdatedAt = DateTime.UtcNow;
                expertWallet.UpdatedAt = DateTime.UtcNow;

                holdTxn.Type = "EscrowReleased";

                var expertTxn = new Transaction
                {
                    UserId = expertId,
                    Amount = escrowAmount,
                    Type = "EscrowReceived",
                    Description = $"[Escrow Release] Received funds from Job ID {referenceJobId}",
                    ReferenceId = referenceJobId
                };

                _context.Transactions.Add(expertTxn);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                return false;
            }
        }

        public async Task<Wallet> GetWalletByUserIdAsync(int userId)
        {
            return await GetOrCreateWalletAsync(userId);
        }
    }
}