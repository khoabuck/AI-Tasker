using System;

namespace AITasker.Domain.Entities
{
    public class Proposal
    {
        public int ProposalId { get; set; }

        public int JobId { get; set; }

        public int ExpertId { get; set; }

        public string CoverLetter { get; set; } = string.Empty;

        public decimal ProposedPrice { get; set; }

        public int ProposedTimelineDays { get; set; }

        public string ExpectedOutputs { get; set; } = string.Empty;

        public string WorkingApproach { get; set; } = string.Empty;

        public string? PreliminaryMilestonePlan { get; set; }

        public decimal? CounterPrice { get; set; }

        public int? CounterTimelineDays { get; set; }

        public string? CounterMessage { get; set; }

        public string Status { get; set; } = "SUBMITTED";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ProjectContract? ProjectContract { get; set; }

        public JobPosting? JobPosting { get; set; }

        public ExpertProfile? ExpertProfile { get; set; }
    }
}