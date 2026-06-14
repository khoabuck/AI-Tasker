using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

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
                    TotalEarning = 0m,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Wallets.Add(wallet);
                await _context.SaveChangesAsync();
            }

            return wallet;
        }

        public async Task<Wallet> GetWalletByUserIdAsync(int userId)
        {
            return await GetOrCreateWalletAsync(userId);
        }

        public async Task<decimal> GetBalanceAsync(int userId)
        {
            var wallet = await GetOrCreateWalletAsync(userId);
            return wallet.AvailableBalance;
        }

        public async Task<bool> DepositAsync(int userId, decimal amount, string transactionRef)
        {
            return await DepositAsync(
                userId,
                amount,
                $"[Deposit] Wallet deposit with reference {transactionRef}",
                transactionRef
            );
        }

        public async Task<bool> DepositAsync(int userId, decimal amount, string description, string referenceId)
        {
            if (amount <= 0)
                return false;

            var userExists = await _context.Users.AnyAsync(u => u.UserId == userId);
            if (!userExists)
                return false;

            var alreadyExists = await _context.Transactions.AnyAsync(t =>
                t.UserId == userId &&
                t.ReferenceId == referenceId &&
                t.Type == "Deposit" &&
                t.Status == "SUCCESS");

            if (alreadyExists)
                return true;

            await using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var wallet = await GetOrCreateWalletAsync(userId);

                wallet.AvailableBalance += amount;
                wallet.UpdatedAt = DateTime.UtcNow;

                var txn = new Transaction
                {
                    UserId = userId,
                    ProjectId = null,
                    MilestoneId = null,
                    Amount = amount,
                    Type = "Deposit",
                    Status = "SUCCESS",
                    Description = description,
                    ReferenceId = referenceId,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Transactions.Add(txn);
                await _context.SaveChangesAsync();

                await dbTransaction.CommitAsync();
                return true;
            }
            catch
            {
                await dbTransaction.RollbackAsync();
                return false;
            }
        }

        public async Task<bool> WithdrawAsync(int userId, decimal amount, string description)
        {
            if (amount <= 0)
                return false;

            await using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);

                if (wallet == null || wallet.AvailableBalance < amount)
                    return false;

                wallet.AvailableBalance -= amount;
                wallet.UpdatedAt = DateTime.UtcNow;

                var txn = new Transaction
                {
                    UserId = userId,
                    ProjectId = null,
                    MilestoneId = null,
                    Amount = -amount,
                    Type = "Withdraw",
                    Status = "SUCCESS",
                    Description = description,
                    ReferenceId = "INTERNAL",
                    CreatedAt = DateTime.UtcNow
                };

                _context.Transactions.Add(txn);
                await _context.SaveChangesAsync();

                await dbTransaction.CommitAsync();
                return true;
            }
            catch
            {
                await dbTransaction.RollbackAsync();
                return false;
            }
        }

        public async Task<bool> HoldEscrowAsync(int clientId, int milestoneId)
        {
            await using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var milestone = await _context.Milestones
                    .FirstOrDefaultAsync(m => m.MilestoneId == milestoneId);

                if (milestone == null || milestone.Amount <= 0)
                    return false;

                if (milestone.Status != "PENDING" && milestone.Status != "PENDING_ESCROW")
                    return false;

                var project = await _context.Projects
                    .FirstOrDefaultAsync(p => p.ProjectId == milestone.ProjectId);

                if (project == null)
                    return false;

                var contract = await _context.ProjectContracts
                    .FirstOrDefaultAsync(c => c.ContractId == project.ContractId);

                if (contract == null || contract.ClientId != clientId)
                    return false;

                var alreadyHeld = await _context.Transactions.AnyAsync(t =>
                    t.MilestoneId == milestoneId &&
                    t.Type == "EscrowHold" &&
                    t.Status == "SUCCESS");

                if (alreadyHeld)
                    return true;

                var clientWallet = await _context.Wallets
                    .FirstOrDefaultAsync(w => w.UserId == clientId);

                if (clientWallet == null || clientWallet.AvailableBalance < milestone.Amount)
                    return false;

                clientWallet.AvailableBalance -= milestone.Amount;
                clientWallet.LockedBalance += milestone.Amount;
                clientWallet.UpdatedAt = DateTime.UtcNow;

                milestone.Status = "FUNDED";

                var txn = new Transaction
                {
                    UserId = clientId,
                    ProjectId = project.ProjectId,
                    MilestoneId = milestone.MilestoneId,
                    Amount = -milestone.Amount,
                    Type = "EscrowHold",
                    Status = "SUCCESS",
                    Description = $"[Escrow Hold] Locked funds for Milestone ID {milestone.MilestoneId}",
                    ReferenceId = milestone.MilestoneId.ToString(),
                    CreatedAt = DateTime.UtcNow
                };

                _context.Transactions.Add(txn);
                await _context.SaveChangesAsync();

                await dbTransaction.CommitAsync();
                return true;
            }
            catch
            {
                await dbTransaction.RollbackAsync();
                return false;
            }
        }

        public async Task<bool> ReleaseEscrowAsync(int milestoneId)
        {
            await using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var milestone = await _context.Milestones
                    .FirstOrDefaultAsync(m => m.MilestoneId == milestoneId);

                if (milestone == null)
                    return false;

                var project = await _context.Projects
                    .FirstOrDefaultAsync(p => p.ProjectId == milestone.ProjectId);

                if (project == null)
                    return false;

                var contract = await _context.ProjectContracts
                    .FirstOrDefaultAsync(c => c.ContractId == project.ContractId);

                if (contract == null)
                    return false;

                var holdTxn = await _context.Transactions
                    .FirstOrDefaultAsync(t =>
                        t.MilestoneId == milestoneId &&
                        t.Type == "EscrowHold" &&
                        t.Status == "SUCCESS");

                if (holdTxn == null)
                    return false;

                var clientId = holdTxn.UserId;
                var expertId = contract.ExpertId;
                var escrowAmount = Math.Abs(holdTxn.Amount);

                var clientWallet = await _context.Wallets
                    .FirstOrDefaultAsync(w => w.UserId == clientId);

                var expertWallet = await GetOrCreateWalletAsync(expertId);

                if (clientWallet == null || clientWallet.LockedBalance < escrowAmount)
                    return false;

                clientWallet.LockedBalance -= escrowAmount;
                clientWallet.UpdatedAt = DateTime.UtcNow;

                expertWallet.AvailableBalance += escrowAmount;
                expertWallet.TotalEarning += escrowAmount;
                expertWallet.UpdatedAt = DateTime.UtcNow;

                holdTxn.Status = "RELEASED";
                milestone.Status = "RELEASED";

                var releaseTxn = new Transaction
                {
                    UserId = clientId,
                    ProjectId = project.ProjectId,
                    MilestoneId = milestone.MilestoneId,
                    Amount = escrowAmount,
                    Type = "EscrowReleased",
                    Status = "SUCCESS",
                    Description = $"[Escrow Release] Released funds for Milestone ID {milestone.MilestoneId}",
                    ReferenceId = milestone.MilestoneId.ToString(),
                    CreatedAt = DateTime.UtcNow
                };

                var expertTxn = new Transaction
                {
                    UserId = expertId,
                    ProjectId = project.ProjectId,
                    MilestoneId = milestone.MilestoneId,
                    Amount = escrowAmount,
                    Type = "EscrowReceived",
                    Status = "SUCCESS",
                    Description = $"[Escrow Received] Received funds from Milestone ID {milestone.MilestoneId}",
                    ReferenceId = milestone.MilestoneId.ToString(),
                    CreatedAt = DateTime.UtcNow
                };

                _context.Transactions.Add(releaseTxn);
                _context.Transactions.Add(expertTxn);

                await _context.SaveChangesAsync();

                await dbTransaction.CommitAsync();
                return true;
            }
            catch
            {
                await dbTransaction.RollbackAsync();
                return false;
            }
        }

        public async Task<bool> RefundEscrowAsync(int milestoneId)
        {
            await using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var milestone = await _context.Milestones
                    .FirstOrDefaultAsync(m => m.MilestoneId == milestoneId);

                if (milestone == null)
                    return false;

                var project = await _context.Projects
                    .FirstOrDefaultAsync(p => p.ProjectId == milestone.ProjectId);

                if (project == null)
                    return false;

                var holdTxn = await _context.Transactions
                    .FirstOrDefaultAsync(t =>
                        t.MilestoneId == milestoneId &&
                        t.Type == "EscrowHold" &&
                        t.Status == "SUCCESS");

                if (holdTxn == null)
                    return false;

                var clientId = holdTxn.UserId;
                var escrowAmount = Math.Abs(holdTxn.Amount);

                var clientWallet = await _context.Wallets
                    .FirstOrDefaultAsync(w => w.UserId == clientId);

                if (clientWallet == null || clientWallet.LockedBalance < escrowAmount)
                    return false;

                clientWallet.LockedBalance -= escrowAmount;
                clientWallet.AvailableBalance += escrowAmount;
                clientWallet.UpdatedAt = DateTime.UtcNow;

                holdTxn.Status = "REFUNDED";
                milestone.Status = "REFUNDED";

                var refundTxn = new Transaction
                {
                    UserId = clientId,
                    ProjectId = project.ProjectId,
                    MilestoneId = milestone.MilestoneId,
                    Amount = escrowAmount,
                    Type = "EscrowRefunded",
                    Status = "SUCCESS",
                    Description = $"[Escrow Refund] Refunded funds for Milestone ID {milestone.MilestoneId}",
                    ReferenceId = milestone.MilestoneId.ToString(),
                    CreatedAt = DateTime.UtcNow
                };

                _context.Transactions.Add(refundTxn);
                await _context.SaveChangesAsync();

                await dbTransaction.CommitAsync();
                return true;
            }
            catch
            {
                await dbTransaction.RollbackAsync();
                return false;
            }
        }
    }
}