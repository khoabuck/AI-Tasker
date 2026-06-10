using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;

namespace AITasker.Infrastructure.Disputes
{
    public class DisputeService : IDisputeService
    {
        private readonly AITaskerDbContext _context;
        private readonly INotificationService _notificationService;

        public DisputeService(AITaskerDbContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<int?> OpenDisputeAsync(int projectId, int? milestoneId, int openedByUserId, int respondentUserId, decimal disputedAmount, string reason)
        {
            try
            {
                var dispute = new Dispute
                {
                    ProjectId = projectId,
                    MilestoneId = milestoneId,
                    OpenedByUserId = openedByUserId,
                    RespondentUserId = respondentUserId,
                    DisputedAmount = disputedAmount,
                    Reason = reason,
                    Status = "OPEN"
                };

                _context.Disputes.Add(dispute);

                if (milestoneId.HasValue)
                {
                    string refMilestoneId = milestoneId.Value.ToString();
                    var holdTxn = await _context.Transactions
                        .FirstOrDefaultAsync(t => t.ReferenceId == refMilestoneId && t.Type == "EscrowHold");

                    if (holdTxn != null)
                    {
                        holdTxn.Type = "EscrowFrozen";
                        holdTxn.Description += $" | [FROZEN] Due to Dispute Open at {DateTime.UtcNow}";
                    }
                }

                await _context.SaveChangesAsync();
                return dispute.Id;
            }
            catch (Exception)
            {
                return null;
            }
        }

        public async Task<bool> ResolveDisputeAsync(int disputeId, string resolutionType, decimal expertAmount, decimal clientAmount)
        {
            using var dbTransaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var dispute = await _context.Disputes.FindAsync(disputeId);
                if (dispute == null) return false;

                dispute.Status = "RESOLVED";
                dispute.ResolutionType = resolutionType;
                dispute.ResolvedAt = DateTime.UtcNow;

                string refMilestoneId = dispute.MilestoneId.HasValue ? dispute.MilestoneId.Value.ToString() : string.Empty;
                Transaction? frozenTxn = null;
                if (!string.IsNullOrEmpty(refMilestoneId))
                {
                    frozenTxn = await _context.Transactions
                        .FirstOrDefaultAsync(t => t.ReferenceId == refMilestoneId && t.Type == "EscrowFrozen");
                }

                if (frozenTxn != null)
                {
                    frozenTxn.Type = "EscrowResolved";
                    frozenTxn.Description += $" | [RESOLVED] Admin resolution: {resolutionType} at {DateTime.UtcNow}";
                }

                var openedByUser = await _context.Users.FindAsync(dispute.OpenedByUserId);
                var respondentUser = await _context.Users.FindAsync(dispute.RespondentUserId);
                if (openedByUser == null || respondentUser == null) return false;

                int clientUserId = 0;
                int expertUserId = 0;

                if (openedByUser.Role == "CLIENT") clientUserId = openedByUser.UserId;
                else if (openedByUser.Role == "EXPERT") expertUserId = openedByUser.UserId;

                if (respondentUser.Role == "CLIENT") clientUserId = respondentUser.UserId;
                else if (respondentUser.Role == "EXPERT") expertUserId = respondentUser.UserId;

                if (clientUserId == 0 || expertUserId == 0)
                {
                    clientUserId = dispute.OpenedByUserId;
                    expertUserId = dispute.RespondentUserId;
                }

                var clientWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == clientUserId);
                if (clientWallet == null)
                {
                    clientWallet = new Wallet { UserId = clientUserId, AvailableBalance = 0m, LockedBalance = 0m, UpdatedAt = DateTime.UtcNow };
                    _context.Wallets.Add(clientWallet);
                }

                decimal totalDisputed = dispute.DisputedAmount;
                if (clientWallet.LockedBalance >= totalDisputed)
                {
                    clientWallet.LockedBalance -= totalDisputed;
                }
                else
                {
                    clientWallet.LockedBalance = 0;
                }
                clientWallet.UpdatedAt = DateTime.UtcNow;

                if (clientAmount > 0)
                {
                    clientWallet.AvailableBalance += clientAmount;
                    
                    var clientTxn = new Transaction
                    {
                        UserId = clientUserId,
                        Amount = clientAmount,
                        Type = "Refund",
                        Description = $"[Dispute Resolve] Refunded from Dispute ID {disputeId}",
                        ReferenceId = refMilestoneId
                    };
                    _context.Transactions.Add(clientTxn);
                }

                if (expertAmount > 0)
                {
                    var expertWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == expertUserId);
                    if (expertWallet == null)
                    {
                        expertWallet = new Wallet { UserId = expertUserId, AvailableBalance = 0m, LockedBalance = 0m, UpdatedAt = DateTime.UtcNow };
                        _context.Wallets.Add(expertWallet);
                    }
                    expertWallet.AvailableBalance += expertAmount;
                    expertWallet.TotalEarning += expertAmount;
                    expertWallet.UpdatedAt = DateTime.UtcNow;

                    var expertTxn = new Transaction
                    {
                        UserId = expertUserId,
                        Amount = expertAmount,
                        Type = "EscrowReceived",
                        Description = $"[Dispute Resolve] Received from Dispute ID {disputeId}",
                        ReferenceId = refMilestoneId
                    };
                    _context.Transactions.Add(expertTxn);
                }

                await _context.SaveChangesAsync();

                string notificationContent = $"Dispute ID {disputeId} for Milestone ID {refMilestoneId} has been resolved: {resolutionType}. Client receives: {clientAmount} VND, Expert receives: {expertAmount} VND.";
                
                await _notificationService.CreateNotificationAsync(clientUserId, "Dispute Resolved", notificationContent, "DISPUTE");
                await _notificationService.CreateNotificationAsync(expertUserId, "Dispute Resolved", notificationContent, "DISPUTE");

                await dbTransaction.CommitAsync();
                return true;
            }
            catch (Exception)
            {
                await dbTransaction.RollbackAsync();
                return false;
            }
        }
    }
}