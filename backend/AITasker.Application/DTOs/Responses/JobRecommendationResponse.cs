namespace AITasker.Application.DTOs.Responses;

public class JobRecommendationResponse
{
    public int JobPostingId { get; set; }

    public int ClientProfileId { get; set; }

    public int ClientUserId { get; set; }

    public string ClientName { get; set; } = string.Empty;

    public string? ClientAvatarUrl { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public decimal BudgetMin { get; set; }

    public decimal BudgetMax { get; set; }

    public DateTime Deadline { get; set; }

    public string ProjectType { get; set; } = string.Empty;

    public string Complexity { get; set; } = string.Empty;

    public string ExpectedDeliverables { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public bool IsAiAssisted { get; set; }

    public DateTime CreatedAt { get; set; }

    public decimal MatchScore { get; set; }

    public decimal SkillMatchScore { get; set; }

    public decimal BudgetFitScorePart { get; set; }

    public decimal DeadlineUrgencyPart { get; set; }

    public decimal ComplexityFitPart { get; set; }

    public int MatchedSkillCount { get; set; }

    public int RequiredSkillCount { get; set; }

    public List<RecommendedJobSkillResponse> MatchedSkills { get; set; } = new();

    public List<RecommendedJobSkillResponse> RequiredSkills { get; set; } = new();

    public string MatchReason { get; set; } = string.Empty;

    public string? RiskNote { get; set; }
}

public class RecommendedJobSkillResponse
{
    public int SkillId { get; set; }

    public string SkillName { get; set; } = string.Empty;

    public string? Category { get; set; }
}