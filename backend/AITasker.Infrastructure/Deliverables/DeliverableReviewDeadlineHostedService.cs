using AITasker.Application.Interfaces;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AITasker.Infrastructure.Deliverables
{
    public class DeliverableReviewDeadlineHostedService : BackgroundService
    {
        private const string ProjectStatusActive = "ACTIVE";
        private const string ProjectStatusCompleted = "COMPLETED";

        private const string JobStatusCompleted = "COMPLETED";

        private const string MilestoneStatusSubmitted = "SUBMITTED";
        private const string MilestoneStatusApproved = "APPROVED";
        private const string MilestoneStatusResolved = "RESOLVED";
        private const string MilestoneStatusDisputeResolved = "DISPUTE_RESOLVED";
        private const string MilestoneStatusReleased = "RELEASED";
        private const string MilestoneStatusRefunded = "REFUNDED";

        private const string PaymentStatusLocked = "LOCKED";
        private const string PaymentStatusReleased = "RELEASED";
        private const string PaymentStatusRefunded = "REFUNDED";

        private const string DeliverableStatusSubmitted = "SUBMITTED";
        private const string DeliverableStatusAutoApproved = "AUTO_APPROVED";

        private const string DisputeStatusOpen = "OPEN";

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<DeliverableReviewDeadlineHostedService> _logger;

        public DeliverableReviewDeadlineHostedService(
            IServiceScopeFactory scopeFactory,
            ILogger<DeliverableReviewDeadlineHostedService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error while processing deliverable review deadlines.");
                }

                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }
        }

        private async Task ProcessAsync(CancellationToken cancellationToken)
        {
            using var scope = _scopeFactory.CreateScope();

            var context = scope.ServiceProvider.GetRequiredService<AITaskerDbContext>();
            var walletService = scope.ServiceProvider.GetRequiredService<IWalletService>();
            var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();
            var workflowPolicyService = scope.ServiceProvider.GetRequiredService<IMarketplaceWorkflowPolicyService>();
            var workflowPolicy = await workflowPolicyService.GetActivePolicyAsync();

            var now = DateTime.UtcNow;

            var deliverables = await context.Deliverables
                .Where(d =>
                    d.Status == DeliverableStatusSubmitted &&
                    d.ReviewDeadlineAt != null &&
                    d.ReviewDeadlineAt <= now &&
                    d.ReviewedAt == null)
                .OrderBy(d => d.ReviewDeadlineAt)
                .Take(20)
                .ToListAsync(cancellationToken);

            foreach (var deliverable in deliverables)
            {
                await ProcessOneAsync(
                    context,
                    walletService,
                    notificationService,
                    deliverable,
                    now,
                    workflowPolicy.DeliverableAutoApproveGraceHours,
                    cancellationToken);
            }
        }

        private async Task ProcessOneAsync(
            AITaskerDbContext context,
            IWalletService walletService,
            INotificationService notificationService,
            Domain.Entities.Deliverable deliverable,
            DateTime now,
            int gracePeriodHours,
            CancellationToken cancellationToken)
        {
            var milestone = await context.Milestones
                .FirstOrDefaultAsync(x => x.MilestoneId == deliverable.MilestoneId, cancellationToken);

            if (milestone == null)
            {
                return;
            }

            var project = await context.Projects
                .FirstOrDefaultAsync(x => x.ProjectId == milestone.ProjectId, cancellationToken);

            if (project == null)
            {
                return;
            }

            if (!string.Equals(project.Status, ProjectStatusActive, StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            if (!string.Equals(milestone.Status, MilestoneStatusSubmitted, StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            if (!string.Equals(milestone.PaymentStatus, PaymentStatusLocked, StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            var hasOpenDispute = await context.Disputes.AnyAsync(d =>
                d.Status == DisputeStatusOpen &&
                d.ProjectId == project.ProjectId &&
                (
                    d.MilestoneId == null ||
                    d.MilestoneId == milestone.MilestoneId
                ),
            cancellationToken);

            if (hasOpenDispute)
            {
                return;
            }

            var contract = await context.ProjectContracts
                .FirstOrDefaultAsync(x => x.ContractId == project.ContractId, cancellationToken);

            if (contract == null)
            {
                return;
            }

            var clientProfile = await context.ClientProfiles
                .FirstOrDefaultAsync(x => x.ClientProfileId == contract.ClientId, cancellationToken);

            var expertProfile = await context.ExpertProfiles
                .FirstOrDefaultAsync(x => x.ExpertProfileId == contract.ExpertId, cancellationToken);

            if (clientProfile == null || expertProfile == null)
            {
                return;
            }

            if (deliverable.OverdueNotifiedAt == null)
            {
                deliverable.OverdueNotifiedAt = now;

                await context.SaveChangesAsync(cancellationToken);

                await notificationService.CreateNotificationAsync(
                    clientProfile.UserId,
                    "Deliverable review overdue",
                    $"You missed the review deadline for milestone '{milestone.Title}'. Please approve, request revision, or open dispute within {gracePeriodHours} hours before auto approval.",
                    "CLIENT_REVIEW_OVERDUE",
                    relatedEntityType: "DELIVERABLE",
                    relatedEntityId: deliverable.DeliverableId,
                    relatedProjectId: project.ProjectId,
                    relatedMilestoneId: milestone.MilestoneId,
                    relatedDeliverableId: deliverable.DeliverableId);

                await notificationService.CreateNotificationAsync(
                    expertProfile.UserId,
                    "Client review overdue",
                    $"Client missed the review deadline for milestone '{milestone.Title}'. The system will auto approve after {gracePeriodHours} hours if there is no response.",
                    "CLIENT_REVIEW_OVERDUE",
                    relatedEntityType: "DELIVERABLE",
                    relatedEntityId: deliverable.DeliverableId,
                    relatedProjectId: project.ProjectId,
                    relatedMilestoneId: milestone.MilestoneId,
                    relatedDeliverableId: deliverable.DeliverableId);

                return;
            }

            var autoApproveAt = deliverable.OverdueNotifiedAt.Value.AddHours(gracePeriodHours);

            if (autoApproveAt > now)
            {
                return;
            }

            deliverable.ReviewedAt = now;

            var releaseResult = await walletService.ReleaseEscrowAsync(
                clientProfile.UserId,
                milestone.MilestoneId);

            if (!releaseResult.Success)
            {
                _logger.LogWarning(
                    "Failed to auto release escrow for DeliverableId={DeliverableId}, MilestoneId={MilestoneId}",
                    deliverable.DeliverableId,
                    milestone.MilestoneId);

                return;
            }

            deliverable.Status = DeliverableStatusAutoApproved;

            await TryCompleteProjectAfterAutoApprovalAsync(
                context,
                notificationService,
                project.ProjectId,
                cancellationToken);

            await context.SaveChangesAsync(cancellationToken);

            await notificationService.CreateNotificationAsync(
                clientProfile.UserId,
                "Deliverable auto approved",
                $"Deliverable for milestone '{milestone.Title}' was automatically approved because the review deadline and grace period expired.",
                "DELIVERABLE_AUTO_APPROVED",
                relatedEntityType: "DELIVERABLE",
                relatedEntityId: deliverable.DeliverableId,
                relatedProjectId: project.ProjectId,
                relatedMilestoneId: milestone.MilestoneId,
                relatedDeliverableId: deliverable.DeliverableId);

            await notificationService.CreateNotificationAsync(
                expertProfile.UserId,
                "Deliverable auto approved",
                $"Your deliverable for milestone '{milestone.Title}' was automatically approved and escrow was released.",
                "DELIVERABLE_AUTO_APPROVED",
                relatedEntityType: "DELIVERABLE",
                relatedEntityId: deliverable.DeliverableId,
                relatedProjectId: project.ProjectId,
                relatedMilestoneId: milestone.MilestoneId,
                relatedDeliverableId: deliverable.DeliverableId);
        }

        private static async Task TryCompleteProjectAfterAutoApprovalAsync(
            AITaskerDbContext context,
            INotificationService notificationService,
            int projectId,
            CancellationToken cancellationToken)
        {
            var project = await context.Projects
                .FirstOrDefaultAsync(p => p.ProjectId == projectId, cancellationToken);

            if (project == null)
            {
                return;
            }

            if (string.Equals(project.Status, ProjectStatusCompleted, StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            var milestones = await context.Milestones
                .Where(m => m.ProjectId == projectId)
                .ToListAsync(cancellationToken);

            if (milestones.Count == 0)
            {
                return;
            }

            var allFinished = milestones.All(IsFinishedMilestone);

            if (!allFinished)
            {
                return;
            }

            var contract = await context.ProjectContracts
                .FirstOrDefaultAsync(c => c.ContractId == project.ContractId, cancellationToken);

            if (contract == null)
            {
                return;
            }

            var clientProfile = await context.ClientProfiles
                .FirstOrDefaultAsync(c => c.ClientProfileId == contract.ClientId, cancellationToken);

            var expertProfile = await context.ExpertProfiles
                .FirstOrDefaultAsync(e => e.ExpertProfileId == contract.ExpertId, cancellationToken);

            project.Status = ProjectStatusCompleted;
            project.EndDate = DateTime.UtcNow;

            await UpdateJobStatusByProjectAsync(
                context,
                project,
                JobStatusCompleted,
                cancellationToken);

            await context.SaveChangesAsync(cancellationToken);

            if (clientProfile != null)
            {
                await notificationService.CreateNotificationAsync(
                    clientProfile.UserId,
                    "Project completed",
                    $"Project '{project.Title}' has been completed. You can now review the expert.",
                    "PROJECT_COMPLETED",
                    relatedEntityType: "PROJECT",
                    relatedEntityId: project.ProjectId,
                    relatedContractId: contract.ContractId,
                    relatedProjectId: project.ProjectId);
            }

            if (expertProfile != null)
            {
                await notificationService.CreateNotificationAsync(
                    expertProfile.UserId,
                    "Project completed",
                    $"Project '{project.Title}' has been completed.",
                    "PROJECT_COMPLETED",
                    relatedEntityType: "PROJECT",
                    relatedEntityId: project.ProjectId,
                    relatedContractId: contract.ContractId,
                    relatedProjectId: project.ProjectId);
            }
        }

        private static bool IsFinishedMilestone(Domain.Entities.Milestone milestone)
        {
            var status = milestone.Status?.Trim().ToUpperInvariant();
            var paymentStatus = milestone.PaymentStatus?.Trim().ToUpperInvariant();

            return status == MilestoneStatusApproved ||
                status == MilestoneStatusResolved ||
                status == MilestoneStatusDisputeResolved ||
                status == MilestoneStatusReleased ||
                status == MilestoneStatusRefunded ||
                paymentStatus == PaymentStatusReleased ||
                paymentStatus == PaymentStatusRefunded;
        }

        private static async Task UpdateJobStatusByProjectAsync(
            AITaskerDbContext context,
            Domain.Entities.Project project,
            string jobStatus,
            CancellationToken cancellationToken)
        {
            var contract = await context.ProjectContracts
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ContractId == project.ContractId, cancellationToken);

            if (contract == null)
            {
                return;
            }

            var proposal = await context.Proposals
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ProposalId == contract.ProposalId, cancellationToken);

            if (proposal == null)
            {
                return;
            }

            var job = await context.JobPostings
                .FirstOrDefaultAsync(x => x.JobPostingId == proposal.JobId, cancellationToken);

            if (job == null)
            {
                return;
            }

            job.Status = jobStatus;
            job.UpdatedAt = DateTime.UtcNow;
        }
    }
}