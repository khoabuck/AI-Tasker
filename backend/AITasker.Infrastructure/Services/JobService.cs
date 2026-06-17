using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Services;

public class JobService : IJobService
{
    private const string StatusDraft = "DRAFT";
    private const string StatusOpen = "OPEN";
    private const string StatusActive = "ACTIVE";
    private const string StatusCompleted = "COMPLETED";
    private const string StatusDisputed = "DISPUTED";
    private const string StatusCancelled = "CANCELLED";

    private const string UserStatusActive = "ACTIVE";
    private const string ClientTypeBusiness = "BUSINESS";
    private const string BusinessVerificationVerified = "VERIFIED";

    private readonly AITaskerDbContext _context;

    public JobService(AITaskerDbContext context)
    {
        _context = context;
    }

    public async Task<JobResponse> CreateDraftAsync(int userId, CreateJobRequest request)
    {
        var clientProfile = await GetEligibleClientProfileForJobAsync(userId);

        ValidateJobRequest(request, requireSkill: false);

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var job = new JobPosting
        {
            ClientProfileId = clientProfile.ClientProfileId,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            AiGeneratedDescription = string.IsNullOrWhiteSpace(request.AiGeneratedDescription)
                ? null
                : request.AiGeneratedDescription.Trim(),
            BudgetMin = request.BudgetMin,
            BudgetMax = request.BudgetMax,
            Deadline = request.Deadline,
            ProjectType = request.ProjectType.Trim(),
            Complexity = NormalizeComplexity(request.Complexity),
            ExpectedDeliverables = request.ExpectedDeliverables.Trim(),
            Status = StatusDraft,
            IsAiAssisted = request.IsAiAssisted,
            CreatedAt = DateTime.UtcNow
        };

        _context.JobPostings.Add(job);
        await _context.SaveChangesAsync();

        await ReplaceJobSkillsAsync(job.JobPostingId, request.SkillIds);

        await transaction.CommitAsync();

        return await GetJobResponseByIdAsync(job.JobPostingId)
            ?? throw new InvalidOperationException("Failed to create job draft.");
    }

    public async Task<JobResponse> SubmitJobAsync(int userId, CreateJobRequest request)
    {
        var clientProfile = await GetEligibleClientProfileForJobAsync(userId);

        ValidateJobRequest(request, requireSkill: true);

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var job = new JobPosting
        {
            ClientProfileId = clientProfile.ClientProfileId,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            AiGeneratedDescription = string.IsNullOrWhiteSpace(request.AiGeneratedDescription)
                ? null
                : request.AiGeneratedDescription.Trim(),
            BudgetMin = request.BudgetMin,
            BudgetMax = request.BudgetMax,
            Deadline = request.Deadline,
            ProjectType = request.ProjectType.Trim(),
            Complexity = NormalizeComplexity(request.Complexity),
            ExpectedDeliverables = request.ExpectedDeliverables.Trim(),
            Status = StatusOpen,
            IsAiAssisted = request.IsAiAssisted,
            CreatedAt = DateTime.UtcNow
        };

        _context.JobPostings.Add(job);
        await _context.SaveChangesAsync();

        await ReplaceJobSkillsAsync(job.JobPostingId, request.SkillIds);

        await transaction.CommitAsync();

        return await GetJobResponseByIdAsync(job.JobPostingId)
            ?? throw new InvalidOperationException("Failed to submit job.");
    }

    public async Task<JobResponse?> SubmitDraftAsync(int userId, int jobPostingId)
    {
        var clientProfile = await GetEligibleClientProfileForJobAsync(userId);

        var job = await _context.JobPostings
            .Include(x => x.JobSkills)
            .FirstOrDefaultAsync(x =>
                x.JobPostingId == jobPostingId &&
                x.ClientProfileId == clientProfile.ClientProfileId
            );

        if (job == null)
        {
            return null;
        }

        if (job.Status != StatusDraft)
        {
            throw new InvalidOperationException("Only draft jobs can be submitted.");
        }

        ValidateDraftBeforeSubmit(job);

        await EnsureJobSkillsAreStillActiveAsync(job.JobPostingId);

        job.Status = StatusOpen;
        job.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetJobResponseByIdAsync(job.JobPostingId);
    }

    public async Task<List<JobResponse>> GetOpenJobsAsync(string? keyword, int? skillId)
    {
        var query = _context.JobPostings
            .AsNoTracking()
            .Include(x => x.ClientProfile!)
                .ThenInclude(x => x.User)
            .Include(x => x.ClientProfile!)
                .ThenInclude(x => x.BusinessProfile)
            .Include(x => x.JobSkills)
                .ThenInclude(x => x.Skill)
            .Where(x =>
                x.Status == StatusOpen &&
                x.ClientProfile != null &&
                x.ClientProfile.User != null &&
                x.ClientProfile.User.Status == UserStatusActive &&
                (
                    x.ClientProfile.ClientType != ClientTypeBusiness ||
                    (
                        x.ClientProfile.BusinessProfile != null &&
                        x.ClientProfile.BusinessProfile.VerificationStatus == BusinessVerificationVerified
                    )
                )
            )
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var trimmedKeyword = keyword.Trim();

            query = query.Where(x =>
                x.Title.Contains(trimmedKeyword) ||
                x.Description.Contains(trimmedKeyword)
            );
        }

        if (skillId.HasValue)
        {
            query = query.Where(x =>
                x.JobSkills.Any(js => js.SkillId == skillId.Value)
            );
        }

        var jobs = await query
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();

        return jobs.Select(ToResponse).ToList();
    }

    public async Task<List<JobResponse>> GetMyJobsAsync(int userId)
    {
        var clientProfile = await _context.ClientProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId);

        if (clientProfile == null)
        {
            return new List<JobResponse>();
        }

        var jobs = await _context.JobPostings
            .AsNoTracking()
            .Include(x => x.JobSkills)
                .ThenInclude(x => x.Skill)
            .Where(x => x.ClientProfileId == clientProfile.ClientProfileId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();

        return jobs.Select(ToResponse).ToList();
    }

    public async Task<JobResponse?> GetJobByIdAsync(
        int jobPostingId,
        int? userId,
        string? role)
    {
        var job = await _context.JobPostings
            .AsNoTracking()
            .Include(x => x.ClientProfile!)
                .ThenInclude(x => x.User)
            .Include(x => x.ClientProfile!)
                .ThenInclude(x => x.BusinessProfile)
            .Include(x => x.JobSkills)
                .ThenInclude(x => x.Skill)
            .FirstOrDefaultAsync(x => x.JobPostingId == jobPostingId);

        if (job == null)
        {
            return null;
        }

        if (!CanViewJob(job, userId, role))
        {
            return null;
        }

        return ToResponse(job);
    }

    public async Task<JobResponse?> UpdateJobAsync(
        int userId,
        int jobPostingId,
        UpdateJobRequest request)
    {
        var clientProfile = await GetEligibleClientProfileForJobAsync(userId);

        var job = await _context.JobPostings
            .FirstOrDefaultAsync(x =>
                x.JobPostingId == jobPostingId &&
                x.ClientProfileId == clientProfile.ClientProfileId
            );

        if (job == null)
        {
            return null;
        }

        if (job.Status is not (StatusDraft or StatusOpen))
        {
            throw new InvalidOperationException("Only draft or open jobs can be updated.");
        }

        ValidateUpdateJobRequest(request, requireSkill: job.Status == StatusOpen);

        await using var transaction = await _context.Database.BeginTransactionAsync();

        job.Title = request.Title.Trim();
        job.Description = request.Description.Trim();
        job.AiGeneratedDescription = string.IsNullOrWhiteSpace(request.AiGeneratedDescription)
            ? null
            : request.AiGeneratedDescription.Trim();
        job.BudgetMin = request.BudgetMin;
        job.BudgetMax = request.BudgetMax;
        job.Deadline = request.Deadline;
        job.ProjectType = request.ProjectType.Trim();
        job.Complexity = NormalizeComplexity(request.Complexity);
        job.ExpectedDeliverables = request.ExpectedDeliverables.Trim();
        job.IsAiAssisted = request.IsAiAssisted;
        job.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await ReplaceJobSkillsAsync(job.JobPostingId, request.SkillIds);

        await transaction.CommitAsync();

        return await GetJobResponseByIdAsync(job.JobPostingId);
    }

    public async Task<bool> CancelJobAsync(int userId, int jobPostingId)
    {
        var clientProfile = await GetEligibleClientProfileForJobAsync(userId);

        var job = await _context.JobPostings
            .FirstOrDefaultAsync(x =>
                x.JobPostingId == jobPostingId &&
                x.ClientProfileId == clientProfile.ClientProfileId
            );

        if (job == null)
        {
            return false;
        }

        if (job.Status is not (StatusDraft or StatusOpen))
        {
            throw new InvalidOperationException("Only draft or open jobs can be cancelled.");
        }

        job.Status = StatusCancelled;
        job.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }

    private async Task<ClientProfile> GetEligibleClientProfileForJobAsync(int userId)
    {
        var clientProfile = await _context.ClientProfiles
            .Include(x => x.User)
            .Include(x => x.BusinessProfile)
            .FirstOrDefaultAsync(x => x.UserId == userId);

        if (clientProfile == null)
        {
            throw new InvalidOperationException("Client profile not found.");
        }

        if (clientProfile.User == null ||
            clientProfile.User.Status != UserStatusActive)
        {
            throw new InvalidOperationException("Your account must be active before posting jobs.");
        }

        var clientType = clientProfile.ClientType.Trim().ToUpperInvariant();

        if (clientType == ClientTypeBusiness)
        {
            if (clientProfile.BusinessProfile == null)
            {
                throw new InvalidOperationException("Business profile not found.");
            }

            if (clientProfile.BusinessProfile.VerificationStatus != BusinessVerificationVerified)
            {
                throw new InvalidOperationException("Business profile must be verified before posting jobs.");
            }
        }

        return clientProfile;
    }

    private static bool IsClientEligibleForPublicJob(ClientProfile clientProfile)
    {
        if (clientProfile.User == null ||
            clientProfile.User.Status != UserStatusActive)
        {
            return false;
        }

        var clientType = clientProfile.ClientType.Trim().ToUpperInvariant();

        if (clientType != ClientTypeBusiness)
        {
            return true;
        }

        return clientProfile.BusinessProfile != null &&
               clientProfile.BusinessProfile.VerificationStatus == BusinessVerificationVerified;
    }

    private async Task EnsureJobSkillsAreStillActiveAsync(int jobPostingId)
    {
        var hasInactiveSkill = await _context.JobSkills
            .AnyAsync(x =>
                x.JobPostingId == jobPostingId &&
                (x.Skill == null || !x.Skill.IsActive)
            );

        if (hasInactiveSkill)
        {
            throw new InvalidOperationException(
                "One or more job skills are inactive. Please update job skills before submitting."
            );
        }
    }

    private async Task ReplaceJobSkillsAsync(int jobPostingId, List<int>? skillIds)
    {
        var oldSkills = await _context.JobSkills
            .Where(x => x.JobPostingId == jobPostingId)
            .ToListAsync();

        _context.JobSkills.RemoveRange(oldSkills);

        var distinctSkillIds = (skillIds ?? new List<int>())
            .Distinct()
            .ToList();

        if (distinctSkillIds.Count > 0)
        {
            var existingSkillIds = await _context.Skills
                .Where(x =>
                    distinctSkillIds.Contains(x.SkillId) &&
                    x.IsActive
                )
                .Select(x => x.SkillId)
                .ToListAsync();

            if (existingSkillIds.Count != distinctSkillIds.Count)
            {
                throw new InvalidOperationException("One or more skills are invalid or inactive.");
            }

            var jobSkills = existingSkillIds.Select(skillId => new JobSkill
            {
                JobPostingId = jobPostingId,
                SkillId = skillId,
                IsRequired = true
            });

            _context.JobSkills.AddRange(jobSkills);
        }

        await _context.SaveChangesAsync();
    }

    private async Task<JobResponse?> GetJobResponseByIdAsync(int jobPostingId)
    {
        var job = await _context.JobPostings
            .AsNoTracking()
            .Include(x => x.JobSkills)
                .ThenInclude(x => x.Skill)
            .FirstOrDefaultAsync(x => x.JobPostingId == jobPostingId);

        return job == null ? null : ToResponse(job);
    }

    private static JobResponse ToResponse(JobPosting job)
    {
        return new JobResponse
        {
            JobPostingId = job.JobPostingId,
            ClientProfileId = job.ClientProfileId,
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
            CreatedAt = job.CreatedAt,
            UpdatedAt = job.UpdatedAt,
            Skills = job.JobSkills.Select(js => new JobSkillResponse
            {
                SkillId = js.SkillId,
                SkillName = js.Skill != null ? js.Skill.SkillName : string.Empty,
                Category = js.Skill?.Category
            }).ToList()
        };
    }

    private static bool CanViewJob(JobPosting job, int? userId, string? role)
    {
        var normalizedRole = role?.Trim().ToUpperInvariant();

        if (normalizedRole == "ADMIN")
        {
            return true;
        }

        if (normalizedRole == "CLIENT" &&
            userId.HasValue &&
            job.ClientProfile != null &&
            job.ClientProfile.UserId == userId.Value)
        {
            return true;
        }

        if (job.Status == StatusOpen &&
            job.ClientProfile != null &&
            IsClientEligibleForPublicJob(job.ClientProfile))
        {
            return true;
        }

        return false;
    }

    private static void ValidateJobRequest(CreateJobRequest request, bool requireSkill)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            throw new InvalidOperationException("Job title is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Description))
        {
            throw new InvalidOperationException("Job description is required.");
        }

        if (request.BudgetMin < 0 || request.BudgetMax < request.BudgetMin)
        {
            throw new InvalidOperationException("Invalid budget range.");
        }

        if (request.Deadline <= DateTime.UtcNow)
        {
            throw new InvalidOperationException("Deadline must be in the future.");
        }

        if (string.IsNullOrWhiteSpace(request.ProjectType))
        {
            throw new InvalidOperationException("Project type is required.");
        }

        if (string.IsNullOrWhiteSpace(request.ExpectedDeliverables))
        {
            throw new InvalidOperationException("Expected deliverables are required.");
        }

        if (requireSkill && (request.SkillIds == null || request.SkillIds.Count == 0))
        {
            throw new InvalidOperationException("At least one skill is required.");
        }
    }

    private static void ValidateUpdateJobRequest(UpdateJobRequest request, bool requireSkill)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            throw new InvalidOperationException("Job title is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Description))
        {
            throw new InvalidOperationException("Job description is required.");
        }

        if (request.BudgetMin < 0 || request.BudgetMax < request.BudgetMin)
        {
            throw new InvalidOperationException("Invalid budget range.");
        }

        if (request.Deadline <= DateTime.UtcNow)
        {
            throw new InvalidOperationException("Deadline must be in the future.");
        }

        if (string.IsNullOrWhiteSpace(request.ProjectType))
        {
            throw new InvalidOperationException("Project type is required.");
        }

        if (string.IsNullOrWhiteSpace(request.ExpectedDeliverables))
        {
            throw new InvalidOperationException("Expected deliverables are required.");
        }

        if (requireSkill && (request.SkillIds == null || request.SkillIds.Count == 0))
        {
            throw new InvalidOperationException("At least one skill is required.");
        }
    }

    private static void ValidateDraftBeforeSubmit(JobPosting job)
    {
        if (string.IsNullOrWhiteSpace(job.Title))
        {
            throw new InvalidOperationException("Job title is required.");
        }

        if (string.IsNullOrWhiteSpace(job.Description))
        {
            throw new InvalidOperationException("Job description is required.");
        }

        if (job.BudgetMin < 0 || job.BudgetMax < job.BudgetMin)
        {
            throw new InvalidOperationException("Invalid budget range.");
        }

        if (job.Deadline <= DateTime.UtcNow)
        {
            throw new InvalidOperationException("Deadline must be in the future.");
        }

        if (string.IsNullOrWhiteSpace(job.ProjectType))
        {
            throw new InvalidOperationException("Project type is required.");
        }

        if (string.IsNullOrWhiteSpace(job.ExpectedDeliverables))
        {
            throw new InvalidOperationException("Expected deliverables are required.");
        }

        if (job.JobSkills.Count == 0)
        {
            throw new InvalidOperationException("At least one skill is required.");
        }
    }

    private static string NormalizeComplexity(string? complexity)
    {
        if (string.IsNullOrWhiteSpace(complexity))
        {
            return "UNKNOWN";
        }

        var normalized = complexity.Trim().ToUpperInvariant();

        if (normalized is "SIMPLE" or "MEDIUM" or "COMPLEX" or "UNKNOWN")
        {
            return normalized;
        }

        return "UNKNOWN";
    }
}