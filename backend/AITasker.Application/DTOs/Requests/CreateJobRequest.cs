namespace AITasker.Application.DTOs.Requests;

public class CreateJobRequest
{
    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string? AiGeneratedDescription { get; set; }

    public decimal BudgetMin { get; set; }

    public decimal BudgetMax { get; set; }

    public DateTime Deadline { get; set; }

    public string ProjectType { get; set; } = string.Empty;

    public string Complexity { get; set; } = "MEDIUM";

    public string ExpectedDeliverables { get; set; } = string.Empty;

    public bool IsAiAssisted { get; set; }

    public List<int> SkillIds { get; set; } = new();
}