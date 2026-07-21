using AITasker.Application.Interfaces;
using AITasker.Domain.Constants;
using AITasker.Domain.Entities;
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
    private const string ProposalStatusRejected = "REJECTED";
    private const string ProposalStatusSubmitted = "SUBMITTED";
    private const string JobStatusOpen = "OPEN";

    private const string ClientSignTimeout = "CLIENT_SIGN_TIMEOUT";
    private const string ExpertSignTimeout = "EXPERT_SIGN_TIMEOUT";

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
        var workflowPolicyService = scope.ServiceProvider.GetRequiredService<IMarketplaceWorkflowPolicyService>();
        var workflowPolicy = await workflowPolicyService.GetActivePolicyAsync();
        var contractSignMissLimit = workflowPolicy.ContractSignMissLimit;
        var now = DateTime.UtcNow;

        var expiredContracts = await context.ProjectContracts
            .Where(contract =>
                contract.Status == ContractStatusDraft &&
                contract.SignExpiredAt == null &&
                (
                    (!contract.ClientConfirmed &&
                     (contract.ClientSignDeadlineAt ?? contract.SignDeadlineAt) != null &&
                     (contract.ClientSignDeadlineAt ?? contract.SignDeadlineAt) <= now)
                    ||
                    (contract.ClientConfirmed && !contract.ExpertConfirmed &&
                     contract.ExpertSignDeadlineAt != null &&
                     contract.ExpertSignDeadlineAt <= now)
                ))
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
                contractSignMissLimit,
                cancellationToken);
        }
    }

    private static async Task ProcessOneAsync(
        AITaskerDbContext context,
        INotificationService notificationService,
        ProjectContract contract,
        DateTime now,
        int contractSignMissLimit,
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

        var clientMissed = !contract.ClientConfirmed;
        var timeoutReason = clientMissed ? ClientSignTimeout : ExpertSignTimeout;

        contract.Status = ContractStatusCancelled;
        contract.SignExpiredAt = now;
        contract.SignDeadlineAt = null;
        contract.CancelledReason = timeoutReason;

        if (clientMissed)
        {
            proposal.ClientMissSignCount += 1;
        }
        else
        {
            proposal.ExpertMissSignCount += 1;
        }

        var missCount = clientMissed
            ? proposal.ClientMissSignCount
            : proposal.ExpertMissSignCount;
        var limitExceeded = missCount >= contractSignMissLimit;

        if (limitExceeded)
        {
            proposal.Status = ProposalStatusRejected;
            proposal.StatusReason = clientMissed
                ? ProposalStatusReasons.ClientSignTimeoutLimitExceeded
                : ProposalStatusReasons.ExpertSignTimeoutLimitExceeded;
            job.Status = JobStatusOpen;

            var autoRejectedProposals = await context.Proposals
                .Where(x =>
                    x.JobId == job.JobPostingId &&
                    x.ProposalId != proposal.ProposalId &&
                    x.Status == ProposalStatusRejected &&
                    x.StatusReason == ProposalStatusReasons.AutoNotSelected)
                .ToListAsync(cancellationToken);

            foreach (var otherProposal in autoRejectedProposals)
            {
                otherProposal.Status = ProposalStatusSubmitted;
                otherProposal.StatusReason = null;
            }
        }
        else
        {
            proposal.Status = ProposalStatusAccepted;
            proposal.StatusReason = ProposalStatusReasons.ClientAccepted;
        }

        job.UpdatedAt = now;
        await context.SaveChangesAsync(cancellationToken);

        var missedParty = clientMissed ? "Client" : "Expert";
        var message = limitExceeded
            ? $"{missedParty} missed the signing deadline {missCount} times for job '{job.Title}'. The accepted deal was ended and the job was reopened."
            : $"{missedParty} missed the signing deadline for job '{job.Title}'. The draft was cancelled, while the proposal remains accepted. A new draft may be created. Miss count: {missCount}/{contractSignMissLimit}.";

        await notificationService.CreateNotificationAsync(
            clientProfile.UserId,
            limitExceeded ? "Accepted deal ended" : "Contract signing expired",
            message,
            "CONTRACT_SIGN_EXPIRED",
            relatedEntityType: "CONTRACT",
            relatedEntityId: contract.ContractId,
            relatedJobId: job.JobPostingId,
            relatedProposalId: proposal.ProposalId,
            relatedContractId: contract.ContractId);

        await notificationService.CreateNotificationAsync(
            expertProfile.UserId,
            limitExceeded ? "Accepted deal ended" : "Contract signing expired",
            message,
            "CONTRACT_SIGN_EXPIRED",
            relatedEntityType: "CONTRACT",
            relatedEntityId: contract.ContractId,
            relatedJobId: job.JobPostingId,
            relatedProposalId: proposal.ProposalId,
            relatedContractId: contract.ContractId);
    }
}
