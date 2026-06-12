using System;
using System.Linq;
using System.Threading.Tasks;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

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
            int expertUserId,
            string description,
            string? fileUrl,
            string? demoUrl,
            string? testResultUrl)
        {
            if (string.IsNullOrWhiteSpace(fileUrl))
            {
                throw new InvalidOperationException("Deliverable file URL is required.");
            }

            var milestone = await _context.Milestones
                .FirstOrDefaultAsync(m => m.MilestoneId == milestoneId);

            if (milestone == null)
            {
                throw new InvalidOperationException("Milestone not found.");
            }

            if (milestone.Status != "LOCKED" &&
                milestone.Status != "REVISION_REQUESTED")
            {
                throw new InvalidOperationException(
                    "Deliverable can only be submitted for locked or revision-requested milestones."
                );
            }

            var project = await _context.Projects
                .FirstOrDefaultAsync(p => p.ProjectId == milestone.ProjectId);

            if (project == null)
            {
                throw new InvalidOperationException("Project not found.");
            }

            var expertProfile = await _context.ExpertProfiles
                .FirstOrDefaultAsync(e => e.UserId == expertUserId);

            if (expertProfile == null)
            {
                throw new InvalidOperationException("Expert profile not found.");
            }

            var isAssignedExpert = await _context.ProjectContracts
                .AnyAsync(c =>
                    c.ContractId == project.ContractId &&
                    c.ExpertId == expertProfile.ExpertProfileId);

            if (!isAssignedExpert)
            {
                throw new InvalidOperationException(
                    "Only the assigned expert can submit deliverables for this milestone."
                );
            }

            var latestVersion = await _context.Deliverables
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

            milestone.Status = "SUBMITTED";

            _context.Deliverables.Add(deliverable);

            await _context.SaveChangesAsync();

            return deliverable;
        }

        public async Task<bool> ApproveDeliverableAsync(
            int deliverableId,
            int clientUserId)
        {
            using var transaction =
                await _context.Database.BeginTransactionAsync();

            try
            {
                var deliverable = await _context.Deliverables
                    .FirstOrDefaultAsync(d => d.DeliverableId == deliverableId);

                if (deliverable == null)
                {
                    throw new InvalidOperationException("Deliverable not found.");
                }

                if (deliverable.Status != "SUBMITTED")
                {
                    throw new InvalidOperationException(
                        "Only submitted deliverables can be approved."
                    );
                }

                var milestone = await _context.Milestones
                    .FirstOrDefaultAsync(m =>
                        m.MilestoneId == deliverable.MilestoneId);

                if (milestone == null)
                {
                    throw new InvalidOperationException("Milestone not found.");
                }

                var project = await _context.Projects
                    .FirstOrDefaultAsync(p => p.ProjectId == milestone.ProjectId);

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
                    .FirstOrDefaultAsync(c =>
                        c.ClientProfileId == contract.ClientId &&
                        c.UserId == clientUserId);

                if (clientProfile == null)
                {
                    throw new InvalidOperationException(
                        "Only the contract client can approve this deliverable."
                    );
                }

                var expertProfile = await _context.ExpertProfiles
                    .FirstOrDefaultAsync(e =>
                        e.ExpertProfileId == deliverable.ExpertId);

                if (expertProfile == null)
                {
                    throw new InvalidOperationException("Expert profile not found.");
                }

                deliverable.Status = "APPROVED";
                milestone.Status = "RELEASED";

                var releaseSuccess =
                    await _walletService.ReleaseEscrowAsync(
                        deliverable.MilestoneId,
                        expertProfile.UserId
                    );

                if (!releaseSuccess)
                {
                    throw new InvalidOperationException(
                        "Failed to release escrow funds."
                    );
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
                throw;
            }
        }

        public async Task<bool> RequestRevisionAsync(
            int deliverableId,
            int clientUserId,
            string feedback)
        {
            if (string.IsNullOrWhiteSpace(feedback))
            {
                throw new InvalidOperationException("Revision feedback is required.");
            }

            using var transaction =
                await _context.Database.BeginTransactionAsync();

            try
            {
                var deliverable = await _context.Deliverables
                    .FirstOrDefaultAsync(d => d.DeliverableId == deliverableId);

                if (deliverable == null)
                {
                    throw new InvalidOperationException("Deliverable not found.");
                }

                if (deliverable.Status != "SUBMITTED")
                {
                    throw new InvalidOperationException(
                        "Only submitted deliverables can be sent back for revision."
                    );
                }

                var milestone = await _context.Milestones
                    .FirstOrDefaultAsync(m =>
                        m.MilestoneId == deliverable.MilestoneId);

                if (milestone == null)
                {
                    throw new InvalidOperationException("Milestone not found.");
                }

                var project = await _context.Projects
                    .FirstOrDefaultAsync(p => p.ProjectId == milestone.ProjectId);

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
                    .FirstOrDefaultAsync(c =>
                        c.ClientProfileId == contract.ClientId &&
                        c.UserId == clientUserId);

                if (clientProfile == null)
                {
                    throw new InvalidOperationException(
                        "Only the contract client can request revision."
                    );
                }

                var expertProfile = await _context.ExpertProfiles
                    .FirstOrDefaultAsync(e =>
                        e.ExpertProfileId == deliverable.ExpertId);

                if (expertProfile == null)
                {
                    throw new InvalidOperationException("Expert profile not found.");
                }

                deliverable.Status = "REVISION_REQUESTED";
                deliverable.ClientFeedback = feedback;
                milestone.Status = "REVISION_REQUESTED";

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
                throw;
            }
        }
    }
}