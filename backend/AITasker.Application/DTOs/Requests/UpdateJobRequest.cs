namespace AITasker.Application.DTOs.Requests;

public class UpdateJobRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? AIgeneratedDescription { get; set; }
    public decimal BudgetMin { get; set; }
    public decimal BudgetMax { get; set; }
    public DateTime Deadline { get; set; }
    public string ProjectType { get; set; } = string.Empty;
    public string Complexity { get; set; } = "MEDIUM";
    public string ExpectedDeliverables { get; set; } = string.Empty;
    public bool IsAIAssisted { get; set; }
    public List<CreateJobSkillItem> Skills { get; set; } = new();
}
