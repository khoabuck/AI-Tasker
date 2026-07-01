using AITasker.Application.Interfaces;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AITasker.Infrastructure.Projects
{
    public class PendingEscrowDeadlineHostedService : BackgroundService
    {
        private const string ProjectStatusPendingEscrow = "PENDING_ESCROW";
        private const string ProjectStatusCancelled = "CANCELLED";
        private const string ContractStatusCancelled = "CANCELLED";
        private const string ProposalStatusRejected = "REJECTED";
        private const string JobStatusOpen = "OPEN";
        private const string PaymentStatusPending = "PENDING";
        private const string MilestoneStatusResolved = "RESOLVED";

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<PendingEscrowDeadlineHostedService> _logger;

        public PendingEscrowDeadlineHostedService(
            IServiceScopeFactory scopeFactory,
            ILogger<PendingEscrowDeadlineHostedService> logger)
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
                    _logger.LogError(ex, "Error while processing pending escrow deadlines.");
                }

                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }
        }

        private async Task ProcessAsync(CancellationToken cancellationToken)
        {
            using var scope = _scopeFactory.CreateScope();

            var context = scope.ServiceProvider.GetRequiredService<AITaskerDbContext>();
            var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();
            var rollbackService = scope.ServiceProvider.GetRequiredService<IContractFailureRollbackService>();

            var now = DateTime.UtcNow;

            var expiredProjects = await context.Projects
                .Where(project =>
                    project.Status == ProjectStatusPendingEscrow &&
                    project.EscrowLockDeadlineAt != null &&
                    project.EscrowLockDeadlineAt <= now &&
                    project.EscrowExpiredAt == null)
                .OrderBy(project => project.EscrowLockDeadlineAt)
                .Take(20)
                .ToListAsync(cancellationToken);

            foreach (var project in expiredProjects)
            {
                await ProcessOneAsync(
                    context,
                    notificationService,
                    rollbackService,
                    project,
                    now,
                    cancellationToken);
            }
        }

        private async Task ProcessOneAsync(
            AITaskerDbContext context,
            INotificationService notificationService,
            IContractFailureRollbackService rollbackService,
            Domain.Entities.Project project,
            DateTime now,
            CancellationToken cancellationToken)
        {
            var contract = await context.ProjectContracts
                .FirstOrDefaultAsync(x => x.ContractId == project.ContractId, cancellationToken);

            if (contract == null)
            {
                return;
            }

            var proposal = await context.Proposals
                .FirstOrDefaultAsync(x => x.ProposalId == contract.ProposalId, cancellationToken);

            if (proposal == null)
            {
                return;
            }

            var job = await context.JobPostings
                .FirstOrDefaultAsync(x => x.JobPostingId == proposal.JobId, cancellationToken);

            var clientProfile = await context.ClientProfiles
                .FirstOrDefaultAsync(x => x.ClientProfileId == contract.ClientId, cancellationToken);

            var expertProfile = await context.ExpertProfiles
                .FirstOrDefaultAsync(x => x.ExpertProfileId == contract.ExpertId, cancellationToken);

            if (job == null || clientProfile == null || expertProfile == null)
            {
                return;
            }

            await rollbackService.ReopenJobAfterContractFailureAsync(
                contract,
                "ESCROW_TIMEOUT",
                now,
                cancellationToken);

            await context.SaveChangesAsync(cancellationToken);

            await notificationService.CreateNotificationAsync(
                clientProfile.UserId,
                "Escrow lock expired",
                $"You did not lock escrow for project '{project.Title}' before the deadline. The contract was cancelled before escrow.",
                "ESCROW_LOCK_EXPIRED",
                relatedEntityType: "PROJECT",
                relatedEntityId: project.ProjectId,
                relatedJobId: job.JobPostingId,
                relatedProposalId: proposal.ProposalId,
                relatedContractId: contract.ContractId,
                relatedProjectId: project.ProjectId);

            await notificationService.CreateNotificationAsync(
                expertProfile.UserId,
                "Project cancelled before escrow",
                $"Client did not lock escrow for project '{project.Title}' before the deadline. You do not need to start work.",
                "ESCROW_LOCK_EXPIRED",
                relatedEntityType: "PROJECT",
                relatedEntityId: project.ProjectId,
                relatedJobId: job.JobPostingId,
                relatedProposalId: proposal.ProposalId,
                relatedContractId: contract.ContractId,
                relatedProjectId: project.ProjectId);
        }
    }
}