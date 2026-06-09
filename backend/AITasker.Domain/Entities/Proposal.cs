namespace AITasker.Domain.Entities;

public class Proposal
{
    public int ProposalId { get; set; }

    public int JobId { get; set; }

    public int ExpertProfileId { get; set; }

    public string CoverLetter { get; set; } = string.Empty;

    public decimal ProposedPrice { get; set; }

    public int ProposedTimelineDays { get; set; }

    public string ExpectedOutputs { get; set; } = string.Empty;

    public string WorkingApproach { get; set; } = string.Empty;

    public string? PreliminaryMilestonePlan { get; set; }

    public decimal? CounterPrice { get; set; }

    public int? CounterTimelineDays { get; set; }

    public string? CounterMessage { get; set; }

    // SUBMITTED / COUNTER_OFFERED / ACCEPTED / REJECTED / WITHDRAWN / NOT_SELECTED
    public string Status { get; set; } = "SUBMITTED";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public JobPosting JobPosting { get; set; } = null!;

    public ExpertProfile ExpertProfile { get; set; } = null!;
}
