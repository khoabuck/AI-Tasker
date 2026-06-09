using System;

namespace AITasker.Domain.Entities
{
    public class Dispute
    {
        public int Id { get; set; }

        public string ProjectId { get; set; } = string.Empty;

        public int OpenedByUserId { get; set; }

        public string Reason { get; set; } = string.Empty;

        public string EvidenceUrl { get; set; } = string.Empty;

        public string Status { get; set; } = "OPEN";
        
        public DateTime OpenedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? ResolvedAt { get; set; }
    }
}