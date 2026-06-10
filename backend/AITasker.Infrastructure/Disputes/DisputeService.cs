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

        public DisputeService(AITaskerDbContext context)
        {
            _context = context;
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
    }
}