using AITasker.Application.Interfaces;
using AITasker.Infrastructure.Data;
using AITasker.Infrastructure.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AITasker.Infrastructure.Contracts;

public class ContractSignDeadlineHostedService : BackgroundService
{
    private const string ContractStatusDraft = "DRAFT";

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ContractSignDeadlineHostedService> _logger;

    public ContractSignDeadlineHostedService(
        IServiceScopeFactory scopeFactory,
        ILogger<ContractSignDeadlineHostedService> logger)
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
                _logger.LogError(ex, "Error while processing contract signing deadlines.");
            }

            await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
        }
    }

    private async Task ProcessAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();

        var context = scope.ServiceProvider.GetRequiredService<AITaskerDbContext>();
        var rollbackService = scope.ServiceProvider.GetRequiredService<IContractFailureRollbackService>();
        var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

        var now = VietnamDateTime.Now;

        var expiredContracts = await context.ProjectContracts
            .Where(contract =>
                contract.Status == ContractStatusDraft &&
                contract.SignDeadlineAt != null &&
                contract.SignDeadlineAt <= now &&
                contract.SignExpiredAt == null)
            .OrderBy(contract => contract.SignDeadlineAt)
            .Take(20)
            .ToListAsync(cancellationToken);

        foreach (var contract in expiredContracts)
        {
            await ProcessOneAsync(
                context,
                rollbackService,
                notificationService,
                contract,
                now,
                cancellationToken);
        }
    }

    private static async Task ProcessOneAsync(
        AITaskerDbContext context,
        IContractFailureRollbackService rollbackService,
        INotificationService notificationService,
        Domain.Entities.ProjectContract contract,
        DateTime now,
        CancellationToken cancellationToken)
    {
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
            "SIGN_TIMEOUT",
            now,
            cancellationToken);

        await context.SaveChangesAsync(cancellationToken);

        await notificationService.CreateNotificationAsync(
            clientProfile.UserId,
            "Contract signing expired",
            $"The contract signing deadline for job '{job.Title}' expired. The job has been reopened and proposal states were refreshed.",
            "CONTRACT_SIGN_EXPIRED",
            relatedEntityType: "CONTRACT",
            relatedEntityId: contract.ContractId,
            relatedJobId: job.JobPostingId,
            relatedProposalId: proposal.ProposalId,
            relatedContractId: contract.ContractId);

        await notificationService.CreateNotificationAsync(
            expertProfile.UserId,
            "Contract signing expired",
            $"The contract signing deadline for job '{job.Title}' expired. The job has been reopened and proposal states were refreshed.",
            "CONTRACT_SIGN_EXPIRED",
            relatedEntityType: "CONTRACT",
            relatedEntityId: contract.ContractId,
            relatedJobId: job.JobPostingId,
            relatedProposalId: proposal.ProposalId,
            relatedContractId: contract.ContractId);
    }
}
