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

        public DeliverableService(
            AITaskerDbContext context,
            IWalletService walletService,
            INotificationService notificationService)
        {
            _context = context;
            _walletService = walletService;
            _notificationService = notificationService;
        }

        public async Task<Deliverable?> SubmitDeliverableAsync(
            int milestoneId,
            int expertId,
            string description,
            string? fileUrl,
            string? demoUrl,
            string? testResultUrl)
        {
            if (string.IsNullOrWhiteSpace(fileUrl))
            {
                return null;
            }

            var milestone = await _context.Milestones
                .FirstOrDefaultAsync(m => m.MilestoneId == milestoneId);

            if (milestone == null)
            {
                return null;
            }

            if (milestone.Status == "RELEASED" || milestone.Status == "DISPUTED")
            {
                return null;
            }

            var project = await _context.Projects
                .FirstOrDefaultAsync(p => p.ProjectId == milestone.ProjectId);

            if (project == null)
            {
                return null;
            }

            var expertProfile = await _context.ExpertProfiles
                .FirstOrDefaultAsync(e => e.UserId == expertId);

            if (expertProfile == null)
            {
                return null;
            }

            var isAssignedExpert = await _context.ProjectContracts
                .AnyAsync(c =>
                    c.ContractId == project.ContractId &&
                    c.ExpertId == expertProfile.ExpertProfileId);

            if (!isAssignedExpert)
            {
                return null;
            }

            try
            {
                var latestVersion =
                    await _context.Deliverables
                        .Where(d => d.MilestoneId == milestoneId)
                        .MaxAsync(d => (int?)d.VersionNumber) ?? 0;

                var deliverable = new Deliverable
                {
                    MilestoneId = milestoneId,
                    ExpertId = expertProfile.ExpertProfileId,
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
            catch
            {
                return null;
            }
        }

        public async Task<bool> ApproveDeliverableAsync(int deliverableId)
        {
            using var transaction =
                await _context.Database.BeginTransactionAsync();

            try
            {
                var deliverable = await _context.Deliverables
                    .FirstOrDefaultAsync(d => d.DeliverableId == deliverableId);

                if (deliverable == null)
                {
                    return false;
                }

                if (deliverable.Status != "SUBMITTED")
                {
                    return false;
                }

                var expertProfile = await _context.ExpertProfiles
                    .FirstOrDefaultAsync(e =>
                        e.ExpertProfileId == deliverable.ExpertId);

                if (expertProfile == null)
                {
                    return false;
                }

                deliverable.Status = "APPROVED";

                var releaseSuccess =
                    await _walletService.ReleaseEscrowAsync(
                        deliverable.MilestoneId,
                        expertProfile.UserId
                    );

                if (!releaseSuccess)
                {
                    await transaction.RollbackAsync();
                    return false;
                }

                await _notificationService.CreateNotificationAsync(
                    expertProfile.UserId,
                    "Deliverable Approved",
                    $"Your deliverable for Milestone ID {deliverable.MilestoneId} has been approved and funds released.",
                    "MILESTONE"
                );

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

        public async Task<bool> RequestRevisionAsync(
            int deliverableId,
            string feedback)
        {
            if (string.IsNullOrWhiteSpace(feedback))
            {
                return false;
            }

            using var transaction =
                await _context.Database.BeginTransactionAsync();

            try
            {
                var deliverable = await _context.Deliverables
                    .FirstOrDefaultAsync(d => d.DeliverableId == deliverableId);

                if (deliverable == null)
                {
                    return false;
                }

                if (deliverable.Status != "SUBMITTED")
                {
                    return false;
                }

                var expertProfile = await _context.ExpertProfiles
                    .FirstOrDefaultAsync(e =>
                        e.ExpertProfileId == deliverable.ExpertId);

                if (expertProfile == null)
                {
                    return false;
                }

                deliverable.Status = "REVISION_REQUESTED";
                deliverable.ClientFeedback = feedback;

                await _notificationService.CreateNotificationAsync(
                    expertProfile.UserId,
                    "Revision Requested",
                    $"Revision requested for Milestone ID {deliverable.MilestoneId}. Feedback: {feedback}",
                    "MILESTONE"
                );

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
    }
}