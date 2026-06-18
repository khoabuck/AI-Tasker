namespace AITasker.Application.DTOs.Requests
{
    public class ResubmitProposalRequest
    {
        public string CoverLetter { get; set; } = string.Empty;

        public decimal ProposedPrice { get; set; }

        public int ProposedTimelineDays { get; set; }

        public string ExpectedOutputs { get; set; } = string.Empty;

        public string WorkingApproach { get; set; } = string.Empty;

        public string? PreliminaryMilestonePlan { get; set; }

        public string? ResubmitNote { get; set; }
    }
}