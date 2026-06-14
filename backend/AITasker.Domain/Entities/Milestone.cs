using System;

namespace AITasker.Domain.Entities
{
    public class Milestone
    {
        public int MilestoneId { get; set; }

        public int ProjectId { get; set; }

        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string ExpectedDeliverable { get; set; } = string.Empty;

        public string AcceptanceCriteria { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public int OrderIndex { get; set; }

        public DateTime Deadline { get; set; }

        public int RevisionLimit { get; set; }

        public int RevisionUsed { get; set; }

        public string PaymentStatus { get; set; } = "PENDING";

        public string Status { get; set; } = "PENDING";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Project? Project { get; set; }
    }
}