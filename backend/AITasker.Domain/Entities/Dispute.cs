using System;
using System.Collections.Generic;

namespace AITasker.Domain.Entities
{
    public class Dispute
    {
        public int DisputeId { get; set; }

        public int ProjectId { get; set; }

        public int? MilestoneId { get; set; }

        public int? DeliverableId { get; set; }

        public int OpenedByUserId { get; set; }

        public int RespondentUserId { get; set; }

        public string Reason { get; set; } = string.Empty;

        public decimal DisputedAmount { get; set; }

        public string Status { get; set; } = "OPEN";

        public string? ResolutionType { get; set; }

        public string? AdminDecision { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ResolvedAt { get; set; }

        public string? PostResolutionDecision { get; set; }

        public DateTime? PostResolutionDecisionAt { get; set; }

        public int? PostResolutionDecisionByUserId { get; set; }

        public Project? Project { get; set; }

        public Milestone? Milestone { get; set; }

        public Deliverable? Deliverable { get; set; }

        public User OpenedByUser { get; set; } = null!;

        public User RespondentUser { get; set; } = null!;

        public ICollection<DisputeEvidence> Evidences { get; set; } = new List<DisputeEvidence>();
    }
}