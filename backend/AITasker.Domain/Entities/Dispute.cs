using System;

namespace AITasker.Domain.Entities
{
    public class Dispute
    {
        public int DisputeId { get; set; }
        
        public int ProjectId { get; set; }
        
        public int? MilestoneId { get; set; }
        
        public int OpenedByUserId { get; set; }
        
        public int RespondentUserId { get; set; }
        
        public string Reason { get; set; } = string.Empty;
        
        public decimal DisputedAmount { get; set; }
        
        public string Status { get; set; } = "OPEN";
        
        public string? ResolutionType { get; set; }
        
        public string? AdminDecision { get; set; }

        public DateTime CreatedAt { get; set; }
        
        public DateTime? ResolvedAt { get; set; }

        public virtual User OpenedByUser { get; set; } = null!;
        
        public virtual User RespondentUser { get; set; } = null!;
    }
}