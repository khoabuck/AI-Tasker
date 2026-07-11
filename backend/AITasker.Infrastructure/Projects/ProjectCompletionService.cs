using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Projects;

public class ProjectCompletionService : IProjectCompletionService
{
    private const string JobStatusCompleted = "COMPLETED";

    private const string ProjectStatusPendingEscrow = "PENDING_ESCROW";
    private const string ProjectStatusActive = "ACTIVE";
    private const string ProjectStatusCompleted = "COMPLETED";
    private const string ProjectStatusCancelled = "CANCELLED";
    private const string ProjectStatusDisputed = "DISPUTED";

    private const string DisputeStatusOpen = "OPEN";
    private const string EscrowStatusLocked = "LOCKED";
    private const string EscrowStatusFrozen = "FROZEN";

    private const string MilestoneStatusApproved = "APPROVED";
    private const string MilestoneStatusResolved = "RESOLVED";
    private const string MilestoneStatusDisputeResolved = "DISPUTE_RESOLVED";
    private const string MilestoneStatusReleased = "RELEASED";
    private const string MilestoneStatusRefunded = "REFUNDED";

    private readonly AITaskerDbContext _context;
    private readonly IExpertEarningEscrowService _expertEarningEscrowService;
    private readonly INotificationService _notificationService;

    public ProjectCompletionService(
        AITaskerDbContext context,
        IExpertEarningEscrowService expertEarningEscrowService,
        INotificationService notificationService)
    {
        _context = context;
        _expertEarningEscrowService = expertEarningEscrowService;
        _notificationService = notificationService;
    }

    public async Task<bool> TryCompleteProjectAsync(
        int projectId,
        bool throwIfNotReady = false)
    {
        var project = await _context.Projects
            .FirstOrDefaultAsync(x => x.ProjectId == projectId);

        if (project == null)
        {
            throw new InvalidOperationException("Project not found.");
        }

        if (string.Equals(project.Status, ProjectStatusPendingEscrow, StringComparison.OrdinalIgnoreCase))
        {
            return NotReady(throwIfNotReady, "Project cannot be completed before escrow is locked.");
        }

        if (string.Equals(project.Status, ProjectStatusCancelled, StringComparison.OrdinalIgnoreCase))
        {
            return NotReady(throwIfNotReady, "Cancelled project cannot be completed.");
        }

        if (string.Equals(project.Status, ProjectStatusDisputed, StringComparison.OrdinalIgnoreCase))
        {
            var hasOpenDisputeWhileDisputed = await HasOpenDisputeAsync(project.ProjectId);

            if (hasOpenDisputeWhileDisputed)
            {
                return NotReady(throwIfNotReady, "Disputed project cannot be completed until dispute is resolved.");
            }
        }

        if (!string.Equals(project.Status, ProjectStatusActive, StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(project.Status, ProjectStatusCompleted, StringComparison.OrdinalIgnoreCase))
        {
            return NotReady(throwIfNotReady, "Project can only be completed when it is ACTIVE.");
        }

        if (project.EscrowLockedAt == null)
        {
            return NotReady(throwIfNotReady, "Project cannot be completed because escrow was not locked.");
        }


        if (await HasOpenDisputeAsync(project.ProjectId))
        {
            return NotReady(throwIfNotReady, "Project cannot be completed while an open dispute exists.");
        }

        var hasLockedOrFrozenEscrow = await _context.Escrows.AnyAsync(x =>
            x.ProjectId == project.ProjectId &&
            (
                x.Status == EscrowStatusLocked ||
                x.Status == EscrowStatusFrozen
            ));

        if (hasLockedOrFrozenEscrow)
        {
            return NotReady(throwIfNotReady, "Project cannot be completed while escrow is still locked or frozen.");
        }

        var milestones = await _context.Milestones
            .Where(x => x.ProjectId == project.ProjectId)
            .ToListAsync();

        if (!milestones.Any())
        {
            return NotReady(throwIfNotReady, "Project cannot be completed because it has no milestones.");
        }

        if (!milestones.All(IsMilestoneFinished))
        {
            return NotReady(throwIfNotReady, "Project still has unfinished milestones.");
        }

        var contract = await _context.ProjectContracts
            .FirstOrDefaultAsync(x => x.ContractId == project.ContractId);

        if (contract == null)
        {
            throw new InvalidOperationException("Contract not found.");
        }

        var proposal = await _context.Proposals
            .FirstOrDefaultAsync(x => x.ProposalId == contract.ProposalId);

        if (proposal == null)
        {
            throw new InvalidOperationException("Proposal not found.");
        }

        var job = await _context.JobPostings
            .FirstOrDefaultAsync(x => x.JobPostingId == proposal.JobId);

        if (job == null)
        {
            throw new InvalidOperationException("Job posting not found.");
        }

        var clientProfile = await _context.ClientProfiles
            .FirstOrDefaultAsync(x => x.ClientProfileId == contract.ClientId);

        var expertProfile = await _context.ExpertProfiles
            .FirstOrDefaultAsync(x => x.ExpertProfileId == contract.ExpertId);

        if (clientProfile == null || expertProfile == null)
        {
            throw new InvalidOperationException("Project participants not found.");
        }

        var wasCompleted = string.Equals(project.Status, ProjectStatusCompleted, StringComparison.OrdinalIgnoreCase);

        if (!wasCompleted)
        {
            project.Status = ProjectStatusCompleted;
            project.EndDate = DateTime.UtcNow;
            job.Status = JobStatusCompleted;
            job.UpdatedAt = DateTime.UtcNow;
        }

        await _expertEarningEscrowService.ReleaseProjectPendingEarningsAsync(
            project,
            expertProfile);

        await _context.SaveChangesAsync();

        if (!wasCompleted)
        {
            await _notificationService.CreateNotificationAsync(
                clientProfile.UserId,
                "Project completed",
                $"Project '{project.Title}' has been completed.",
                "PROJECT_COMPLETED",
                relatedEntityType: "PROJECT",
                relatedEntityId: project.ProjectId,
                relatedJobId: job.JobPostingId,
                relatedProposalId: proposal.ProposalId,
                relatedContractId: contract.ContractId,
                relatedProjectId: project.ProjectId);

            await _notificationService.CreateNotificationAsync(
                expertProfile.UserId,
                "Project completed",
                $"Project '{project.Title}' has been completed.",
                "PROJECT_COMPLETED",
                relatedEntityType: "PROJECT",
                relatedEntityId: project.ProjectId,
                relatedJobId: job.JobPostingId,
                relatedProposalId: proposal.ProposalId,
                relatedContractId: contract.ContractId,
                relatedProjectId: project.ProjectId);
        }

        return !wasCompleted;
    }

    private async Task<bool> HasOpenDisputeAsync(int projectId)
    {
        return await _context.Disputes.AnyAsync(x =>
            x.ProjectId == projectId &&
            x.Status == DisputeStatusOpen);
    }

    private static bool IsMilestoneFinished(Milestone milestone)
    {
        var status = milestone.Status?.Trim().ToUpperInvariant();

        return status == MilestoneStatusApproved ||
               status == MilestoneStatusResolved ||
               status == MilestoneStatusDisputeResolved ||
               status == MilestoneStatusReleased ||
               status == MilestoneStatusRefunded;
    }

    private static bool NotReady(bool throwIfNotReady, string message)
    {
        if (throwIfNotReady)
        {
            throw new InvalidOperationException(message);
        }

        return false;
    }
}
