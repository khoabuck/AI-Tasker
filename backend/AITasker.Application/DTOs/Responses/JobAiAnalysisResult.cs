namespace AITasker.Application.DTOs.Responses;

public class JobAiAnalysisResult
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

    public string BudgetSuggestionNote { get; set; } = string.Empty;

    public string ExpectedDeliverables { get; set; } = string.Empty;

    public List<string> SuggestedSkillNames { get; set; } = new();

    public List<string> Warnings { get; set; } = new();
}
