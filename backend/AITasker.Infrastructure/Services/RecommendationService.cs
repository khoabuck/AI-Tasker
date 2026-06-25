using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Services;

public class RecommendationService : IRecommendationService
{
    private const string JobStatusOpen = "OPEN";
    private const string UserStatusActive = "ACTIVE";
    private const string ExpertReviewApproved = "APPROVED";

    private const string ClientTypeBusiness = "BUSINESS";
    private const string BusinessVerificationVerified = "VERIFIED";

    private readonly AITaskerDbContext _dbContext;
    private readonly IJobAssistantProvider _jobAssistantProvider;
    private readonly IJobPostingAiPolicyService _jobPostingAiPolicyService;

    public RecommendationService(
        AITaskerDbContext dbContext,
        IJobAssistantProvider jobAssistantProvider,
        IJobPostingAiPolicyService jobPostingAiPolicyService
    )
    {
        _dbContext = dbContext;
        _jobAssistantProvider = jobAssistantProvider;
        _jobPostingAiPolicyService = jobPostingAiPolicyService;
    }

    public async Task<PromptExpertRecommendationResponse> GetRecommendedExpertsFromPromptAsync(
        int currentUserId,
        string? currentUserRole,
        PromptExpertRecommendationRequest request
    )
    {
        var role = NormalizeRole(currentUserRole);

        if (role != "CLIENT" && role != "ADMIN")
        {
            throw new InvalidOperationException(
                "Only CLIENT or ADMIN can find expert recommendations from prompt."
            );
        }

        if (role == "CLIENT")
        {
            await EnsureCurrentClientEligibleForRecommendationAsync(currentUserId);
        }

        if (string.IsNullOrWhiteSpace(request.Prompt))
        {
            throw new InvalidOperationException("Prompt is required.");
        }

        var prompt = request.Prompt.Trim();
        var policy = await _jobPostingAiPolicyService.GetOrCreateActivePolicyEntityAsync();
        var maxSuggestedSkills = Math.Clamp(policy.MaxSuggestedSkills, 1, policy.MaxSkillsPerJob);
        var maxRecommendationResults = Math.Clamp(policy.MaxRecommendationResults, 1, 100);
        var minimumRecommendationMatchScore = NormalizeMinimumMatchScore(
            policy.MinimumRecommendationMatchScore
        );

        var activeSkills = await _dbContext.Skills
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.SkillName)
            .Select(x => new
            {
                x.SkillId,
                x.SkillName,
                x.Category
            })
            .ToListAsync();

        if (activeSkills.Count == 0)
        {
            throw new InvalidOperationException("No active skills found in system.");
        }

        var availableSkillNames = activeSkills
            .Select(x => x.SkillName)
            .ToList();

        var aiRequest = new JobAssistantRequest
        {
            RawRequirement = prompt
        };

        var aiResult = await _jobAssistantProvider.AnalyzeAsync(
            aiRequest,
            availableSkillNames
        );

        var normalizedAiSkillNames = aiResult.SuggestedSkillNames
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim().ToLowerInvariant())
            .Distinct()
            .ToHashSet();

        var matchedSkills = activeSkills
            .Where(x => normalizedAiSkillNames.Contains(
                x.SkillName.Trim().ToLowerInvariant()
            ))
            .Take(maxSuggestedSkills)
            .Select(x => new JobAssistantSkillResponse
            {
                SkillId = x.SkillId,
                SkillName = x.SkillName,
                Category = x.Category
            })
            .ToList();

        if (matchedSkills.Count == 0)
        {
            return new PromptExpertRecommendationResponse
            {
                Prompt = prompt,
                SuggestedTitle = aiResult.SuggestedTitle,
                ImprovedDescription = aiResult.ImprovedDescription,
                AiGeneratedDescription = aiResult.AiGeneratedDescription,
                SuggestedProjectType = aiResult.SuggestedProjectType,
                SuggestedComplexity = aiResult.SuggestedComplexity,
                ExpectedDeliverables = aiResult.ExpectedDeliverables,
                SuggestedSkillIds = new List<int>(),
                SuggestedSkills = new List<JobAssistantSkillResponse>(),
                Warnings = aiResult.Warnings ?? new List<string>
                {
                    "AI could not match any skill from the current skill list."
                },
                RecommendedExperts = new List<ExpertRecommendationResponse>()
            };
        }

        var requiredSkillIds = matchedSkills
            .Select(x => x.SkillId)
            .Distinct()
            .ToHashSet();

        var temporaryJob = new JobPosting
        {
            Title = string.IsNullOrWhiteSpace(aiResult.SuggestedTitle)
                ? "AI Project Request"
                : aiResult.SuggestedTitle,

            Description = string.IsNullOrWhiteSpace(aiResult.ImprovedDescription)
                ? prompt
                : aiResult.ImprovedDescription,

            AiGeneratedDescription = aiResult.AiGeneratedDescription,

            BudgetMin = 0,
            BudgetMax = 999999999,

            Deadline = DateTime.UtcNow.AddDays(30),

            ProjectType = string.IsNullOrWhiteSpace(aiResult.SuggestedProjectType)
                ? "AI Service"
                : aiResult.SuggestedProjectType,

            Complexity = string.IsNullOrWhiteSpace(aiResult.SuggestedComplexity)
                ? "UNKNOWN"
                : aiResult.SuggestedComplexity,

            ExpectedDeliverables = string.IsNullOrWhiteSpace(aiResult.ExpectedDeliverables)
                ? "AI solution based on client requirement."
                : aiResult.ExpectedDeliverables,

            Status = JobStatusOpen,
            IsAiAssisted = true
        };

        var experts = await _dbContext.ExpertProfiles
            .AsNoTracking()
            .Include(x => x.User)
            .Include(x => x.ExpertSkills)
                .ThenInclude(x => x.Skill)
            .Where(x =>
                x.User.Status == UserStatusActive &&
                x.ProfileReviewStatus == ExpertReviewApproved &&
                x.AvailableForWork
            )
            .ToListAsync();

        var recommendations = experts
            .Select(expert => BuildExpertRecommendation(
                expert,
                temporaryJob,
                requiredSkillIds
            ))
            .Where(x => x.MatchScore >= minimumRecommendationMatchScore)
            .OrderByDescending(x => x.MatchScore)
            .ThenByDescending(x => x.SkillMatchScore)
            .ThenByDescending(x => x.ProfileScore)
            .Take(maxRecommendationResults)
            .ToList();

        return new PromptExpertRecommendationResponse
        {
            Prompt = prompt,
            SuggestedTitle = aiResult.SuggestedTitle,
            ImprovedDescription = aiResult.ImprovedDescription,
            AiGeneratedDescription = aiResult.AiGeneratedDescription,
            SuggestedProjectType = aiResult.SuggestedProjectType,
            SuggestedComplexity = aiResult.SuggestedComplexity,
            ExpectedDeliverables = aiResult.ExpectedDeliverables,
            SuggestedSkillIds = matchedSkills.Select(x => x.SkillId).ToList(),
            SuggestedSkills = matchedSkills,
            Warnings = aiResult.Warnings ?? new List<string>(),
            RecommendedExperts = recommendations
        };
    }

    public async Task<List<ExpertRecommendationResponse>> GetRecommendedExpertsForJobAsync(
        int currentUserId,
        string? currentUserRole,
        int jobPostingId,
        int limit
    )
    {
        var role = NormalizeRole(currentUserRole);
        var policy = await _jobPostingAiPolicyService.GetOrCreateActivePolicyEntityAsync();
        var safeLimit = Math.Clamp(limit, 1, policy.MaxRecommendationResults);
        var minimumRecommendationMatchScore = NormalizeMinimumMatchScore(
            policy.MinimumRecommendationMatchScore
        );

        if (role != "CLIENT" && role != "ADMIN")
        {
            throw new InvalidOperationException(
                "Only CLIENT or ADMIN can view expert recommendations for a job."
            );
        }

        var job = await _dbContext.JobPostings
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
            throw new InvalidOperationException("Job not found.");
        }

        if (job.Status != JobStatusOpen)
        {
            throw new InvalidOperationException(
                "Only OPEN jobs can be used for expert recommendations."
            );
        }

        if (job.ClientProfile == null)
        {
            throw new InvalidOperationException("Job client profile not found.");
        }

        if (!IsClientEligibleForRecommendation(job.ClientProfile))
        {
            throw new InvalidOperationException(
                "Job owner must be active and verified before expert recommendations can be generated."
            );
        }

        if (role != "ADMIN" && job.ClientProfile.UserId != currentUserId)
        {
            throw new InvalidOperationException(
                "You can only view recommendations for your own jobs."
            );
        }

        var requiredSkillIds = job.JobSkills
            .Select(x => x.SkillId)
            .Distinct()
            .ToHashSet();

        var experts = await _dbContext.ExpertProfiles
            .AsNoTracking()
            .Include(x => x.User)
            .Include(x => x.ExpertSkills)
                .ThenInclude(x => x.Skill)
            .Where(x =>
                x.User.Status == UserStatusActive &&
                x.ProfileReviewStatus == ExpertReviewApproved &&
                x.AvailableForWork
            )
            .ToListAsync();

        var recommendations = experts
            .Select(expert => BuildExpertRecommendation(expert, job, requiredSkillIds))
            .Where(x => x.MatchScore >= minimumRecommendationMatchScore)
            .OrderByDescending(x => x.MatchScore)
            .ThenByDescending(x => x.SkillMatchScore)
            .ThenByDescending(x => x.ProfileScore)
            .Take(safeLimit)
            .ToList();

        return recommendations;
    }

    public async Task<List<JobRecommendationResponse>> GetRecommendedJobsForMeAsync(
        int expertUserId,
        int limit
    )
    {
        var policy = await _jobPostingAiPolicyService.GetOrCreateActivePolicyEntityAsync();
        var safeLimit = Math.Clamp(limit, 1, policy.MaxRecommendationResults);
        var minimumRecommendationMatchScore = NormalizeMinimumMatchScore(
            policy.MinimumRecommendationMatchScore
        );

        var expertProfile = await _dbContext.ExpertProfiles
            .AsNoTracking()
            .Include(x => x.User)
            .Include(x => x.ExpertSkills)
                .ThenInclude(x => x.Skill)
            .FirstOrDefaultAsync(x => x.UserId == expertUserId);

        if (expertProfile == null)
        {
            throw new InvalidOperationException("Expert profile not found.");
        }

        if (expertProfile.User.Status != UserStatusActive ||
            expertProfile.ProfileReviewStatus != ExpertReviewApproved)
        {
            throw new InvalidOperationException(
                "Your expert profile must be approved before viewing recommended jobs."
            );
        }

        var expertSkillIds = expertProfile.ExpertSkills
            .Select(x => x.SkillId)
            .Distinct()
            .ToHashSet();

        if (expertSkillIds.Count == 0)
        {
            return new List<JobRecommendationResponse>();
        }

        var jobs = await _dbContext.JobPostings
            .AsNoTracking()
            .Include(x => x.ClientProfile!)
                .ThenInclude(x => x.User)
            .Include(x => x.ClientProfile!)
                .ThenInclude(x => x.BusinessProfile)
            .Include(x => x.JobSkills)
                .ThenInclude(x => x.Skill)
            .Where(x =>
                x.Status == JobStatusOpen &&
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
            .ToListAsync();

        var recommendations = jobs
            .Select(job => BuildJobRecommendation(job, expertProfile, expertSkillIds))
            .Where(x => x.MatchScore >= minimumRecommendationMatchScore)
            .OrderByDescending(x => x.MatchScore)
            .ThenByDescending(x => x.SkillMatchScore)
            .ThenBy(x => x.Deadline)
            .Take(safeLimit)
            .ToList();

        return recommendations;
    }

    private async Task EnsureCurrentClientEligibleForRecommendationAsync(int userId)
    {
        var clientProfile = await _dbContext.ClientProfiles
            .AsNoTracking()
            .Include(x => x.User)
            .Include(x => x.BusinessProfile)
            .FirstOrDefaultAsync(x => x.UserId == userId);

        if (clientProfile == null)
        {
            throw new InvalidOperationException("Client profile not found.");
        }

        if (!IsClientEligibleForRecommendation(clientProfile))
        {
            throw new InvalidOperationException(
                "Your account must be active and verified before requesting expert recommendations."
            );
        }
    }

    private static bool IsClientEligibleForRecommendation(ClientProfile clientProfile)
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

    private static ExpertRecommendationResponse BuildExpertRecommendation(
        ExpertProfile expert,
        JobPosting job,
        HashSet<int> requiredSkillIds
    )
    {
        var matchedSkills = expert.ExpertSkills
            .Where(x => requiredSkillIds.Contains(x.SkillId))
            .ToList();

        var verifiedYears = GetVerifiedYears(expert);

        var skillMatchScore = CalculateExpertSkillMatchScore(
            expert.ExpertSkills,
            requiredSkillIds
        );

        var profileScorePart = CalculateProfileScorePart(expert.ProfileScore);

        var experienceScorePart = CalculateVerifiedExperienceScorePart(
            verifiedYears,
            expert.ExperienceConfidenceScore,
            expert.Level
        );

        var matchScore = Clamp(
            skillMatchScore + profileScorePart + experienceScorePart,
            0m,
            100m
        );

        var response = new ExpertRecommendationResponse
        {
            ExpertProfileId = expert.ExpertProfileId,
            UserId = expert.UserId,
            FullName = expert.User.FullName,
            Email = expert.User.Email,
            AvatarUrl = expert.User.AvatarUrl,
            ProfessionalTitle = expert.ProfessionalTitle,
            Bio = expert.Bio,
            SkillsText = expert.Skills,

            YearsOfExperience = expert.YearsOfExperience,

            AvailableForWork = expert.AvailableForWork,
            ProfileScore = expert.ProfileScore,
            Level = expert.Level,

            MatchScore = Math.Round(matchScore, 2),
            SkillMatchScore = Math.Round(skillMatchScore, 2),
            ProfileScorePart = Math.Round(profileScorePart, 2),
            ExperienceScorePart = Math.Round(experienceScorePart, 2),

            MatchedSkillCount = matchedSkills.Count,
            RequiredSkillCount = requiredSkillIds.Count,

            MatchedSkills = matchedSkills
                .Select(ToRecommendedExpertSkillResponse)
                .ToList(),

            ExpertSkills = expert.ExpertSkills
                .Select(ToRecommendedExpertSkillResponse)
                .ToList(),

            MatchReason = BuildExpertMatchReason(
                matchedSkills.Count,
                requiredSkillIds.Count,
                verifiedYears,
                expert.ExperienceConfidenceScore,
                expert.Level
            ),

            RiskNote = BuildExpertRiskNote(
                matchedSkills.Count,
                requiredSkillIds.Count,
                expert.ExperienceConfidenceScore
            )
        };

        return response;
    }

    private static JobRecommendationResponse BuildJobRecommendation(
        JobPosting job,
        ExpertProfile expert,
        HashSet<int> expertSkillIds
    )
    {
        var clientProfile = job.ClientProfile;

        if (clientProfile == null)
        {
            throw new InvalidOperationException("Job client profile not found.");
        }

        var requiredSkills = job.JobSkills.ToList();

        var matchedSkills = requiredSkills
            .Where(x => expertSkillIds.Contains(x.SkillId))
            .ToList();

        var verifiedYears = GetVerifiedYears(expert);

        var skillMatchScore = CalculateJobSkillMatchScore(
            requiredSkills,
            expertSkillIds
        );

        var deadlineUrgencyPart = CalculateDeadlineUrgencyPart(job.Deadline);

        var complexityFitPart = CalculateComplexityFitPart(
            job.Complexity,
            verifiedYears,
            expert.Level
        );

        var matchScore = Clamp(
            skillMatchScore + deadlineUrgencyPart + complexityFitPart,
            0m,
            100m
        );

        var response = new JobRecommendationResponse
        {
            JobPostingId = job.JobPostingId,
            ClientProfileId = job.ClientProfileId,
            ClientUserId = clientProfile.UserId,
            ClientName = clientProfile.User?.FullName ?? "Client",
            ClientAvatarUrl = clientProfile.User?.AvatarUrl,

            Title = job.Title,
            Description = job.Description,
            BudgetMin = job.BudgetMin,
            BudgetMax = job.BudgetMax,
            Deadline = job.Deadline,
            ProjectType = job.ProjectType,
            Complexity = job.Complexity,
            ExpectedDeliverables = job.ExpectedDeliverables,
            Status = job.Status,
            IsAiAssisted = job.IsAiAssisted,
            CreatedAt = job.CreatedAt,

            MatchScore = Math.Round(matchScore, 2),
            SkillMatchScore = Math.Round(skillMatchScore, 2),
            DeadlineUrgencyPart = Math.Round(deadlineUrgencyPart, 2),
            ComplexityFitPart = Math.Round(complexityFitPart, 2),

            MatchedSkillCount = matchedSkills.Count,
            RequiredSkillCount = requiredSkills.Count,

            MatchedSkills = matchedSkills
                .Select(ToRecommendedJobSkillResponse)
                .ToList(),

            RequiredSkills = requiredSkills
                .Select(ToRecommendedJobSkillResponse)
                .ToList(),

            MatchReason = BuildJobMatchReason(
                matchedSkills.Count,
                requiredSkills.Count,
                verifiedYears,
                expert.ExperienceConfidenceScore,
                expert.Level
            ),

            RiskNote = BuildJobRiskNote(
                matchedSkills.Count,
                requiredSkills.Count,
                job.Deadline
            )
        };

        return response;
    }

    private static decimal CalculateExpertSkillMatchScore(
        ICollection<ExpertSkill> expertSkills,
        HashSet<int> requiredSkillIds
    )
    {
        if (requiredSkillIds.Count == 0)
        {
            return 0m;
        }

        var matchedSkills = expertSkills
            .Where(x => requiredSkillIds.Contains(x.SkillId))
            .ToList();

        if (matchedSkills.Count == 0)
        {
            return 0m;
        }

        var matchRatio = matchedSkills.Count / (decimal)requiredSkillIds.Count;

        var baseScore = matchRatio * 40m;

        var qualityScore = matchedSkills
            .Select(x =>
            {
                var levelScore = NormalizeSkillLevel(x.SkillLevel) switch
                {
                    "EXPERT" => 8m,
                    "ADVANCED" => 6m,
                    "INTERMEDIATE" => 4m,
                    "BEGINNER" => 2m,
                    _ => 3m
                };

                var primaryBonus = x.IsPrimary ? 2m : 0m;

                return Clamp(levelScore + primaryBonus, 0m, 10m);
            })
            .Average();

        return Clamp(baseScore + qualityScore, 0m, 50m);
    }

    private static decimal CalculateJobSkillMatchScore(
        List<JobSkill> requiredSkills,
        HashSet<int> expertSkillIds
    )
    {
        if (requiredSkills.Count == 0)
        {
            return 0m;
        }

        var matchedCount = requiredSkills.Count(x => expertSkillIds.Contains(x.SkillId));

        if (matchedCount == 0)
        {
            return 0m;
        }

        var matchRatio = matchedCount / (decimal)requiredSkills.Count;

        return Clamp(matchRatio * 60m, 0m, 60m);
    }

    private static decimal CalculateProfileScorePart(decimal profileScore)
    {
        return Clamp(profileScore, 0m, 100m) / 100m * 20m;
    }

    private static decimal CalculateVerifiedExperienceScorePart(
        int verifiedYears,
        decimal confidenceScore,
        string? level
    )
    {
        var yearsScore = Math.Clamp(verifiedYears, 0, 7) / 7m * 12m;

        var levelScore = NormalizeProfileLevel(level) switch
        {
            "LEAD" => 5m,
            "SENIOR" => 4m,
            "MID_LEVEL" => 3m,
            "JUNIOR" => 2m,
            "FRESHER" => 1m,
            _ => 1m
        };

        var confidencePart = Clamp(confidenceScore, 0m, 100m) / 100m * 3m;

        return Clamp(yearsScore + levelScore + confidencePart, 0m, 20m);
    }

    private static decimal CalculateDeadlineUrgencyPart(DateTime deadline)
    {
        var remainingDays = (deadline.Date - DateTime.UtcNow.Date).TotalDays;

        if (remainingDays < 0)
        {
            return 0m;
        }

        if (remainingDays <= 3)
        {
            return 5m;
        }

        if (remainingDays <= 14)
        {
            return 10m;
        }

        if (remainingDays <= 45)
        {
            return 8m;
        }

        return 6m;
    }

    private static decimal CalculateComplexityFitPart(
        string? complexity,
        int verifiedYears,
        string? level
    )
    {
        var normalizedComplexity = NormalizeText(complexity, "UNKNOWN")
            .ToUpperInvariant()
            .Replace("-", "_")
            .Replace(" ", "_");

        var normalizedLevel = NormalizeProfileLevel(level);

        if (normalizedComplexity == "LOW" ||
            normalizedComplexity == "EASY" ||
            normalizedComplexity == "SIMPLE")
        {
            return 20m;
        }

        if (normalizedComplexity == "MEDIUM" ||
            normalizedComplexity == "MODERATE" ||
            normalizedComplexity == "UNKNOWN")
        {
            if (verifiedYears >= 2 ||
                normalizedLevel == "MID_LEVEL" ||
                normalizedLevel == "SENIOR" ||
                normalizedLevel == "LEAD")
            {
                return 20m;
            }

            if (verifiedYears >= 1 || normalizedLevel == "JUNIOR")
            {
                return 12m;
            }

            return 8m;
        }

        if (normalizedComplexity == "HIGH" ||
            normalizedComplexity == "HARD" ||
            normalizedComplexity == "COMPLEX")
        {
            if (verifiedYears >= 5 ||
                normalizedLevel == "SENIOR" ||
                normalizedLevel == "LEAD")
            {
                return 20m;
            }

            if (verifiedYears >= 3 || normalizedLevel == "MID_LEVEL")
            {
                return 14m;
            }

            return 6m;
        }

        return 10m;
    }

    private static string BuildExpertMatchReason(
        int matchedSkillCount,
        int requiredSkillCount,
        int verifiedYears,
        decimal confidenceScore,
        string? level
    )
    {
        if (requiredSkillCount == 0)
        {
            return "This job has no required skills, so matching is based on verified profile quality and availability.";
        }

        return
            $"Matched {matchedSkillCount}/{requiredSkillCount} required skills. " +
            $"Recommendation uses verified experience: {verifiedYears} year(s), level {NormalizeProfileLevel(level)}, confidence score {confidenceScore:0.##}.";
    }

    private static string BuildJobMatchReason(
        int matchedSkillCount,
        int requiredSkillCount,
        int verifiedYears,
        decimal confidenceScore,
        string? level
    )
    {
        if (requiredSkillCount == 0)
        {
            return "This job has no required skills, so matching is based on deadline and complexity fit.";
        }

        return
            $"Matched {matchedSkillCount}/{requiredSkillCount} required job skills. " +
            $"Your verified experience used for scoring: {verifiedYears} year(s), level {NormalizeProfileLevel(level)}, confidence score {confidenceScore:0.##}.";
    }

    private static string? BuildExpertRiskNote(
        int matchedSkillCount,
        int requiredSkillCount,
        decimal confidenceScore
    )
    {
        var notes = new List<string>();

        if (requiredSkillCount > 0 && matchedSkillCount < requiredSkillCount)
        {
            notes.Add("Some required skills are missing.");
        }

        if (confidenceScore < 60m)
        {
            notes.Add("Verified experience confidence is still limited.");
        }

        return notes.Count == 0
            ? null
            : string.Join(" ", notes);
    }

    private static string? BuildJobRiskNote(
        int matchedSkillCount,
        int requiredSkillCount,
        DateTime deadline
    )
    {
        var notes = new List<string>();

        if (requiredSkillCount > 0 && matchedSkillCount < requiredSkillCount)
        {
            notes.Add("Some required job skills do not match your expert skills.");
        }

        if (deadline.Date < DateTime.UtcNow.Date)
        {
            notes.Add("Job deadline has already passed.");
        }
        else if ((deadline.Date - DateTime.UtcNow.Date).TotalDays <= 3)
        {
            notes.Add("Job deadline is very close.");
        }

        return notes.Count == 0
            ? null
            : string.Join(" ", notes);
    }

    private static RecommendedExpertSkillResponse ToRecommendedExpertSkillResponse(
        ExpertSkill expertSkill
    )
    {
        return new RecommendedExpertSkillResponse
        {
            SkillId = expertSkill.SkillId,
            SkillName = expertSkill.Skill?.SkillName ?? string.Empty,
            Category = expertSkill.Skill?.Category,
            SkillLevel = expertSkill.SkillLevel,
            YearsOfExperience = expertSkill.YearsOfExperience,
            IsPrimary = expertSkill.IsPrimary
        };
    }

    private static RecommendedJobSkillResponse ToRecommendedJobSkillResponse(
        JobSkill jobSkill
    )
    {
        return new RecommendedJobSkillResponse
        {
            SkillId = jobSkill.SkillId,
            SkillName = jobSkill.Skill?.SkillName ?? string.Empty,
            Category = jobSkill.Skill?.Category
        };
    }

    private static int GetVerifiedYears(ExpertProfile expert)
    {
        return Math.Clamp(expert.VerifiedYearsOfExperience, 0, 50);
    }

    private static string NormalizeRole(string? role)
    {
        return string.IsNullOrWhiteSpace(role)
            ? string.Empty
            : role.Trim().ToUpperInvariant();
    }

    private static string NormalizeSkillLevel(string? skillLevel)
    {
        if (string.IsNullOrWhiteSpace(skillLevel))
        {
            return "INTERMEDIATE";
        }

        var normalized = skillLevel.Trim()
            .ToUpperInvariant()
            .Replace("-", "_")
            .Replace(" ", "_");

        return normalized switch
        {
            "BEGINNER" => "BEGINNER",
            "INTERMEDIATE" => "INTERMEDIATE",
            "ADVANCED" => "ADVANCED",
            "EXPERT" => "EXPERT",
            _ => "INTERMEDIATE"
        };
    }

    private static string NormalizeProfileLevel(string? level)
    {
        if (string.IsNullOrWhiteSpace(level))
        {
            return "FRESHER";
        }

        var normalized = level.Trim()
            .ToUpperInvariant()
            .Replace("-", "_")
            .Replace(" ", "_");

        return normalized switch
        {
            "FRESHER" => "FRESHER",
            "JUNIOR" => "JUNIOR",
            "MID" => "MID_LEVEL",
            "MIDLEVEL" => "MID_LEVEL",
            "MID_LEVEL" => "MID_LEVEL",
            "SENIOR" => "SENIOR",
            "LEAD" => "LEAD",
            _ => "FRESHER"
        };
    }

    private static string NormalizeText(string? value, string fallback)
    {
        return string.IsNullOrWhiteSpace(value)
            ? fallback
            : value.Trim();
    }

    private static decimal NormalizeMinimumMatchScore(int score)
    {
        return Math.Clamp(score, 0, 100);
    }

    private static decimal Clamp(decimal value, decimal min, decimal max)
    {
        if (value < min)
        {
            return min;
        }

        if (value > max)
        {
            return max;
        }

        return value;
    }
}