using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace AITasker.Infrastructure.Deliverables
{
    public class DeliverableService : IDeliverableService
    {
        private readonly AITaskerDbContext _context;
        private readonly IWalletService _walletService;
        private readonly INotificationService _notificationService;

        public DeliverableService(AITaskerDbContext context, IWalletService walletService, INotificationService notificationService)
        {
            _context = context;
            _walletService = walletService;
            _notificationService = notificationService;
        }

        public async Task<Deliverable?> SubmitDeliverableAsync(int milestoneId, int expertId, string description, string? fileUrl, string? demoUrl, string? testResultUrl)
        {
            try
            {
                int latestVersion = await _context.Deliverables
                    .Where(d => d.MilestoneId == milestoneId)
                    .Select(d => d.VersionNumber)
                    .DefaultIfEmpty(0)
                    .MaxAsync();

                var deliverable = new Deliverable
                {
                    MilestoneId = milestoneId,
                    ExpertId = expertId,
                    VersionNumber = latestVersion + 1,
                    Description = description,
                    FileUrl = fileUrl,
                    DemoUrl = demoUrl,
                    TestResultUrl = testResultUrl,
                    Status = "SUBMITTED",
                    SubmittedAt = DateTime.UtcNow
                };

                _context.Deliverables.Add(deliverable);
                await _context.SaveChangesAsync();

                return deliverable;
            }
            catch (Exception)
            {
                return null;
            }
        }

        public async Task<bool> ApproveDeliverableAsync(int deliverableId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var deliverable = await _context.Deliverables.FindAsync(deliverableId);
                if (deliverable == null) return false;

                deliverable.Status = "APPROVED";
                await _context.SaveChangesAsync();

                string milestoneIdStr = deliverable.MilestoneId.ToString();
                var releaseSuccess = await _walletService.ReleaseEscrowAsync(milestoneIdStr, deliverable.ExpertId);
                if (!releaseSuccess)
                {
                    await transaction.RollbackAsync();
                    return false;
                }

                await _notificationService.CreateNotificationAsync(
                    deliverable.ExpertId,
                    "Deliverable Approved",
                    $"Your deliverable for Milestone ID {deliverable.MilestoneId} has been approved and funds released.",
                    "MILESTONE"
                );

                await transaction.CommitAsync();
                return true;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                return false;
            }
        }

        public async Task<bool> RequestRevisionAsync(int deliverableId, string feedback)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var deliverable = await _context.Deliverables.FindAsync(deliverableId);
                if (deliverable == null) return false;

                deliverable.Status = "REVISION_REQUESTED";
                deliverable.ClientFeedback = feedback;
                await _context.SaveChangesAsync();

                await _notificationService.CreateNotificationAsync(
                    deliverable.ExpertId,
                    "Revision Requested",
                    $"Revision requested for Milestone ID {deliverable.MilestoneId}. Feedback: {feedback}",
                    "MILESTONE"
                );

                await transaction.CommitAsync();
                return true;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                return false;
            }
        }
    }
}