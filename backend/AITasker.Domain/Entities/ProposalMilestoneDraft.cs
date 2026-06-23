using System;

namespace AITasker.Domain.Entities
{
    public class ProposalMilestoneDraft
    {
        public int ProposalMilestoneDraftId { get; set; }

        public int ProposalId { get; set; }

        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string ExpectedDeliverable { get; set; } = string.Empty;

        public string AcceptanceCriteria { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public int OrderIndex { get; set; }

        public int DeadlineOffsetDays { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Proposal? Proposal { get; set; }
    }
}