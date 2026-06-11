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
                x.User.Status == UserStatusActive &&
                x.ProfileReviewStatus == ExpertReviewApproved
            )
            .ToListAsync();

        var recommendations = new List<ExpertRecommendationResponse>();

        foreach (var expert in experts)
        {
            var recommendation = BuildRecommendation(job, requiredSkillIds, expert);

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

    private static ExpertRecommendationResponse BuildRecommendation(
        JobPosting job,
        List<int> requiredSkillIds,
        ExpertProfile expert
    )
    {
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

        var riskNote = BuildRiskNote(
            job,
            expert,
            requiredSkillCount,
            matchedSkillCount
        );

        return new ExpertRecommendationResponse
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
                .Select(ToRecommendedSkillResponse)
                .ToList(),
            ExpertSkills = expertSkills
                .Select(ToRecommendedSkillResponse)
                .ToList(),
            MatchReason = BuildMatchReason(
                matchedSkillNames,
                matchedSkillCount,
                requiredSkillCount,
                expert
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

    private static string BuildMatchReason(
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

    private static string? BuildRiskNote(
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

    private static RecommendedExpertSkillResponse ToRecommendedSkillResponse(
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