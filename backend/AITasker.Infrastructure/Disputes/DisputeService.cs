using System;
using System.Threading.Tasks;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Disputes
{
    public class DisputeService : IDisputeService
    {
        private readonly AITaskerDbContext _context;
        private readonly INotificationService _notificationService;

        public DisputeService(
            AITaskerDbContext context,
            INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<int?> OpenDisputeAsync(
            int projectId,
            int? milestoneId,
            int openedByUserId,
            int respondentUserId,
            decimal disputedAmount,
            string reason)
        {
            if (projectId <= 0)
            {
                throw new InvalidOperationException("ProjectId is required.");
            }

            if (respondentUserId <= 0)
            {
                throw new InvalidOperationException("Respondent user is required.");
            }

            if (openedByUserId == respondentUserId)
            {
                throw new InvalidOperationException("You cannot open a dispute against yourself.");
            }

            if (disputedAmount <= 0)
            {
                throw new InvalidOperationException("Disputed amount must be greater than 0.");
            }

            if (string.IsNullOrWhiteSpace(reason))
            {
                throw new InvalidOperationException("Dispute reason is required.");
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var project = await _context.Projects
                    .FirstOrDefaultAsync(p => p.ProjectId == projectId);

                if (project == null)
                {
                    throw new InvalidOperationException("Project not found.");
                }

                var contract = await _context.ProjectContracts
                    .FirstOrDefaultAsync(c => c.ContractId == project.ContractId);

                if (contract == null)
                {
                    throw new InvalidOperationException("Related contract not found.");
                }

                var clientProfile = await _context.ClientProfiles
                    .FirstOrDefaultAsync(c => c.ClientProfileId == contract.ClientId);

                var expertProfile = await _context.ExpertProfiles
                    .FirstOrDefaultAsync(e => e.ExpertProfileId == contract.ExpertId);

                if (clientProfile == null || expertProfile == null)
                {
                    throw new InvalidOperationException("Contract parties are invalid.");
                }

                var clientUserId = clientProfile.UserId;
                var expertUserId = expertProfile.UserId;

                var isClientOpening =
                    openedByUserId == clientUserId &&
                    respondentUserId == expertUserId;

                var isExpertOpening =
                    openedByUserId == expertUserId &&
                    respondentUserId == clientUserId;

                if (!isClientOpening && !isExpertOpening)
                {
                    throw new InvalidOperationException(
                        "Only the project client or assigned expert can open this dispute."
                    );
                }

                Milestone? milestone = null;

                if (milestoneId.HasValue)
                {
                    milestone = await _context.Milestones
                        .FirstOrDefaultAsync(m =>
                            m.MilestoneId == milestoneId.Value &&
                            m.ProjectId == projectId);

                    if (milestone == null)
                    {
                        throw new InvalidOperationException("Milestone not found in this project.");
                    }

                    if (milestone.Status == "RELEASED" ||
                        milestone.Status == "REFUNDED")
                    {
                        throw new InvalidOperationException(
                            "Cannot open dispute for a completed milestone."
                        );
                    }

                    if (disputedAmount > milestone.Amount)
                    {
                        throw new InvalidOperationException(
                            "Disputed amount cannot exceed milestone amount."
                        );
                    }

                    var existingDispute = await _context.Disputes.AnyAsync(d =>
                        d.MilestoneId == milestoneId.Value &&
                        d.Status == "OPEN");

                    if (existingDispute)
                    {
                        throw new InvalidOperationException(
                            "An open dispute already exists for this milestone."
                        );
                    }

                    milestone.Status = "DISPUTED";

                    var referenceId = $"MILESTONE_{milestoneId.Value}";

                    var holdTxn = await _context.Transactions
                        .FirstOrDefaultAsync(t =>
                            t.ReferenceId == referenceId &&
                            t.Type == "EscrowHold");

                    if (holdTxn != null)
                    {
                        holdTxn.Type = "EscrowFrozen";
                        holdTxn.Description +=
                            $" | [FROZEN] Due to Dispute Open at {DateTime.UtcNow}";
                    }
                }

                var dispute = new Dispute
                {
                    ProjectId = projectId,
                    MilestoneId = milestoneId,
                    OpenedByUserId = openedByUserId,
                    RespondentUserId = respondentUserId,
                    DisputedAmount = disputedAmount,
                    Reason = reason,
                    Status = "OPEN",
                    CreatedAt = DateTime.UtcNow
                };

                _context.Disputes.Add(dispute);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return dispute.DisputeId;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> ResolveDisputeAsync(
            int disputeId,
            string resolutionType,
            decimal expertAmount,
            decimal clientAmount)
        {
            if (disputeId <= 0)
            {
                throw new InvalidOperationException("DisputeId is required.");
            }

            if (string.IsNullOrWhiteSpace(resolutionType))
            {
                throw new InvalidOperationException("Resolution type is required.");
            }

            if (expertAmount < 0 || clientAmount < 0)
            {
                throw new InvalidOperationException("Resolution amounts cannot be negative.");
            }

            using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var dispute = await _context.Disputes
                    .FirstOrDefaultAsync(d => d.DisputeId == disputeId);

                if (dispute == null)
                {
                    throw new InvalidOperationException("Dispute not found.");
                }

                if (dispute.Status != "OPEN")
                {
                    throw new InvalidOperationException("Only open disputes can be resolved.");
                }

                if (expertAmount + clientAmount != dispute.DisputedAmount)
                {
                    throw new InvalidOperationException(
                        "Expert amount plus client amount must equal disputed amount."
                    );
                }

                var project = await _context.Projects
                    .FirstOrDefaultAsync(p => p.ProjectId == dispute.ProjectId);

                if (project == null)
                {
                    throw new InvalidOperationException("Project not found.");
                }

                var contract = await _context.ProjectContracts
                    .FirstOrDefaultAsync(c => c.ContractId == project.ContractId);

                if (contract == null)
                {
                    throw new InvalidOperationException("Related contract not found.");
                }

                var clientProfile = await _context.ClientProfiles
                    .FirstOrDefaultAsync(c => c.ClientProfileId == contract.ClientId);

                var expertProfile = await _context.ExpertProfiles
                    .FirstOrDefaultAsync(e => e.ExpertProfileId == contract.ExpertId);

                if (clientProfile == null || expertProfile == null)
                {
                    throw new InvalidOperationException("Contract parties are invalid.");
                }

                var clientUserId = clientProfile.UserId;
                var expertUserId = expertProfile.UserId;

                var clientWallet = await GetOrCreateWalletAsync(clientUserId);
                var expertWallet = await GetOrCreateWalletAsync(expertUserId);

                if (clientWallet.LockedBalance < dispute.DisputedAmount)
                {
                    throw new InvalidOperationException(
                        "Client locked balance is insufficient for dispute resolution."
                    );
                }

                clientWallet.LockedBalance -= dispute.DisputedAmount;
                clientWallet.UpdatedAt = DateTime.UtcNow;

                var referenceId = dispute.MilestoneId.HasValue
                    ? $"MILESTONE_{dispute.MilestoneId.Value}"
                    : $"DISPUTE_{dispute.DisputeId}";

                if (clientAmount > 0)
                {
                    clientWallet.AvailableBalance += clientAmount;
                    clientWallet.UpdatedAt = DateTime.UtcNow;

                    _context.Transactions.Add(new Transaction
                    {
                        UserId = clientUserId,
                        Amount = clientAmount,
                        Type = "DisputeRefund",
                        Description = $"[Dispute Resolve] Refunded from Dispute ID {disputeId}",
                        ReferenceId = referenceId,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                if (expertAmount > 0)
                {
                    expertWallet.AvailableBalance += expertAmount;
                    expertWallet.TotalEarning += expertAmount;
                    expertWallet.UpdatedAt = DateTime.UtcNow;

                    _context.Transactions.Add(new Transaction
                    {
                        UserId = expertUserId,
                        Amount = expertAmount,
                        Type = "DisputeEscrowReceived",
                        Description = $"[Dispute Resolve] Received from Dispute ID {disputeId}",
                        ReferenceId = referenceId,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                var frozenTxn = await _context.Transactions
                    .FirstOrDefaultAsync(t =>
                        t.ReferenceId == referenceId &&
                        t.Type == "EscrowFrozen");

                if (frozenTxn != null)
                {
                    frozenTxn.Type = "EscrowResolved";
                    frozenTxn.Description +=
                        $" | [RESOLVED] Admin resolution: {resolutionType} at {DateTime.UtcNow}";
                }

                if (dispute.MilestoneId.HasValue)
                {
                    var milestone = await _context.Milestones
                        .FirstOrDefaultAsync(m =>
                            m.MilestoneId == dispute.MilestoneId.Value);

                    if (milestone != null)
                    {
                        if (expertAmount == dispute.DisputedAmount)
                        {
                            milestone.Status = "RELEASED";
                        }
                        else if (clientAmount == dispute.DisputedAmount)
                        {
                            milestone.Status = "REFUNDED";
                        }
                        else
                        {
                            milestone.Status = "DISPUTE_RESOLVED";
                        }
                    }
                }

                dispute.Status = "RESOLVED";
                dispute.ResolutionType = resolutionType;
                dispute.ResolvedAt = DateTime.UtcNow;

                var notificationContent =
                    $"Dispute ID {disputeId} has been resolved: {resolutionType}. " +
                    $"Client receives: {clientAmount} VND, Expert receives: {expertAmount} VND.";

                await _notificationService.CreateNotificationAsync(
                    clientUserId,
                    "Dispute Resolved",
                    notificationContent,
                    "DISPUTE"
                );

                await _notificationService.CreateNotificationAsync(
                    expertUserId,
                    "Dispute Resolved",
                    notificationContent,
                    "DISPUTE"
                );

                await _context.SaveChangesAsync();
                await dbTransaction.CommitAsync();

                return true;
            }
            catch
            {
                await dbTransaction.RollbackAsync();
                throw;
            }
        }

        private async Task<Wallet> GetOrCreateWalletAsync(int userId)
        {
            var wallet = await _context.Wallets
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
    }
}