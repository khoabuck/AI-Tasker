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
            var userExists =
                await _context.Users.AnyAsync(u => u.UserId == userId);

            if (!userExists)
            {
                throw new InvalidOperationException("User not found.");
            }

            var wallet =
                await _context.Wallets
                    .FirstOrDefaultAsync(w => w.UserId == userId);

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

        private async Task<int> ResolveClientUserIdAsync(int clientId)
        {
            var userExists =
                await _context.Users.AnyAsync(u => u.UserId == clientId);

            if (userExists)
            {
                return clientId;
            }

            var clientProfile =
                await _context.ClientProfiles
                    .FirstOrDefaultAsync(c => c.ClientProfileId == clientId);

            if (clientProfile == null)
            {
                throw new InvalidOperationException("Client profile not found.");
            }

            return clientProfile.UserId;
        }

        public async Task<decimal> GetBalanceAsync(int userId)
        {
            var wallet = await GetOrCreateWalletAsync(userId);

            return wallet.AvailableBalance;
        }

        public async Task<bool> DepositAsync(
            int userId,
            decimal amount,
            string transactionRef)
        {
            if (amount <= 0)
            {
                throw new InvalidOperationException(
                    "Deposit amount must be greater than 0."
                );
            }

            if (string.IsNullOrWhiteSpace(transactionRef))
            {
                throw new InvalidOperationException(
                    "Transaction reference is required."
                );
            }

            using var transaction =
                await _context.Database.BeginTransactionAsync();

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
                    Description = "Wallet deposit",
                    ReferenceId = transactionRef
                };

                _context.Transactions.Add(txn);

                var affectedRows =
                    await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                return affectedRows > 0;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> HoldEscrowAsync(
            int clientId,
            int milestoneId,
            decimal amount)
        {
            if (amount <= 0)
            {
                throw new InvalidOperationException(
                    "Escrow hold amount must be greater than 0."
                );
            }

            if (milestoneId <= 0)
            {
                throw new InvalidOperationException(
                    "MilestoneId is required."
                );
            }

            using var transaction =
                await _context.Database.BeginTransactionAsync();

            try
            {
                var clientUserId =
                    await ResolveClientUserIdAsync(clientId);

                var wallet =
                    await _context.Wallets
                        .FirstOrDefaultAsync(w => w.UserId == clientUserId);

                if (wallet == null || wallet.AvailableBalance < amount)
                {
                    throw new InvalidOperationException(
                        "Escrow aborted: Insufficient funds in client wallet."
                    );
                }

                var referenceId = $"MILESTONE_{milestoneId}";

                var existingHold =
                    await _context.Transactions.AnyAsync(t =>
                        t.ReferenceId == referenceId &&
                        t.Type == "EscrowHold");

                if (existingHold)
                {
                    throw new InvalidOperationException(
                        "Escrow has already been held for this milestone."
                    );
                }

                wallet.AvailableBalance -= amount;
                wallet.LockedBalance += amount;
                wallet.UpdatedAt = DateTime.UtcNow;

                var txn = new Transaction
                {
                    UserId = clientUserId,
                    Amount = -amount,
                    Type = "EscrowHold",
                    Description = $"[Escrow Hold] Locked funds for Milestone ID {milestoneId}",
                    ReferenceId = referenceId
                };

                _context.Transactions.Add(txn);

                var affectedRows =
                    await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                return affectedRows > 0;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> ReleaseEscrowAsync(
            int milestoneId,
            int expertId)
        {
            using var transaction =
                await _context.Database.BeginTransactionAsync();

            try
            {
                var milestone =
                    await _context.Milestones
                        .Include(m => m.Project)
                        .FirstOrDefaultAsync(m => m.MilestoneId == milestoneId);

                if (milestone == null || milestone.Project == null)
                {
                    throw new InvalidOperationException("Milestone not found.");
                }

                if (milestone.Status != "LOCKED")
                {
                    throw new InvalidOperationException(
                        "Only locked milestones can be released."
                    );
                }

                var contract =
                    await _context.ProjectContracts
                        .FirstOrDefaultAsync(c =>
                            c.ContractId == milestone.Project.ContractId);

                if (contract == null)
                {
                    throw new InvalidOperationException(
                        "Related contract not found."
                    );
                }

                var expertProfile =
                    await _context.ExpertProfiles
                        .FirstOrDefaultAsync(e =>
                            e.ExpertProfileId == contract.ExpertId);

                if (expertProfile == null)
                {
                    throw new InvalidOperationException(
                        "Expert profile not found."
                    );
                }

                if (expertProfile.UserId != expertId)
                {
                    throw new InvalidOperationException(
                        "Escrow release rejected: Expert does not match this contract."
                    );
                }

                var clientProfile =
                    await _context.ClientProfiles
                        .FirstOrDefaultAsync(c =>
                            c.ClientProfileId == contract.ClientId);

                if (clientProfile == null)
                {
                    throw new InvalidOperationException(
                        "Client profile not found."
                    );
                }

                var clientWallet =
                    await _context.Wallets
                        .FirstOrDefaultAsync(w =>
                            w.UserId == clientProfile.UserId);

                if (clientWallet == null ||
                    clientWallet.LockedBalance < milestone.Amount)
                {
                    throw new InvalidOperationException(
                        "Escrow release rejected: Locked balance is insufficient."
                    );
                }

                var expertWallet =
                    await GetOrCreateWalletAsync(expertProfile.UserId);

                clientWallet.LockedBalance -= milestone.Amount;
                clientWallet.UpdatedAt = DateTime.UtcNow;

                expertWallet.AvailableBalance += milestone.Amount;
                expertWallet.UpdatedAt = DateTime.UtcNow;

                milestone.Status = "RELEASED";

                var referenceId = $"MILESTONE_{milestoneId}";

                _context.Transactions.Add(new Transaction
                {
                    UserId = expertProfile.UserId,
                    Amount = milestone.Amount,
                    Type = "EscrowReceived",
                    Description = $"[Escrow Release] Received funds from Milestone ID {milestoneId}",
                    ReferenceId = referenceId
                });

                _context.Transactions.Add(new Transaction
                {
                    UserId = clientProfile.UserId,
                    Amount = -milestone.Amount,
                    Type = "EscrowReleased",
                    Description = $"[Escrow Release] Released funds for Milestone ID {milestoneId}",
                    ReferenceId = referenceId
                });

                var affectedRows =
                    await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                return affectedRows > 0;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> RefundEscrowAsync(int milestoneId)
        {
            using var transaction =
                await _context.Database.BeginTransactionAsync();

            try
            {
                var milestone =
                    await _context.Milestones
                        .Include(m => m.Project)
                        .FirstOrDefaultAsync(m => m.MilestoneId == milestoneId);

                if (milestone == null || milestone.Project == null)
                {
                    throw new InvalidOperationException("Milestone not found.");
                }

                if (milestone.Status != "LOCKED")
                {
                    throw new InvalidOperationException(
                        "Only locked milestones can be refunded."
                    );
                }

                var contract =
                    await _context.ProjectContracts
                        .FirstOrDefaultAsync(c =>
                            c.ContractId == milestone.Project.ContractId);

                if (contract == null)
                {
                    throw new InvalidOperationException(
                        "Related contract not found."
                    );
                }

                var clientProfile =
                    await _context.ClientProfiles
                        .FirstOrDefaultAsync(c =>
                            c.ClientProfileId == contract.ClientId);

                if (clientProfile == null)
                {
                    throw new InvalidOperationException(
                        "Client profile not found."
                    );
                }

                var clientWallet =
                    await _context.Wallets
                        .FirstOrDefaultAsync(w =>
                            w.UserId == clientProfile.UserId);

                if (clientWallet == null ||
                    clientWallet.LockedBalance < milestone.Amount)
                {
                    throw new InvalidOperationException(
                        "Escrow refund rejected: Locked balance is insufficient."
                    );
                }

                clientWallet.LockedBalance -= milestone.Amount;
                clientWallet.AvailableBalance += milestone.Amount;
                clientWallet.UpdatedAt = DateTime.UtcNow;

                milestone.Status = "REFUNDED";

                var referenceId = $"MILESTONE_{milestoneId}";

                _context.Transactions.Add(new Transaction
                {
                    UserId = clientProfile.UserId,
                    Amount = milestone.Amount,
                    Type = "EscrowRefunded",
                    Description = $"[Escrow Refund] Refunded funds for Milestone ID {milestoneId}",
                    ReferenceId = referenceId
                });

                var affectedRows =
                    await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                return affectedRows > 0;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
    }
}