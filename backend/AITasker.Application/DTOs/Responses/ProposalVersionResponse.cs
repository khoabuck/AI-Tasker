namespace AITasker.Application.DTOs.Responses
{
    public class ProposalVersionResponse
    {
        public int ProposalVersionId { get; set; }

        public int ProposalId { get; set; }

        public int VersionNumber { get; set; }

        public string CoverLetter { get; set; } = string.Empty;

        public decimal ProposedPrice { get; set; }

        public int ProposedTimelineDays { get; set; }

        public string ExpectedOutputs { get; set; } = string.Empty;

        public string WorkingApproach { get; set; } = string.Empty;

        public string? PreliminaryMilestonePlan { get; set; }

        public string? MilestonePlanJson { get; set; }

        public string? ResubmitNote { get; set; }

        public int CreatedByUserId { get; set; }

        public string CreatedByName { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }
    }
}