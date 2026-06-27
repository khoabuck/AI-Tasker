using AITasker.Application.Interfaces;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AITasker.Infrastructure.Projects
{
    public class MilestoneDeadlineHostedService : BackgroundService
    {
        private const string ProjectStatusActive = "ACTIVE";

        private const string MilestoneStatusFunded = "FUNDED";
        private const string MilestoneStatusInProgress = "IN_PROGRESS";
        private const string MilestoneStatusOverdue = "OVERDUE";

        private const string PaymentStatusLocked = "LOCKED";

        private const string DeliverableStatusSubmitted = "SUBMITTED";
        private const string DeliverableStatusApproved = "APPROVED";
        private const string DeliverableStatusAutoApproved = "AUTO_APPROVED";
        private const string DeliverableStatusRevisionRequested = "REVISION_REQUESTED";

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<MilestoneDeadlineHostedService> _logger;

        public MilestoneDeadlineHostedService(
            IServiceScopeFactory scopeFactory,
            ILogger<MilestoneDeadlineHostedService> logger)
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
                    _logger.LogError(ex, "Error while processing milestone deadlines.");
                }

                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }
        }

        private async Task ProcessAsync(CancellationToken cancellationToken)
        {
            using var scope = _scopeFactory.CreateScope();

            var context = scope.ServiceProvider.GetRequiredService<AITaskerDbContext>();
            var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

            var now = DateTime.UtcNow;

            var milestones = await context.Milestones
                .Where(m =>
                    m.Deadline <= now &&
                    m.SubmissionOverdueNotifiedAt == null &&
                    m.PaymentStatus == PaymentStatusLocked &&
                    (
                        m.Status == MilestoneStatusFunded ||
                        m.Status == MilestoneStatusInProgress
                    ))
                .OrderBy(m => m.Deadline)
                .Take(20)
                .ToListAsync(cancellationToken);

            foreach (var milestone in milestones)
            {
                await ProcessOneAsync(
                    context,
                    notificationService,
                    milestone,
                    now,
                    cancellationToken);
            }
        }

        private async Task ProcessOneAsync(
            AITaskerDbContext context,
            INotificationService notificationService,
            Domain.Entities.Milestone milestone,
            DateTime now,
            CancellationToken cancellationToken)
        {
            var project = await context.Projects
                .FirstOrDefaultAsync(p => p.ProjectId == milestone.ProjectId, cancellationToken);

            if (project == null)
            {
                return;
            }

            if (!string.Equals(project.Status, ProjectStatusActive, StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            var alreadyHasDeliverable = await context.Deliverables.AnyAsync(d =>
                    d.MilestoneId == milestone.MilestoneId &&
                    (
                        d.Status == DeliverableStatusSubmitted ||
                        d.Status == DeliverableStatusApproved ||
                        d.Status == DeliverableStatusAutoApproved ||
                        d.Status == DeliverableStatusRevisionRequested
                    ),
                cancellationToken);

            if (alreadyHasDeliverable)
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

            if (clientProfile == null || expertProfile == null)
            {
                return;
            }

            milestone.Status = MilestoneStatusOverdue;
            milestone.SubmissionOverdueNotifiedAt = now;

            await context.SaveChangesAsync(cancellationToken);

            await notificationService.CreateNotificationAsync(
                expertProfile.UserId,
                "Milestone overdue",
                $"Milestone '{milestone.Title}' is overdue. Please submit the deliverable as soon as possible.",
                "MILESTONE_OVERDUE",
                relatedEntityType: "MILESTONE",
                relatedEntityId: milestone.MilestoneId,
                relatedContractId: contract.ContractId,
                relatedProjectId: project.ProjectId,
                relatedMilestoneId: milestone.MilestoneId);

            await notificationService.CreateNotificationAsync(
                clientProfile.UserId,
                "Milestone overdue",
                $"Expert missed the deadline for milestone '{milestone.Title}'.",
                "MILESTONE_OVERDUE",
                relatedEntityType: "MILESTONE",
                relatedEntityId: milestone.MilestoneId,
                relatedContractId: contract.ContractId,
                relatedProjectId: project.ProjectId,
                relatedMilestoneId: milestone.MilestoneId);
        }
    }
}