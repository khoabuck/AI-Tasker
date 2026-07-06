using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Contracts;

public class ContractFailureRollbackService : IContractFailureRollbackService
{
    private const string ContractStatusCancelled = "CANCELLED";
    private const string ProjectStatusPendingEscrow = "PENDING_ESCROW";
    private const string ProjectStatusCancelled = "CANCELLED";
    private const string JobStatusOpen = "OPEN";
    private const string ProposalStatusAccepted = "ACCEPTED";
    private const string ProposalStatusRejected = "REJECTED";
    private const string ProposalStatusSubmitted = "SUBMITTED";
    private const string PaymentStatusPending = "PENDING";
    private const string MilestoneStatusResolved = "RESOLVED";
    private const string ConversationStatusActive = "ACTIVE";
    private const string MessageTypeSystem = "SYSTEM";

    private readonly AITaskerDbContext _context;

    public ContractFailureRollbackService(AITaskerDbContext context)
    {
        _context = context;
    }

    public async Task ReopenJobAfterContractFailureAsync(
        ProjectContract contract,
        string failureReason,
        DateTime now,
        CancellationToken cancellationToken = default)
    {
        var proposal = await _context.Proposals
            .FirstOrDefaultAsync(x => x.ProposalId == contract.ProposalId, cancellationToken);

        if (proposal == null)
        {
            throw new InvalidOperationException("Proposal not found for contract rollback.");
        }

        var job = await _context.JobPostings
            .FirstOrDefaultAsync(x => x.JobPostingId == proposal.JobId, cancellationToken);

        if (job == null)
        {
            throw new InvalidOperationException("Job posting not found for contract rollback.");
        }

        var project = await _context.Projects
            .FirstOrDefaultAsync(x => x.ContractId == contract.ContractId, cancellationToken);

        if (project != null &&
            !string.Equals(project.Status, ProjectStatusPendingEscrow, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Contract rollback can only reopen a job before project becomes ACTIVE.");
        }

        contract.Status = ContractStatusCancelled;
        contract.ClientConfirmed = false;
        contract.ExpertConfirmed = false;
        contract.ConfirmedAt = null;

        if (string.Equals(failureReason, "SIGN_TIMEOUT", StringComparison.OrdinalIgnoreCase))
        {
            contract.SignExpiredAt ??= now;
        }

        if (project != null)
        {
            project.Status = ProjectStatusCancelled;
            project.EndDate = now;


            var milestones = await _context.Milestones
                .Where(x => x.ProjectId == project.ProjectId)
                .ToListAsync(cancellationToken);

            foreach (var milestone in milestones)
            {
                if (milestone.PaymentStatus == PaymentStatusPending)
                {
                    milestone.Status = MilestoneStatusResolved;
                }
            }
        }

        job.Status = JobStatusOpen;
        job.UpdatedAt = now;

        if (string.Equals(proposal.Status, ProposalStatusAccepted, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(proposal.Status, ProposalStatusRejected, StringComparison.OrdinalIgnoreCase))
        {
            proposal.Status = ProposalStatusSubmitted;
        }

        var rejectedProposals = await _context.Proposals
            .Where(x =>
                x.JobId == job.JobPostingId &&
                x.ProposalId != proposal.ProposalId &&
                x.Status == ProposalStatusRejected)
            .ToListAsync(cancellationToken);

        foreach (var rejectedProposal in rejectedProposals)
        {
            rejectedProposal.Status = ProposalStatusSubmitted;
        }

        await AddConversationSystemMessagesAsync(
            job.JobPostingId,
            proposal.ProposalId,
            contract.ContractId,
            project?.ProjectId,
            BuildSystemMessage(failureReason, job.Title),
            now,
            cancellationToken);
    }

    private async Task AddConversationSystemMessagesAsync(
        int jobId,
        int proposalId,
        int contractId,
        int? projectId,
        string content,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var conversations = await _context.Conversations
            .Where(x =>
                x.Status == ConversationStatusActive &&
                (
                    x.RelatedContractId == contractId ||
                    x.RelatedProposalId == proposalId ||
                    (projectId.HasValue && x.RelatedProjectId == projectId.Value) ||
                    x.RelatedJobId == jobId
                ))
            .ToListAsync(cancellationToken);

        foreach (var conversation in conversations)
        {
            conversation.RelatedJobId ??= jobId;
            conversation.RelatedProposalId ??= proposalId;
            conversation.RelatedContractId ??= contractId;
            conversation.RelatedProjectId ??= projectId;
            conversation.LastMessageAt = now;

            _context.ConversationMessages.Add(new ConversationMessage
            {
                ConversationId = conversation.ConversationId,
                SenderUserId = conversation.CreatedByUserId,
                Content = content,
                MessageType = MessageTypeSystem,
                AttachmentUrl = null,
                CreatedAt = now
            });
        }
    }

    private static string BuildSystemMessage(string failureReason, string jobTitle)
    {
        return failureReason.Trim().ToUpperInvariant() switch
        {
            "SIGN_TIMEOUT" => $"Contract signing deadline expired for job '{jobTitle}'. The job has been reopened and proposal states were refreshed.",
            _ => $"Contract was cancelled before project start for job '{jobTitle}'. The job has been reopened and proposal states were refreshed."
        };
    }
}
