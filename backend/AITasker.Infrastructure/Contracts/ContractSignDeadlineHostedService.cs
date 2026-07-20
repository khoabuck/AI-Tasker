using AITasker.Application.Interfaces;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AITasker.Infrastructure.Contracts;

public class ContractSignDeadlineHostedService : BackgroundService
{
    private const string ContractStatusDraft = "DRAFT";
    private const string ContractStatusCancelled = "CANCELLED";
    private const string ProposalStatusAccepted = "ACCEPTED";

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
        var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

        var now = DateTime.UtcNow;

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
                notificationService,
                contract,
                now,
                cancellationToken);
        }
    }

    private static async Task ProcessOneAsync(
        AITaskerDbContext context,
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

        contract.Status = ContractStatusCancelled;
        contract.ClientConfirmed = false;
        contract.ExpertConfirmed = false;
        contract.ConfirmedAt = null;
        contract.SignExpiredAt = now;

        proposal.Status = ProposalStatusAccepted;
        job.UpdatedAt = now;

        await context.SaveChangesAsync(cancellationToken);

        await notificationService.CreateNotificationAsync(
            clientProfile.UserId,
            "Contract signing expired",
            $"The contract signing deadline for job '{job.Title}' expired. The accepted proposal remains selected, and the client can create a new contract draft later.",
            "CONTRACT_SIGN_EXPIRED",
            relatedEntityType: "CONTRACT",
            relatedEntityId: contract.ContractId,
            relatedJobId: job.JobPostingId,
            relatedProposalId: proposal.ProposalId,
            relatedContractId: contract.ContractId);

        await notificationService.CreateNotificationAsync(
            expertProfile.UserId,
            "Contract signing expired",
            $"The contract signing deadline for job '{job.Title}' expired. The accepted proposal remains selected, and a new contract draft can be created later.",
            "CONTRACT_SIGN_EXPIRED",
            relatedEntityType: "CONTRACT",
            relatedEntityId: contract.ContractId,
            relatedJobId: job.JobPostingId,
            relatedProposalId: proposal.ProposalId,
            relatedContractId: contract.ContractId);
    }
}
