namespace AITasker.Application.DTOs.Responses;

public class JobResponse
{
    public int JobId { get; set; }
    public int ClientProfileId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? AIgeneratedDescription { get; set; }
    public decimal BudgetMin { get; set; }
    public decimal BudgetMax { get; set; }
    public DateTime Deadline { get; set; }
    public string ProjectType { get; set; } = string.Empty;
    public string Complexity { get; set; } = string.Empty;
    public string ExpectedDeliverables { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public bool IsAIAssisted { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public List<JobSkillResponse> Skills { get; set; } = new();
}
