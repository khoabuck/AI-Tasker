namespace AITasker.Application.DTOs.Responses;

public class ExpertRecommendationResponse
{
    public int ExpertProfileId { get; set; }

    public int UserId { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string? AvatarUrl { get; set; }

    public string ProfessionalTitle { get; set; } = string.Empty;

    public string Bio { get; set; } = string.Empty;

    public string SkillsText { get; set; } = string.Empty;

    public int YearsOfExperience { get; set; }

    public decimal ExpectedProjectBudgetMin { get; set; }

    public decimal ExpectedProjectBudgetMax { get; set; }

    public bool AvailableForWork { get; set; }

    public decimal ProfileScore { get; set; }

    public string Level { get; set; } = string.Empty;

    public decimal MatchScore { get; set; }

    public decimal SkillMatchScore { get; set; }

    public decimal ProfileScorePart { get; set; }

    public decimal ExperienceScorePart { get; set; }

    public decimal BudgetFitScorePart { get; set; }

    public int MatchedSkillCount { get; set; }

    public int RequiredSkillCount { get; set; }

    public List<RecommendedExpertSkillResponse> MatchedSkills { get; set; } = new();

    public List<RecommendedExpertSkillResponse> ExpertSkills { get; set; } = new();

    public string MatchReason { get; set; } = string.Empty;

    public string? RiskNote { get; set; }
}

public class RecommendedExpertSkillResponse
{
    public int SkillId { get; set; }

    public string SkillName { get; set; } = string.Empty;

    public string? Category { get; set; }

    public string SkillLevel { get; set; } = string.Empty;

    public int YearsOfExperience { get; set; }

    public bool IsPrimary { get; set; }
}