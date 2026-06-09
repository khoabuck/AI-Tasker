namespace AITasker.Domain.Entities;

public class Project
{
    public int ProjectId { get; set; }

    public int ClientProfileId { get; set; }

    public int ExpertProfileId { get; set; }

    public int? ProposalId { get; set; }

    public decimal? TotalAmount { get; set; }

    public DateTime? StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    // PENDING_ESCROW / ACTIVE / COMPLETED / CANCELLED / DISPUTED
    public string Status { get; set; } = "PENDING_ESCROW";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ClientProfile ClientProfile { get; set; } = null!;

    public ExpertProfile ExpertProfile { get; set; } = null!;
}
