namespace AITasker.Domain.Entities;

public class JobPosting
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

    public string Complexity { get; set; } = "MEDIUM";

    public string ExpectedDeliverables { get; set; } = string.Empty;

    public string Status { get; set; } = "DRAFT";

    public bool IsAiAssisted { get; set; } = false;

    public string PostingChargeType { get; set; } = "NONE";

    public DateTime? PublishedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public ClientProfile? ClientProfile { get; set; }

    public ICollection<JobSkill> JobSkills { get; set; } = new List<JobSkill>();
}