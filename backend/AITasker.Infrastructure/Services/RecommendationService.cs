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

    private readonly AITaskerDbContext _context;

    public RecommendationService(AITaskerDbContext context)
    {
        _context = context;
    }

    public async Task<List<ExpertRecommendationResponse>> GetRecommendedExpertsForJobAsync(
        int currentUserId,
        string? currentUserRole,
        int jobPostingId,
        int limit
    )
    {
        limit = Math.Clamp(limit, 1, 50);

        var job = await _context.JobPostings
            .AsNoTracking()
            .Include(x => x.ClientProfile)
            .Include(x => x.JobSkills)
                .ThenInclude(x => x.Skill)
            .FirstOrDefaultAsync(x => x.JobPostingId == jobPostingId);

        if (job == null)
        {
            throw new InvalidOperationException("Job not found.");
        }

        if (!string.Equals(job.Status, JobStatusOpen, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Only OPEN jobs can receive expert recommendations.");
        }

        var role = NormalizeRole(currentUserRole);

        if (role != "ADMIN")
        {
            var clientProfile = await _context.ClientProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == currentUserId);

            if (clientProfile == null || clientProfile.ClientProfileId != job.ClientProfileId)
            {
                throw new InvalidOperationException("You can only get recommendations for your own job.");
            }
        }

        var requiredSkillIds = job.JobSkills
            .Select(x => x.SkillId)
            .Distinct()
            .ToList();

        var experts = await _context.ExpertProfiles
            .AsNoTracking()
            .Include(x => x.User)
            .Include(x => x.ExpertSkills)
                .ThenInclude(x => x.Skill)
            .Where(x =>
                x.AvailableForWork &&
                x.User != null &&
                x.User.Status == UserStatusActive &&
                x.ProfileReviewStatus == ExpertReviewApproved
            )
            .ToListAsync();

        var recommendations = new List<ExpertRecommendationResponse>();

        foreach (var expert in experts)
        {
            var recommendation = BuildExpertRecommendation(job, requiredSkillIds, expert);

            if (recommendation.MatchScore <= 0)
            {
                continue;
            }

            recommendations.Add(recommendation);
        }

        return recommendations
            .OrderByDescending(x => x.MatchScore)
            .ThenByDescending(x => x.MatchedSkillCount)
            .ThenByDescending(x => x.ProfileScore)
            .ThenByDescending(x => x.YearsOfExperience)
            .Take(limit)
            .ToList();
    }

    public async Task<List<JobRecommendationResponse>> GetRecommendedJobsForMeAsync(
        int expertUserId,
        int limit
    )
    {
        limit = Math.Clamp(limit, 1, 50);

        var expert = await _context.ExpertProfiles
            .AsNoTracking()
            .Include(x => x.User)
            .Include(x => x.ExpertSkills)
                .ThenInclude(x => x.Skill)
            .FirstOrDefaultAsync(x => x.UserId == expertUserId);

        if (expert == null)
        {
            throw new InvalidOperationException("Expert profile not found.");
        }

        if (expert.User == null)
        {
            throw new InvalidOperationException("Expert user information is missing.");
        }

        if (!string.Equals(expert.User.Status, UserStatusActive, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Expert account is not active.");
        }

        if (!string.Equals(expert.ProfileReviewStatus, ExpertReviewApproved, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Only approved expert profiles can receive job recommendations.");
        }

        var expertSkillIds = expert.ExpertSkills
            .Select(x => x.SkillId)
            .Distinct()
            .ToList();

        if (expertSkillIds.Count == 0)
        {
            return new List<JobRecommendationResponse>();
        }

        var jobs = await _context.JobPostings
            .AsNoTracking()
            .Include(x => x.ClientProfile!)
                .ThenInclude(x => x.User)
            .Include(x => x.JobSkills)
                .ThenInclude(x => x.Skill)
            .Where(x => x.Status == JobStatusOpen)
            .ToListAsync();

        var recommendations = new List<JobRecommendationResponse>();

        foreach (var job in jobs)
        {
            var recommendation = BuildJobRecommendation(job, expert, expertSkillIds);

            if (recommendation.MatchScore <= 0)
            {
                continue;
            }

            recommendations.Add(recommendation);
        }

        return recommendations
            .OrderByDescending(x => x.MatchScore)
            .ThenByDescending(x => x.MatchedSkillCount)
            .ThenByDescending(x => x.CreatedAt)
            .Take(limit)
            .ToList();
    }

    private static ExpertRecommendationResponse BuildExpertRecommendation(
        JobPosting job,
        List<int> requiredSkillIds,
        ExpertProfile expert
    )
    {
        if (expert.User == null)
        {
            throw new InvalidOperationException("Expert user information is missing.");
        }

        var expertUser = expert.User;

        var expertSkills = expert.ExpertSkills
            .Where(x => x.Skill != null)
            .ToList();

        var matchedSkills = requiredSkillIds.Count == 0
            ? new List<ExpertSkill>()
            : expertSkills
                .Where(x => requiredSkillIds.Contains(x.SkillId))
                .ToList();

        var skillMatchScore = CalculateSkillMatchScore(
            requiredSkillIds,
            matchedSkills
        );

        var profileScorePart = CalculateProfileScorePart(expert.ProfileScore);

        var experienceScorePart = CalculateExperienceScorePart(
            expert.YearsOfExperience,
            expert.Level
        );

        var budgetFitScorePart = CalculateBudgetFitScorePart(
            job.BudgetMin,
            job.BudgetMax,
            expert.ExpectedProjectBudgetMin,
            expert.ExpectedProjectBudgetMax
        );

        var totalScore = skillMatchScore
            + profileScorePart
            + experienceScorePart
            + budgetFitScorePart;

        totalScore = Clamp(totalScore, 0, 100);

        var matchedSkillNames = matchedSkills
            .Where(x => x.Skill != null)
            .Select(x => x.Skill!.SkillName)
            .ToList();

        var requiredSkillCount = requiredSkillIds.Count;
        var matchedSkillCount = matchedSkills.Count;

        var riskNote = BuildExpertRiskNote(
            job,
            expert,
            requiredSkillCount,
            matchedSkillCount
        );

        return new ExpertRecommendationResponse
        {
            ExpertProfileId = expert.ExpertProfileId,
            UserId = expert.UserId,
            FullName = expertUser.FullName,
            Email = expertUser.Email,
            AvatarUrl = expertUser.AvatarUrl,
            ProfessionalTitle = expert.ProfessionalTitle,
            Bio = expert.Bio,
            SkillsText = expert.Skills,
            YearsOfExperience = expert.YearsOfExperience,
            ExpectedProjectBudgetMin = expert.ExpectedProjectBudgetMin,
            ExpectedProjectBudgetMax = expert.ExpectedProjectBudgetMax,
            AvailableForWork = expert.AvailableForWork,
            ProfileScore = expert.ProfileScore,
            Level = expert.Level,
            MatchScore = Math.Round(totalScore, 2),
            SkillMatchScore = Math.Round(skillMatchScore, 2),
            ProfileScorePart = Math.Round(profileScorePart, 2),
            ExperienceScorePart = Math.Round(experienceScorePart, 2),
            BudgetFitScorePart = Math.Round(budgetFitScorePart, 2),
            MatchedSkillCount = matchedSkillCount,
            RequiredSkillCount = requiredSkillCount,
            MatchedSkills = matchedSkills
                .Select(ToRecommendedExpertSkillResponse)
                .ToList(),
            ExpertSkills = expertSkills
                .Select(ToRecommendedExpertSkillResponse)
                .ToList(),
            MatchReason = BuildExpertMatchReason(
                matchedSkillNames,
                matchedSkillCount,
                requiredSkillCount,
                expert
            ),
            RiskNote = riskNote
        };
    }

    private static JobRecommendationResponse BuildJobRecommendation(
        JobPosting job,
        ExpertProfile expert,
        List<int> expertSkillIds
    )
    {
        if (job.ClientProfile == null)
        {
            throw new InvalidOperationException("Job client profile information is missing.");
        }

        var clientProfile = job.ClientProfile;

        if (clientProfile.User == null)
        {
            throw new InvalidOperationException("Job client user information is missing.");
        }

        var clientUser = clientProfile.User;

        var requiredSkills = job.JobSkills
            .Where(x => x.Skill != null)
            .ToList();

        var requiredSkillIds = requiredSkills
            .Select(x => x.SkillId)
            .Distinct()
            .ToList();

        var matchedJobSkills = requiredSkills
            .Where(x => expertSkillIds.Contains(x.SkillId))
            .ToList();

        var skillMatchScore = CalculateJobSkillMatchScore(
            requiredSkillIds,
            matchedJobSkills,
            expert
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
            expert.Level,
            expert.YearsOfExperience
        );

        var totalScore = skillMatchScore
            + budgetFitScorePart
            + deadlineUrgencyPart
            + complexityFitPart;

        totalScore = Clamp(totalScore, 0, 100);

        var matchedSkillNames = matchedJobSkills
            .Where(x => x.Skill != null)
            .Select(x => x.Skill!.SkillName)
            .ToList();

        var riskNote = BuildJobRiskNote(
            job,
            expert,
            requiredSkillIds.Count,
            matchedJobSkills.Count
        );

        return new JobRecommendationResponse
        {
            JobPostingId = job.JobPostingId,
            ClientProfileId = job.ClientProfileId,
            ClientUserId = clientProfile.UserId,
            ClientName = clientUser.FullName,
            ClientAvatarUrl = clientUser.AvatarUrl,
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
            MatchScore = Math.Round(totalScore, 2),
            SkillMatchScore = Math.Round(skillMatchScore, 2),
            BudgetFitScorePart = Math.Round(budgetFitScorePart, 2),
            DeadlineUrgencyPart = Math.Round(deadlineUrgencyPart, 2),
            ComplexityFitPart = Math.Round(complexityFitPart, 2),
            MatchedSkillCount = matchedJobSkills.Count,
            RequiredSkillCount = requiredSkillIds.Count,
            MatchedSkills = matchedJobSkills
                .Select(ToRecommendedJobSkillResponse)
                .ToList(),
            RequiredSkills = requiredSkills
                .Select(ToRecommendedJobSkillResponse)
                .ToList(),
            MatchReason = BuildJobMatchReason(
                matchedSkillNames,
                matchedJobSkills.Count,
                requiredSkillIds.Count,
                job
            ),
            RiskNote = riskNote
        };
    }

    private static decimal CalculateSkillMatchScore(
        List<int> requiredSkillIds,
        List<ExpertSkill> matchedSkills
    )
    {
        if (requiredSkillIds.Count == 0)
        {
            return 0;
        }

        var baseScore = ((decimal)matchedSkills.Count / requiredSkillIds.Count) * 50m;

        var levelBonus = 0m;

        foreach (var skill in matchedSkills)
        {
            levelBonus += NormalizeSkillLevel(skill.SkillLevel) switch
            {
                "EXPERT" => 2.0m,
                "ADVANCED" => 1.5m,
                "INTERMEDIATE" => 0.8m,
                "BEGINNER" => 0.2m,
                _ => 0m
            };

            if (skill.IsPrimary)
            {
                levelBonus += 0.8m;
            }
        }

        return Clamp(baseScore + levelBonus, 0, 50);
    }

    private static decimal CalculateProfileScorePart(decimal profileScore)
    {
        var safeProfileScore = Clamp(profileScore, 0, 100);

        return safeProfileScore / 100m * 20m;
    }

    private static decimal CalculateExperienceScorePart(
        int yearsOfExperience,
        string? level
    )
    {
        var yearsScore = Math.Clamp(yearsOfExperience, 0, 7) / 7m * 15m;

        var levelScore = NormalizeProfileLevel(level) switch
        {
            "SENIOR" => 5m,
            "MID" => 3m,
            "JUNIOR" => 1m,
            _ => 2m
        };

        return Clamp(yearsScore + levelScore, 0, 20);
    }

    private static decimal CalculateBudgetFitScorePart(
        decimal jobBudgetMin,
        decimal jobBudgetMax,
        decimal expertBudgetMin,
        decimal expertBudgetMax
    )
    {
        if (expertBudgetMin <= 0 && expertBudgetMax <= 0)
        {
            return 5m;
        }

        var hasOverlap =
            expertBudgetMin <= jobBudgetMax &&
            expertBudgetMax >= jobBudgetMin;

        if (hasOverlap)
        {
            return 10m;
        }

        if (expertBudgetMin > jobBudgetMax)
        {
            var difference = expertBudgetMin - jobBudgetMax;

            if (jobBudgetMax <= 0)
            {
                return 0;
            }

            var overPercent = difference / jobBudgetMax;

            if (overPercent <= 0.2m)
            {
                return 6m;
            }

            if (overPercent <= 0.5m)
            {
                return 3m;
            }

            return 0m;
        }

        return 4m;
    }

    private static decimal CalculateJobSkillMatchScore(
        List<int> requiredSkillIds,
        List<JobSkill> matchedJobSkills,
        ExpertProfile expert
    )
    {
        if (requiredSkillIds.Count == 0)
        {
            return 0;
        }

        var baseScore = ((decimal)matchedJobSkills.Count / requiredSkillIds.Count) * 60m;

        var levelBonus = 0m;

        foreach (var matchedJobSkill in matchedJobSkills)
        {
            var expertSkill = expert.ExpertSkills
                .FirstOrDefault(x => x.SkillId == matchedJobSkill.SkillId);

            if (expertSkill == null)
            {
                continue;
            }

            levelBonus += NormalizeSkillLevel(expertSkill.SkillLevel) switch
            {
                "EXPERT" => 3.0m,
                "ADVANCED" => 2.0m,
                "INTERMEDIATE" => 1.0m,
                "BEGINNER" => 0.3m,
                _ => 0m
            };

            if (expertSkill.IsPrimary)
            {
                levelBonus += 1.0m;
            }
        }

        return Clamp(baseScore + levelBonus, 0, 60);
    }

    private static decimal CalculateDeadlineUrgencyPart(DateTime deadline)
    {
        var daysLeft = (deadline.Date - DateTime.UtcNow.Date).TotalDays;

        if (daysLeft < 0)
        {
            return 0m;
        }

        if (daysLeft <= 3)
        {
            return 4m;
        }

        if (daysLeft <= 14)
        {
            return 8m;
        }

        if (daysLeft <= 60)
        {
            return 10m;
        }

        return 7m;
    }

    private static decimal CalculateComplexityFitPart(
        string? complexity,
        string? expertLevel,
        int yearsOfExperience
    )
    {
        var normalizedComplexity = string.IsNullOrWhiteSpace(complexity)
            ? "UNKNOWN"
            : complexity.Trim().ToUpper();

        var normalizedLevel = NormalizeProfileLevel(expertLevel);

        if (normalizedComplexity is "EASY" or "LOW" or "SIMPLE")
        {
            return 10m;
        }

        if (normalizedComplexity is "MEDIUM" or "MODERATE" or "UNKNOWN")
        {
            if (yearsOfExperience >= 2 || normalizedLevel is "MID" or "SENIOR")
            {
                return 10m;
            }

            return 6m;
        }

        if (normalizedComplexity is "HIGH" or "HARD" or "COMPLEX")
        {
            if (yearsOfExperience >= 5 || normalizedLevel == "SENIOR")
            {
                return 10m;
            }

            if (yearsOfExperience >= 3 || normalizedLevel == "MID")
            {
                return 7m;
            }

            return 3m;
        }

        return 6m;
    }

    private static string BuildExpertMatchReason(
        List<string> matchedSkillNames,
        int matchedSkillCount,
        int requiredSkillCount,
        ExpertProfile expert
    )
    {
        var skillText = matchedSkillNames.Count == 0
            ? "No direct skill match"
            : string.Join(", ", matchedSkillNames);

        return
            $"Matched {matchedSkillCount}/{requiredSkillCount} required skills: {skillText}. " +
            $"Expert profile score is {expert.ProfileScore}/100, level is {expert.Level}, " +
            $"and total experience is {expert.YearsOfExperience} years.";
    }

    private static string BuildJobMatchReason(
        List<string> matchedSkillNames,
        int matchedSkillCount,
        int requiredSkillCount,
        JobPosting job
    )
    {
        var skillText = matchedSkillNames.Count == 0
            ? "No direct skill match"
            : string.Join(", ", matchedSkillNames);

        return
            $"Matched {matchedSkillCount}/{requiredSkillCount} required skills: {skillText}. " +
            $"Job budget is {job.BudgetMin} - {job.BudgetMax}, complexity is {job.Complexity}, " +
            $"and deadline is {job.Deadline:yyyy-MM-dd}.";
    }

    private static string? BuildExpertRiskNote(
        JobPosting job,
        ExpertProfile expert,
        int requiredSkillCount,
        int matchedSkillCount
    )
    {
        var notes = new List<string>();

        if (requiredSkillCount > 0 && matchedSkillCount == 0)
        {
            notes.Add("No required skills directly matched.");
        }

        if (requiredSkillCount > 0 && matchedSkillCount < requiredSkillCount)
        {
            notes.Add("Some required skills are missing.");
        }

        var hasBudgetOverlap =
            expert.ExpectedProjectBudgetMin <= job.BudgetMax &&
            expert.ExpectedProjectBudgetMax >= job.BudgetMin;

        if (!hasBudgetOverlap)
        {
            notes.Add("Expert expected budget may not fit the job budget.");
        }

        if (expert.YearsOfExperience <= 1)
        {
            notes.Add("Expert has limited years of experience.");
        }

        return notes.Count == 0 ? null : string.Join(" ", notes);
    }

    private static string? BuildJobRiskNote(
        JobPosting job,
        ExpertProfile expert,
        int requiredSkillCount,
        int matchedSkillCount
    )
    {
        var notes = new List<string>();

        if (requiredSkillCount > 0 && matchedSkillCount == 0)
        {
            notes.Add("No required skills directly matched.");
        }

        if (requiredSkillCount > 0 && matchedSkillCount < requiredSkillCount)
        {
            notes.Add("Some required skills are missing.");
        }

        var hasBudgetOverlap =
            expert.ExpectedProjectBudgetMin <= job.BudgetMax &&
            expert.ExpectedProjectBudgetMax >= job.BudgetMin;

        if (!hasBudgetOverlap)
        {
            notes.Add("Job budget may not fit your expected budget.");
        }

        if (job.Deadline.Date < DateTime.UtcNow.Date)
        {
            notes.Add("Job deadline has already passed.");
        }

        return notes.Count == 0 ? null : string.Join(" ", notes);
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

    private static string NormalizeRole(string? role)
    {
        return string.IsNullOrWhiteSpace(role)
            ? string.Empty
            : role.Trim().ToUpper();
    }

    private static string NormalizeSkillLevel(string? level)
    {
        return string.IsNullOrWhiteSpace(level)
            ? string.Empty
            : level.Trim().ToUpper();
    }

    private static string NormalizeProfileLevel(string? level)
    {
        return string.IsNullOrWhiteSpace(level)
            ? string.Empty
            : level.Trim().ToUpper();
    }
}