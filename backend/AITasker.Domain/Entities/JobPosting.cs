namespace AITasker.Domain.Entities;

public class JobPosting
{
    public int JobId { get; set; }

    public int ClientProfileId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string? AIgeneratedDescription { get; set; }

    public decimal BudgetMin { get; set; }

    public decimal BudgetMax { get; set; }

    // OPENING / ACTIVE / COMPLETED / CANCEL
    public string Status { get; set; } = "DRAFT";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public ClientProfile ClientProfile { get; set; } = null!;

    public ICollection<JobSkill> JobSkills { get; set; } = new List<JobSkill>();
}
