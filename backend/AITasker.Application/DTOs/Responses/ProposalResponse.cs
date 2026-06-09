namespace AITasker.Application.DTOs.Responses;

public class ProposalResponse
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
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
