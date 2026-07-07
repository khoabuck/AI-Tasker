using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Constants;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Services;

public class AdminJobService : IAdminJobService
{
    private const string StatusDraft = "DRAFT";
    private const string StatusOpen = "OPEN";
    private const string StatusActive = "ACTIVE";
    private const string StatusCompleted = "COMPLETED";
    private const string StatusDisputed = "DISPUTED";
    private const string StatusCancelled = "CANCELLED";

    private const string ProposalStatusDraft = "DRAFT";
    private const string ProposalStatusSubmitted = "SUBMITTED";
    private const string ProposalStatusAccepted = "ACCEPTED";
    private const string ProposalStatusRejected = "REJECTED";
    private const string ProposalStatusWithdrawn = "WITHDRAWN";

    private readonly AITaskerDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly IAdminAuditLogService _adminAuditLogService;

    public AdminJobService(
        AITaskerDbContext context,
        INotificationService notificationService,
        IAdminAuditLogService adminAuditLogService)
    {
        _context = context;
        _notificationService = notificationService;
        _adminAuditLogService = adminAuditLogService;
    }

    public async Task<List<AdminJobResponse>> GetJobsAsync(
        string? search,
        string? status,
        int? clientProfileId)
    {
        var query = _context.JobPostings
            .AsNoTracking()
            .Include(x => x.ClientProfile!)
                .ThenInclude(x => x.User)
            .Include(x => x.JobSkills)
                .ThenInclude(x => x.Skill)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var trimmedSearch = search.Trim();

            query = query.Where(x =>
                x.Title.Contains(trimmedSearch) ||
                x.Description.Contains(trimmedSearch) ||
                (
                    x.ClientProfile != null &&
                    x.ClientProfile.User != null &&
                    (
                        x.ClientProfile.User.FullName.Contains(trimmedSearch) ||
                        x.ClientProfile.User.Email.Contains(trimmedSearch)
                    )
                ));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = status.Trim().ToUpperInvariant();
            query = query.Where(x => x.Status == normalizedStatus);
        }

        if (clientProfileId.HasValue)
        {
            query = query.Where(x => x.ClientProfileId == clientProfileId.Value);
        }

        var jobs = await query
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();

        var proposalStats = await LoadProposalStatsAsync(
            jobs.Select(x => x.JobPostingId).ToList());

        return jobs
            .Select(job => MapJobToResponse(
                job,
                proposalStats.TryGetValue(job.JobPostingId, out var stats)
                    ? stats
                    : null))
            .ToList();
    }

    public async Task<AdminJobResponse?> GetJobByIdAsync(int jobPostingId)
    {
        var job = await _context.JobPostings
            .AsNoTracking()
            .Include(x => x.ClientProfile!)
                .ThenInclude(x => x.User)
            .Include(x => x.JobSkills)
                .ThenInclude(x => x.Skill)
            .FirstOrDefaultAsync(x => x.JobPostingId == jobPostingId);

        if (job == null)
        {
            return null;
        }

        var proposalStats = await LoadProposalStatsAsync(
            new List<int> { job.JobPostingId });

        return MapJobToResponse(
            job,
            proposalStats.TryGetValue(job.JobPostingId, out var stats)
                ? stats
                : null);
    }

    public async Task<IReadOnlyList<ProposalResponse>?> GetJobProposalsAsync(int jobPostingId)
    {
        var jobExists = await _context.JobPostings
            .AsNoTracking()
            .AnyAsync(x => x.JobPostingId == jobPostingId);

        if (!jobExists)
        {
            return null;
        }

        var proposals = await _context.Proposals
            .AsNoTracking()
            .Where(x =>
                x.JobId == jobPostingId &&
                x.Status != ProposalStatusDraft)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();

        var responses = new List<ProposalResponse>();

        foreach (var proposal in proposals)
        {
            responses.Add(await MapProposalToResponseAsync(proposal));
        }

        return responses;
    }

    public async Task<AdminJobResponse?> CancelJobAsync(
        int adminId,
        int jobPostingId,
        AdminCancelJobRequest request)
    {
        var reason = NormalizeCancelReason(request.Reason);

        var job = await _context.JobPostings
            .Include(x => x.ClientProfile!)
                .ThenInclude(x => x.User)
            .Include(x => x.JobSkills)
                .ThenInclude(x => x.Skill)
            .FirstOrDefaultAsync(x => x.JobPostingId == jobPostingId);

        if (job == null)
        {
            return null;
        }

        EnsureJobCanBeCancelledByAdmin(job);

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var oldStatus = job.Status;
        var now = DateTime.UtcNow;

        job.Status = StatusCancelled;
        job.UpdatedAt = now;

        var submittedProposals = await _context.Proposals
            .Include(x => x.ExpertProfile!)
                .ThenInclude(x => x.User)
            .Where(x =>
                x.JobId == jobPostingId &&
                x.Status == ProposalStatusSubmitted)
            .ToListAsync();

        foreach (var proposal in submittedProposals)
        {
            proposal.Status = ProposalStatusRejected;
        }

        await _context.SaveChangesAsync();

        await NotifyClientJobCancelledAsync(job, reason);
        await NotifyExpertsJobCancelledAsync(job, submittedProposals, reason);

        await _adminAuditLogService.LogAsync(
            adminId,
            "CANCEL_JOB",
            "JobPosting",
            job.JobPostingId,
            oldStatus,
            StatusCancelled,
            reason);

        await transaction.CommitAsync();

        return await GetJobByIdAsync(job.JobPostingId)
            ?? throw new InvalidOperationException("Failed to load cancelled job.");
    }

    private static string NormalizeCancelReason(string? reason)
    {
        if (string.IsNullOrWhiteSpace(reason))
        {
            throw new InvalidOperationException("Cancel reason is required.");
        }

        var trimmedReason = reason.Trim();

        if (trimmedReason.Length > 500)
        {
            throw new InvalidOperationException("Cancel reason must not exceed 500 characters.");
        }

        return trimmedReason;
    }

    private static void EnsureJobCanBeCancelledByAdmin(JobPosting job)
    {
        var normalizedStatus = job.Status.Trim().ToUpperInvariant();

        if (normalizedStatus == StatusCancelled)
        {
            throw new InvalidOperationException("Job is already cancelled.");
        }

        if (normalizedStatus is StatusActive or StatusCompleted or StatusDisputed)
        {
            throw new InvalidOperationException(
                "This job is already linked to an active workflow and cannot be cancelled by Admin Job API.");
        }

        if (normalizedStatus is not (StatusDraft or StatusOpen))
        {
            throw new InvalidOperationException("Only draft or open jobs can be cancelled by admin.");
        }
    }

    private async Task NotifyClientJobCancelledAsync(
        JobPosting job,
        string reason)
    {
        if (job.ClientProfile == null)
        {
            return;
        }

        await _notificationService.CreateNotificationAsync(
            job.ClientProfile.UserId,
            "Job cancelled by admin",
            $"Your job \"{job.Title}\" has been cancelled by admin. Reason: {reason}",
            NotificationTypes.JobCancelledByAdmin,
            relatedEntityType: "JOB",
            relatedEntityId: job.JobPostingId,
            relatedJobId: job.JobPostingId);
    }

    private async Task NotifyExpertsJobCancelledAsync(
        JobPosting job,
        List<Proposal> submittedProposals,
        string reason)
    {
        var expertUserIds = submittedProposals
            .Select(x => x.ExpertProfile?.UserId)
            .Where(x => x.HasValue)
            .Select(x => x!.Value)
            .Distinct()
            .ToList();

        foreach (var expertUserId in expertUserIds)
        {
            await _notificationService.CreateNotificationAsync(
                expertUserId,
                "Job cancelled by admin",
                $"The job \"{job.Title}\" that you submitted a proposal to has been cancelled by admin. Reason: {reason}",
                NotificationTypes.JobCancelledForExpert,
                relatedEntityType: "JOB",
                relatedEntityId: job.JobPostingId,
                relatedJobId: job.JobPostingId);
        }
    }

    private async Task<Dictionary<int, ProposalStats>> LoadProposalStatsAsync(
        List<int> jobPostingIds)
    {
        if (jobPostingIds.Count == 0)
        {
            return new Dictionary<int, ProposalStats>();
        }

        var stats = await _context.Proposals
            .AsNoTracking()
            .Where(x => jobPostingIds.Contains(x.JobId))
            .GroupBy(x => x.JobId)
            .Select(group => new ProposalStats
            {
                JobId = group.Key,
                ProposalCount = group.Count(x => x.Status != ProposalStatusDraft),
                SubmittedProposalCount = group.Count(x => x.Status == ProposalStatusSubmitted),
                AcceptedProposalCount = group.Count(x => x.Status == ProposalStatusAccepted),
                RejectedProposalCount = group.Count(x => x.Status == ProposalStatusRejected),
                WithdrawnProposalCount = group.Count(x => x.Status == ProposalStatusWithdrawn)
            })
            .ToListAsync();

        return stats.ToDictionary(x => x.JobId);
    }

    private static AdminJobResponse MapJobToResponse(
        JobPosting job,
        ProposalStats? proposalStats)
    {
        var clientProfile = job.ClientProfile;
        var clientUser = clientProfile?.User;

        return new AdminJobResponse
        {
            JobPostingId = job.JobPostingId,
            ClientProfileId = job.ClientProfileId,
            ClientUserId = clientProfile?.UserId ?? 0,
            ClientName = clientUser?.FullName ?? string.Empty,
            ClientEmail = clientUser?.Email ?? string.Empty,
            ClientType = clientProfile?.ClientType ?? string.Empty,

            Title = job.Title,
            Description = job.Description,
            AiGeneratedDescription = job.AiGeneratedDescription,
            BudgetMin = job.BudgetMin,
            BudgetMax = job.BudgetMax,
            Deadline = job.Deadline,
            ProjectType = job.ProjectType,
            Complexity = job.Complexity,
            ExpectedDeliverables = job.ExpectedDeliverables,
            Status = job.Status,
            IsAiAssisted = job.IsAiAssisted,
            PostingChargeType = job.PostingChargeType,
            PublishedAt = job.PublishedAt,
            CreatedAt = job.CreatedAt,
            UpdatedAt = job.UpdatedAt,

            ProposalCount = proposalStats?.ProposalCount ?? 0,
            SubmittedProposalCount = proposalStats?.SubmittedProposalCount ?? 0,
            AcceptedProposalCount = proposalStats?.AcceptedProposalCount ?? 0,
            RejectedProposalCount = proposalStats?.RejectedProposalCount ?? 0,
            WithdrawnProposalCount = proposalStats?.WithdrawnProposalCount ?? 0,

            Skills = job.JobSkills
                .OrderBy(x => x.Skill != null ? x.Skill.SkillName : string.Empty)
                .Select(x => new JobSkillResponse
                {
                    SkillId = x.SkillId,
                    SkillName = x.Skill?.SkillName ?? string.Empty,
                    Category = x.Skill?.Category
                })
                .ToList()
        };
    }

    private async Task<ProposalResponse> MapProposalToResponseAsync(Proposal proposal)
    {
        var job = await _context.JobPostings
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.JobPostingId == proposal.JobId);

        if (job == null)
        {
            throw new InvalidOperationException("Job posting not found.");
        }

        var clientProfile = await _context.ClientProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ClientProfileId == job.ClientProfileId);

        if (clientProfile == null)
        {
            throw new InvalidOperationException("Client profile not found.");
        }

        var clientUser = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == clientProfile.UserId);

        if (clientUser == null)
        {
            throw new InvalidOperationException("Client user not found.");
        }

        var expertProfile = await _context.ExpertProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ExpertProfileId == proposal.ExpertId);

        if (expertProfile == null)
        {
            throw new InvalidOperationException("Expert profile not found.");
        }

        var expertUser = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == expertProfile.UserId);

        if (expertUser == null)
        {
            throw new InvalidOperationException("Expert user not found.");
        }

        var contractId = await _context.ProjectContracts
            .AsNoTracking()
            .Where(x => x.ProposalId == proposal.ProposalId)
            .Select(x => (int?)x.ContractId)
            .FirstOrDefaultAsync();

        var versions = await _context.ProposalVersions
            .AsNoTracking()
            .Where(x => x.ProposalId == proposal.ProposalId)
            .OrderByDescending(x => x.VersionNumber)
            .ToListAsync();

        var totalVersions = versions.Count == 0 ? 1 : versions.Count;
        var latestVersionNumber = versions.Count == 0 ? 1 : versions[0].VersionNumber;
        var latestVersion = versions.Count == 0
            ? null
            : await MapProposalVersionResponseAsync(versions[0]);

        var lastResubmittedAt = versions
            .Where(x => x.VersionNumber > 1)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => (DateTime?)x.CreatedAt)
            .FirstOrDefault();

        var milestoneDrafts = await _context.ProposalMilestoneDrafts
            .AsNoTracking()
            .Where(x => x.ProposalId == proposal.ProposalId)
            .OrderBy(x => x.OrderIndex)
            .ToListAsync();

        return new ProposalResponse
        {
            ProposalId = proposal.ProposalId,
            JobId = proposal.JobId,
            JobTitle = job.Title,

            ClientProfileId = clientProfile.ClientProfileId,
            ClientUserId = clientProfile.UserId,
            ClientName = clientUser.FullName,

            ExpertProfileId = expertProfile.ExpertProfileId,
            ExpertUserId = expertProfile.UserId,
            ExpertName = expertUser.FullName,

            CoverLetter = proposal.CoverLetter,
            ProposedPrice = proposal.ProposedPrice,
            ProposedTimelineDays = proposal.ProposedTimelineDays,
            ExpectedOutputs = proposal.ExpectedOutputs,
            WorkingApproach = proposal.WorkingApproach,
            PreliminaryMilestonePlan = proposal.PreliminaryMilestonePlan,
            Milestones = MapProposalMilestoneDraftResponses(milestoneDrafts),

            Status = proposal.Status,
            ContractId = contractId,

            LatestVersionNumber = latestVersionNumber,
            TotalVersions = totalVersions,
            LastResubmittedAt = lastResubmittedAt,
            ResubmitLimit = 0,
            ResubmitWindowHours = 0,
            RemainingResubmitsInWindow = int.MaxValue,
            LatestVersion = latestVersion,

            CreatedAt = proposal.CreatedAt
        };
    }

    private async Task<ProposalVersionResponse> MapProposalVersionResponseAsync(
        ProposalVersion version)
    {
        var createdBy = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == version.CreatedByUserId);

        return new ProposalVersionResponse
        {
            ProposalVersionId = version.ProposalVersionId,
            ProposalId = version.ProposalId,
            VersionNumber = version.VersionNumber,
            CoverLetter = version.CoverLetter,
            ProposedPrice = version.ProposedPrice,
            ProposedTimelineDays = version.ProposedTimelineDays,
            ExpectedOutputs = version.ExpectedOutputs,
            WorkingApproach = version.WorkingApproach,
            PreliminaryMilestonePlan = version.PreliminaryMilestonePlan,
            MilestonePlanJson = version.MilestonePlanJson,
            ResubmitNote = version.ResubmitNote,
            CreatedByUserId = version.CreatedByUserId,
            CreatedByName = createdBy?.FullName ?? string.Empty,
            CreatedAt = version.CreatedAt
        };
    }

    private static List<ProposalMilestoneDraftResponse> MapProposalMilestoneDraftResponses(
        List<ProposalMilestoneDraft> drafts)
    {
        var result = new List<ProposalMilestoneDraftResponse>();
        var previousDeadlineOffsetDays = 0;

        foreach (var draft in drafts.OrderBy(x => x.OrderIndex))
        {
            var durationDays = draft.DeadlineOffsetDays - previousDeadlineOffsetDays;

            result.Add(new ProposalMilestoneDraftResponse
            {
                ProposalMilestoneDraftId = draft.ProposalMilestoneDraftId,
                ProposalId = draft.ProposalId,
                Title = draft.Title,
                Amount = draft.Amount,
                DurationDays = durationDays <= 0 ? draft.DeadlineOffsetDays : durationDays,
                CreatedAt = draft.CreatedAt
            });

            previousDeadlineOffsetDays = draft.DeadlineOffsetDays;
        }

        return result;
    }

    private sealed class ProposalStats
    {
        public int JobId { get; set; }

        public int ProposalCount { get; set; }

        public int SubmittedProposalCount { get; set; }

        public int AcceptedProposalCount { get; set; }

        public int RejectedProposalCount { get; set; }

        public int WithdrawnProposalCount { get; set; }
    }
}
