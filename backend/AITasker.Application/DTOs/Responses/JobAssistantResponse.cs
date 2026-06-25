namespace AITasker.Application.DTOs.Responses;

public class JobAssistantResponse
{
    public string SuggestedTitle { get; set; } = string.Empty;

    public string ImprovedDescription { get; set; } = string.Empty;

    public string AiGeneratedDescription { get; set; } = string.Empty;

    public string SuggestedProjectType { get; set; } = string.Empty;

    public string SuggestedComplexity { get; set; } = "UNKNOWN";

    public decimal? SuggestedBudgetMin { get; set; }

    public decimal? SuggestedBudgetMax { get; set; }

    // FORM | RAW_REQUIREMENT | AI_ESTIMATE | UNKNOWN
    public string SuggestedBudgetSource { get; set; } = "UNKNOWN";

    public bool IsBudgetEstimated { get; set; }

    public string BudgetSuggestionNote { get; set; } = string.Empty;

    public string ExpectedDeliverables { get; set; } = string.Empty;

    public List<int> SuggestedSkillIds { get; set; } = new();

    public List<JobAssistantSkillResponse> SuggestedSkills { get; set; } = new();

    public List<string> Warnings { get; set; } = new();

    public int RemainingFreeAiGenerationCredits { get; set; }

    public int RemainingPaidAiGenerationCredits { get; set; }
}

public class JobAssistantSkillResponse
{
    public int SkillId { get; set; }

    public string SkillName { get; set; } = string.Empty;

    public string? Category { get; set; }
}
