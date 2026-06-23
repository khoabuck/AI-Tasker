namespace AITasker.Application.DTOs.Requests
{
    public class SubmitProposalRequest
    {
        public int JobId { get; set; }

        public string CoverLetter { get; set; } = string.Empty;

        public decimal ProposedPrice { get; set; }

        public int ProposedTimelineDays { get; set; }

        public string ExpectedOutputs { get; set; } = string.Empty;

        public string WorkingApproach { get; set; } = string.Empty;

        public string? PreliminaryMilestonePlan { get; set; }

        public List<ProposalMilestoneDraftItemRequest> Milestones { get; set; } = new();
    }

    public class ProposalMilestoneDraftItemRequest
    {
        public string Title { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public int DurationDays { get; set; }
    }
}