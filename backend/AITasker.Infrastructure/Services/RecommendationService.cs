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

    private readonly AITaskerDbContext _dbContext;

    public RecommendationService(AITaskerDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<List<ExpertRecommendationResponse>> GetRecommendedExpertsForJobAsync(
        int currentUserId,
        string? currentUserRole,
        int jobPostingId,
        int limit
    )
    {
        var role = NormalizeRole(currentUserRole);
        var safeLimit = Math.Clamp(limit, 1, 50);

        if (role != "CLIENT" && role != "ADMIN")
        {
            throw new InvalidOperationException(
                "Only CLIENT or ADMIN can view expert recommendations for a job."
            );
        }

        var job = await _dbContext.JobPostings
            .AsNoTracking()
            .Include(x => x.ClientProfile!)
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
            .Where(x => x.MatchScore > 0)
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
        var safeLimit = Math.Clamp(limit, 1, 50);

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
            .Include(x => x.JobSkills)
                .ThenInclude(x => x.Skill)
            .Where(x => x.Status == JobStatusOpen)
            .ToListAsync();

        var recommendations = jobs
            .Select(job => BuildJobRecommendation(job, expertProfile, expertSkillIds))
            .Where(x => x.MatchScore > 0)
            .OrderByDescending(x => x.MatchScore)
            .ThenByDescending(x => x.SkillMatchScore)
            .ThenBy(x => x.Deadline)
            .Take(safeLimit)
            .ToList();

        return recommendations;
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

        var budgetFitScorePart = CalculateBudgetFitScorePart(
            job.BudgetMin,
            job.BudgetMax,
            expert.ExpectedProjectBudgetMin,
            expert.ExpectedProjectBudgetMax
        );

        var matchScore = Clamp(
            skillMatchScore + profileScorePart + experienceScorePart + budgetFitScorePart,
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

            // Field này vẫn là số năm expert tự khai, chỉ để FE hiển thị.
            // Điểm recommendation dùng VerifiedYearsOfExperience.
            YearsOfExperience = expert.YearsOfExperience,

            ExpectedProjectBudgetMin = expert.ExpectedProjectBudgetMin,
            ExpectedProjectBudgetMax = expert.ExpectedProjectBudgetMax,
            AvailableForWork = expert.AvailableForWork,
            ProfileScore = expert.ProfileScore,
            Level = expert.Level,

            MatchScore = Math.Round(matchScore, 2),
            SkillMatchScore = Math.Round(skillMatchScore, 2),
            ProfileScorePart = Math.Round(profileScorePart, 2),
            ExperienceScorePart = Math.Round(experienceScorePart, 2),
            BudgetFitScorePart = Math.Round(budgetFitScorePart, 2),

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
                job.BudgetMin,
                job.BudgetMax,
                expert.ExpectedProjectBudgetMin,
                expert.ExpectedProjectBudgetMax,
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

        var budgetFitScorePart = CalculateBudgetFitScorePart(
            job.BudgetMin,
            job.BudgetMax,
            expert.ExpectedProjectBudgetMin,
            expert.ExpectedProjectBudgetMax
        );

        var deadlineUrgencyPart = CalculateDeadlineUrgencyPart(job.Deadline);

        var complexityFitPart = CalculateComplexityFitPart(
            job.Complexity,
            verifiedYears,
            expert.Level
        );

        var matchScore = Clamp(
            skillMatchScore + budgetFitScorePart + deadlineUrgencyPart + complexityFitPart,
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
            BudgetFitScorePart = Math.Round(budgetFitScorePart, 2),
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
                job.Deadline,
                job.BudgetMin,
                job.BudgetMax,
                expert.ExpectedProjectBudgetMin,
                expert.ExpectedProjectBudgetMax
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

    private static decimal CalculateBudgetFitScorePart(
        decimal jobBudgetMin,
        decimal jobBudgetMax,
        decimal expertBudgetMin,
        decimal expertBudgetMax
    )
    {
        if (expertBudgetMin <= jobBudgetMax && expertBudgetMax >= jobBudgetMin)
        {
            return 10m;
        }

        var jobAverage = (jobBudgetMin + jobBudgetMax) / 2m;
        var expertAverage = (expertBudgetMin + expertBudgetMax) / 2m;

        if (jobAverage <= 0 || expertAverage <= 0)
        {
            return 2m;
        }

        var differenceRate = Math.Abs(jobAverage - expertAverage) / jobAverage;

        if (differenceRate <= 0.2m)
        {
            return 7m;
        }

        if (differenceRate <= 0.5m)
        {
            return 4m;
        }

        return 1m;
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
            return "This job has no required skills, so matching is based on verified profile quality, budget fit, and availability.";
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
            return "This job has no required skills, so matching is based on budget, deadline, and complexity fit.";
        }

        return
            $"Matched {matchedSkillCount}/{requiredSkillCount} required job skills. " +
            $"Your verified experience used for scoring: {verifiedYears} year(s), level {NormalizeProfileLevel(level)}, confidence score {confidenceScore:0.##}.";
    }

    private static string? BuildExpertRiskNote(
        int matchedSkillCount,
        int requiredSkillCount,
        decimal jobBudgetMin,
        decimal jobBudgetMax,
        decimal expertBudgetMin,
        decimal expertBudgetMax,
        decimal confidenceScore
    )
    {
        var notes = new List<string>();

        if (requiredSkillCount > 0 && matchedSkillCount < requiredSkillCount)
        {
            notes.Add("Some required skills are missing.");
        }

        if (!(expertBudgetMin <= jobBudgetMax && expertBudgetMax >= jobBudgetMin))
        {
            notes.Add("Expert expected budget may not fit the job budget.");
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
        DateTime deadline,
        decimal jobBudgetMin,
        decimal jobBudgetMax,
        decimal expertBudgetMin,
        decimal expertBudgetMax
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

        if (!(expertBudgetMin <= jobBudgetMax && expertBudgetMax >= jobBudgetMin))
        {
            notes.Add("Job budget may not fit your expected budget range.");
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