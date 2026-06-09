namespace AITasker.Application.DTOs.Responses;

public class AiJobSuggestionResult
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> RequiredSkills { get; set; } = new();
    public decimal BudgetMin { get; set; }
    public decimal BudgetMax { get; set; }
    public int TimelineDays { get; set; }
    public string ExpectedDeliverables { get; set; } = string.Empty;
    public string Complexity { get; set; } = "MEDIUM";
    public bool IsFallback { get; set; }
}
