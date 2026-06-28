using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;

namespace AITasker.Application.Services;

public class ExpertProfileScoringPolicyService : IExpertProfileScoringPolicyService
{
    private const decimal DefaultPassThreshold = 70m;
    private const int DefaultMaxReviewSubmissions = 5;
    private const int DefaultReviewLockDurationHours = 24;
    private const decimal DefaultProfileCompletenessMaxScore = 15m;
    private const decimal DefaultAiSkillMaxScore = 15m;
    private const decimal DefaultExperienceMaxScore = 20m;
    private const decimal DefaultPortfolioMaxScore = 10m;
    private const decimal DefaultGitHubMaxScore = 10m;
    private const decimal DefaultLinkedInMaxScore = 5m;
    private const decimal DefaultCertificateMaxScore = 15m;
    private const decimal DefaultRiskMaxPenalty = 10m;
    private const decimal DefaultCertificateUnverifiedMaxProfileScore = 69m;
    private const int DefaultBioMinimumLength = 50;
    private const int DefaultSkillsMinimumLength = 10;
    private const int DefaultMaxCertificates = 10;

    private readonly IExpertProfileScoringPolicyRepository _policyRepository;
    private readonly IAdminAuditLogService _adminAuditLogService;

    public ExpertProfileScoringPolicyService(
        IExpertProfileScoringPolicyRepository policyRepository,
        IAdminAuditLogService adminAuditLogService)
    {
        _policyRepository = policyRepository;
        _adminAuditLogService = adminAuditLogService;
    }

    public async Task<ExpertProfileScoringPolicyResponse> GetActivePolicyAsync()
    {
        var policy = await GetOrCreateActivePolicyEntityAsync();

        return MapToResponse(policy);
    }

    public async Task<ExpertProfileScoringPolicyResponse> UpdateActivePolicyAsync(
        int adminId,
        UpdateExpertProfileScoringPolicyRequest request)
    {
        ValidateUpdateRequest(request);

        var policy = await GetOrCreateActivePolicyEntityAsync();
        var oldValue = BuildAuditValue(policy);

        policy.PassThreshold = RoundScore(request.PassThreshold);
        policy.MaxReviewSubmissions = request.MaxReviewSubmissions;
        policy.ReviewLockDurationHours = request.ReviewLockDurationHours;
        policy.ProfileCompletenessMaxScore = RoundScore(request.ProfileCompletenessMaxScore);
        policy.AiSkillMaxScore = RoundScore(request.AiSkillMaxScore);
        policy.ExperienceMaxScore = RoundScore(request.ExperienceMaxScore);
        policy.PortfolioMaxScore = RoundScore(request.PortfolioMaxScore);
        policy.GitHubMaxScore = RoundScore(request.GitHubMaxScore);
        policy.LinkedInMaxScore = RoundScore(request.LinkedInMaxScore);
        policy.CertificateMaxScore = RoundScore(request.CertificateMaxScore);
        policy.RiskMaxPenalty = RoundScore(request.RiskMaxPenalty);
        policy.CertificateUnverifiedMaxProfileScore = RoundScore(
            request.CertificateUnverifiedMaxProfileScore
        );
        policy.BioMinimumLength = request.BioMinimumLength;
        policy.SkillsMinimumLength = request.SkillsMinimumLength;
        policy.MaxCertificates = request.MaxCertificates;
        policy.UpdatedAt = DateTime.UtcNow;
        policy.UpdatedByAdminId = adminId;

        var newValue = BuildAuditValue(policy);

        await _policyRepository.SaveChangesAsync();

        await _adminAuditLogService.LogAsync(
            adminId,
            "UPDATE_EXPERT_PROFILE_SCORING_POLICY",
            nameof(ExpertProfileScoringPolicy),
            policy.ExpertProfileScoringPolicyId,
            oldValue,
            newValue,
            request.Reason
        );

        return MapToResponse(policy);
    }

    public async Task<ExpertProfileScoringPolicy> GetOrCreateActivePolicyEntityAsync()
    {
        var activePolicy = await _policyRepository.GetActiveAsync();

        if (activePolicy != null)
        {
            return activePolicy;
        }

        var defaultPolicy = new ExpertProfileScoringPolicy
        {
            PassThreshold = DefaultPassThreshold,
            MaxReviewSubmissions = DefaultMaxReviewSubmissions,
            ReviewLockDurationHours = DefaultReviewLockDurationHours,
            ProfileCompletenessMaxScore = DefaultProfileCompletenessMaxScore,
            AiSkillMaxScore = DefaultAiSkillMaxScore,
            ExperienceMaxScore = DefaultExperienceMaxScore,
            PortfolioMaxScore = DefaultPortfolioMaxScore,
            GitHubMaxScore = DefaultGitHubMaxScore,
            LinkedInMaxScore = DefaultLinkedInMaxScore,
            CertificateMaxScore = DefaultCertificateMaxScore,
            RiskMaxPenalty = DefaultRiskMaxPenalty,
            CertificateUnverifiedMaxProfileScore = DefaultCertificateUnverifiedMaxProfileScore,
            BioMinimumLength = DefaultBioMinimumLength,
            SkillsMinimumLength = DefaultSkillsMinimumLength,
            MaxCertificates = DefaultMaxCertificates,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _policyRepository.AddAsync(defaultPolicy);
        await _policyRepository.SaveChangesAsync();

        return defaultPolicy;
    }

    private static void ValidateUpdateRequest(
        UpdateExpertProfileScoringPolicyRequest request)
    {
        ValidateScore(request.PassThreshold, "Pass threshold");
        ValidatePositiveInteger(request.MaxReviewSubmissions, "Max review submissions");
        ValidatePositiveInteger(request.ReviewLockDurationHours, "Review lock duration hours");

        ValidateScore(request.ProfileCompletenessMaxScore, "Profile completeness max score");
        ValidateScore(request.AiSkillMaxScore, "AI skill max score");
        ValidateScore(request.ExperienceMaxScore, "Experience max score");
        ValidateScore(request.PortfolioMaxScore, "Portfolio max score");
        ValidateScore(request.GitHubMaxScore, "GitHub max score");
        ValidateScore(request.LinkedInMaxScore, "LinkedIn max score");
        ValidateScore(request.CertificateMaxScore, "Certificate max score");
        ValidateScore(request.RiskMaxPenalty, "Risk max penalty");
        ValidateScore(
            request.CertificateUnverifiedMaxProfileScore,
            "Certificate unverified max profile score"
        );

        ValidatePositiveInteger(request.BioMinimumLength, "Bio minimum length");
        ValidatePositiveInteger(request.SkillsMinimumLength, "Skills minimum length");
        ValidatePositiveInteger(request.MaxCertificates, "Max certificates");

        var totalPositiveScore = request.ProfileCompletenessMaxScore
            + request.AiSkillMaxScore
            + request.ExperienceMaxScore
            + request.PortfolioMaxScore
            + request.GitHubMaxScore
            + request.LinkedInMaxScore
            + request.CertificateMaxScore;

        if (totalPositiveScore <= 0)
        {
            throw new InvalidOperationException(
                "Total positive expert profile score must be greater than 0."
            );
        }

        if (request.PassThreshold > totalPositiveScore)
        {
            throw new InvalidOperationException(
                "Pass threshold cannot be greater than total positive expert profile score."
            );
        }

        if (request.CertificateUnverifiedMaxProfileScore >= request.PassThreshold)
        {
            throw new InvalidOperationException(
                "Certificate unverified max profile score must be lower than pass threshold."
            );
        }

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            throw new InvalidOperationException(
                "Reason is required when updating expert profile scoring policy."
            );
        }

        if (request.Reason.Trim().Length > 500)
        {
            throw new InvalidOperationException(
                "Reason must be at most 500 characters."
            );
        }
    }

    private static void ValidateScore(decimal value, string fieldName)
    {
        if (value < 0m || value > 100m)
        {
            throw new InvalidOperationException(
                $"{fieldName} must be between 0 and 100."
            );
        }
    }

    private static void ValidatePositiveInteger(int value, string fieldName)
    {
        if (value <= 0)
        {
            throw new InvalidOperationException(
                $"{fieldName} must be greater than 0."
            );
        }
    }

    private static decimal RoundScore(decimal value)
    {
        return Math.Round(value, 2, MidpointRounding.AwayFromZero);
    }

    private static ExpertProfileScoringPolicyResponse MapToResponse(
        ExpertProfileScoringPolicy policy)
    {
        return new ExpertProfileScoringPolicyResponse
        {
            ExpertProfileScoringPolicyId = policy.ExpertProfileScoringPolicyId,
            PassThreshold = policy.PassThreshold,
            MaxReviewSubmissions = policy.MaxReviewSubmissions,
            ReviewLockDurationHours = policy.ReviewLockDurationHours,
            ProfileCompletenessMaxScore = policy.ProfileCompletenessMaxScore,
            AiSkillMaxScore = policy.AiSkillMaxScore,
            ExperienceMaxScore = policy.ExperienceMaxScore,
            PortfolioMaxScore = policy.PortfolioMaxScore,
            GitHubMaxScore = policy.GitHubMaxScore,
            LinkedInMaxScore = policy.LinkedInMaxScore,
            CertificateMaxScore = policy.CertificateMaxScore,
            RiskMaxPenalty = policy.RiskMaxPenalty,
            CertificateUnverifiedMaxProfileScore = policy.CertificateUnverifiedMaxProfileScore,
            BioMinimumLength = policy.BioMinimumLength,
            SkillsMinimumLength = policy.SkillsMinimumLength,
            MaxCertificates = policy.MaxCertificates,
            IsActive = policy.IsActive,
            CreatedAt = policy.CreatedAt,
            UpdatedAt = policy.UpdatedAt,
            UpdatedByAdminId = policy.UpdatedByAdminId,
            UpdatedByAdminEmail = policy.UpdatedByAdmin?.Email,
            UpdatedByAdminFullName = policy.UpdatedByAdmin?.FullName
        };
    }

    private static string BuildAuditValue(ExpertProfileScoringPolicy policy)
    {
        return string.Join("; ", new[]
        {
            $"ExpertProfileScoringPolicyId={policy.ExpertProfileScoringPolicyId}",
            $"PassThreshold={policy.PassThreshold}",
            $"MaxReviewSubmissions={policy.MaxReviewSubmissions}",
            $"ReviewLockDurationHours={policy.ReviewLockDurationHours}",
            $"ProfileCompletenessMaxScore={policy.ProfileCompletenessMaxScore}",
            $"AiSkillMaxScore={policy.AiSkillMaxScore}",
            $"ExperienceMaxScore={policy.ExperienceMaxScore}",
            $"PortfolioMaxScore={policy.PortfolioMaxScore}",
            $"GitHubMaxScore={policy.GitHubMaxScore}",
            $"LinkedInMaxScore={policy.LinkedInMaxScore}",
            $"CertificateMaxScore={policy.CertificateMaxScore}",
            $"RiskMaxPenalty={policy.RiskMaxPenalty}",
            $"CertificateUnverifiedMaxProfileScore={policy.CertificateUnverifiedMaxProfileScore}",
            $"BioMinimumLength={policy.BioMinimumLength}",
            $"SkillsMinimumLength={policy.SkillsMinimumLength}",
            $"MaxCertificates={policy.MaxCertificates}",
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
