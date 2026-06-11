namespace AITasker.Application.DTOs.Requests;

public class JobAssistantRequest
{
    public string RawRequirement { get; set; } = string.Empty;

    public decimal? BudgetMin { get; set; }

    public decimal? BudgetMax { get; set; }

    public DateTime? Deadline { get; set; }

    public string? ProjectTypeHint { get; set; }
}