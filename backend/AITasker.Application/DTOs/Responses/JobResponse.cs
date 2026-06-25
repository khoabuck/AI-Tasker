namespace AITasker.Application.DTOs.Responses;

public class JobResponse
{
    public int JobPostingId { get; set; }

    public int ClientProfileId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string? AiGeneratedDescription { get; set; }

    public decimal BudgetMin { get; set; }

    public decimal BudgetMax { get; set; }

    public DateTime Deadline { get; set; }

    public string ProjectType { get; set; } = string.Empty;

    public string Complexity { get; set; } = string.Empty;

    public string ExpectedDeliverables { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public bool IsAiAssisted { get; set; }

    public string PostingChargeType { get; set; } = string.Empty;

    public DateTime? PublishedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public List<JobSkillResponse> Skills { get; set; } = new();
}

public class JobSkillResponse
{
    public int SkillId { get; set; }

    public string SkillName { get; set; } = string.Empty;

    public string? Category { get; set; }
}