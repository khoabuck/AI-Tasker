using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Services;

public class JobPostingAiPolicyService : IJobPostingAiPolicyService
{
    private const int DefaultInitialFreeJobPostCredits = 1;
    private const int DefaultInitialFreeAiGenerationCredits = 3;
    private const int DefaultMaxDraftJobsPerClient = 10;
    private const int DefaultMaxSkillsPerJob = 8;
    private const int DefaultMaxSuggestedSkills = 8;
    private const int DefaultMinimumSkillRelevanceScore = 60;
    private const int DefaultMaxRecommendationResults = 50;
    private const int DefaultMinimumRecommendationMatchScore = 1;

    private readonly AITaskerDbContext _context;
    private readonly IAdminAuditLogService _adminAuditLogService;

    public JobPostingAiPolicyService(
        AITaskerDbContext context,
        IAdminAuditLogService adminAuditLogService)
    {
        _context = context;
        _adminAuditLogService = adminAuditLogService;
    }

    public async Task<JobPostingAiPolicyResponse> GetActivePolicyAsync()
    {
        var policy = await GetOrCreateActivePolicyEntityAsync();
        return MapToResponse(policy);
    }

    public async Task<JobPostingAiPolicyResponse> UpdateActivePolicyAsync(
        int adminId,
        UpdateJobPostingAiPolicyRequest request)
    {
        ValidateUpdateRequest(request);

        var policy = await GetOrCreateActivePolicyEntityAsync();
        var oldValue = BuildAuditValue(policy);

        policy.InitialFreeJobPostCredits = request.InitialFreeJobPostCredits;
        policy.InitialFreeAiGenerationCredits = request.InitialFreeAiGenerationCredits;
        policy.MaxDraftJobsPerClient = request.MaxDraftJobsPerClient;
        policy.MaxSkillsPerJob = request.MaxSkillsPerJob;
        policy.MaxSuggestedSkills = request.MaxSuggestedSkills;
        policy.MinimumSkillRelevanceScore = request.MinimumSkillRelevanceScore;
        policy.MaxRecommendationResults = request.MaxRecommendationResults;
        policy.MinimumRecommendationMatchScore = request.MinimumRecommendationMatchScore;
        policy.UpdatedAt = DateTime.UtcNow;
        policy.UpdatedByAdminId = adminId;

        await _context.SaveChangesAsync();

        await _adminAuditLogService.LogAsync(
            adminId,
            "UPDATE_JOB_POSTING_AI_POLICY",
            nameof(JobPostingAiPolicy),
            policy.JobPostingAiPolicyId,
            oldValue,
            BuildAuditValue(policy),
            request.Reason);

        return MapToResponse(policy);
    }

    public async Task<JobPostingAiPolicy> GetOrCreateActivePolicyEntityAsync()
    {
        var activePolicy = await _context.JobPostingAiPolicies
            .Include(x => x.UpdatedByAdmin)
            .FirstOrDefaultAsync(x => x.IsActive);

        if (activePolicy != null)
        {
            return activePolicy;
        }

        var defaultPolicy = new JobPostingAiPolicy
        {
            InitialFreeJobPostCredits = DefaultInitialFreeJobPostCredits,
            InitialFreeAiGenerationCredits = DefaultInitialFreeAiGenerationCredits,
            MaxDraftJobsPerClient = DefaultMaxDraftJobsPerClient,
            MaxSkillsPerJob = DefaultMaxSkillsPerJob,
            MaxSuggestedSkills = DefaultMaxSuggestedSkills,
            MinimumSkillRelevanceScore = DefaultMinimumSkillRelevanceScore,
            MaxRecommendationResults = DefaultMaxRecommendationResults,
            MinimumRecommendationMatchScore = DefaultMinimumRecommendationMatchScore,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.JobPostingAiPolicies.Add(defaultPolicy);
        await _context.SaveChangesAsync();

        return defaultPolicy;
    }

    private static void ValidateUpdateRequest(UpdateJobPostingAiPolicyRequest request)
    {
        ValidateNonNegativeInteger(
            request.InitialFreeJobPostCredits,
            "Initial free job post credits");

        ValidateNonNegativeInteger(
            request.InitialFreeAiGenerationCredits,
            "Initial free AI generation credits");

        ValidateRange(
            request.MaxDraftJobsPerClient,
            1,
            100,
            "Max draft jobs per client");

        ValidateRange(
            request.MaxSkillsPerJob,
            1,
            30,
            "Max skills per job");

        ValidateRange(
            request.MaxSuggestedSkills,
            1,
            30,
            "Max suggested skills");

        if (request.MaxSuggestedSkills > request.MaxSkillsPerJob)
        {
            throw new InvalidOperationException(
                "Max suggested skills cannot be greater than max skills per job."
            );
        }

        ValidateRange(
            request.MinimumSkillRelevanceScore,
            0,
            100,
            "Minimum skill relevance score");

        ValidateRange(
            request.MaxRecommendationResults,
            1,
            100,
            "Max recommendation results");

        ValidateRange(
            request.MinimumRecommendationMatchScore,
            0,
            100,
            "Minimum recommendation match score");

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            throw new InvalidOperationException(
                "Reason is required when updating job posting AI policy."
            );
        }

        if (request.Reason.Trim().Length > 500)
        {
            throw new InvalidOperationException(
                "Reason must be at most 500 characters."
            );
        }
    }

    private static void ValidateRange(
        int value,
        int min,
        int max,
        string fieldName)
    {
        if (value < min || value > max)
        {
            throw new InvalidOperationException(
                $"{fieldName} must be between {min} and {max}."
            );
        }
    }

    private static void ValidateNonNegativeInteger(int value, string fieldName)
    {
        if (value < 0)
        {
            throw new InvalidOperationException(
                $"{fieldName} cannot be negative."
            );
        }
    }

    private static JobPostingAiPolicyResponse MapToResponse(JobPostingAiPolicy policy)
    {
        return new JobPostingAiPolicyResponse
        {
            JobPostingAiPolicyId = policy.JobPostingAiPolicyId,
            InitialFreeJobPostCredits = policy.InitialFreeJobPostCredits,
            InitialFreeAiGenerationCredits = policy.InitialFreeAiGenerationCredits,
            MaxDraftJobsPerClient = policy.MaxDraftJobsPerClient,
            MaxSkillsPerJob = policy.MaxSkillsPerJob,
            MaxSuggestedSkills = policy.MaxSuggestedSkills,
            MinimumSkillRelevanceScore = policy.MinimumSkillRelevanceScore,
            MaxRecommendationResults = policy.MaxRecommendationResults,
            MinimumRecommendationMatchScore = policy.MinimumRecommendationMatchScore,
            IsActive = policy.IsActive,
            CreatedAt = policy.CreatedAt,
            UpdatedAt = policy.UpdatedAt,
            UpdatedByAdminId = policy.UpdatedByAdminId,
            UpdatedByAdminEmail = policy.UpdatedByAdmin?.Email,
            UpdatedByAdminFullName = policy.UpdatedByAdmin?.FullName
        };
    }

    private static string BuildAuditValue(JobPostingAiPolicy policy)
    {
        return string.Join("; ", new[]
        {
            $"JobPostingAiPolicyId={policy.JobPostingAiPolicyId}",
            $"InitialFreeJobPostCredits={policy.InitialFreeJobPostCredits}",
            $"InitialFreeAiGenerationCredits={policy.InitialFreeAiGenerationCredits}",
            $"MaxDraftJobsPerClient={policy.MaxDraftJobsPerClient}",
            $"MaxSkillsPerJob={policy.MaxSkillsPerJob}",
            $"MaxSuggestedSkills={policy.MaxSuggestedSkills}",
            $"MinimumSkillRelevanceScore={policy.MinimumSkillRelevanceScore}",
            $"MaxRecommendationResults={policy.MaxRecommendationResults}",
            $"MinimumRecommendationMatchScore={policy.MinimumRecommendationMatchScore}",
            $"IsActive={policy.IsActive}",
            $"UpdatedByAdminId={policy.UpdatedByAdminId?.ToString() ?? "NULL"}",
            $"UpdatedAt={FormatDateTime(policy.UpdatedAt)}"
        });
    }

    private static string FormatDateTime(DateTime? value)
    {
        return value.HasValue
            ? value.Value.ToString("O")
            : "NULL";
    }
}
