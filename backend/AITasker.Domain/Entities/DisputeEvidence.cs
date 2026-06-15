using System;

namespace AITasker.Domain.Entities
{
    public class DisputeEvidence
    {
        public int EvidenceId { get; set; }

        public int DisputeId { get; set; }

        public int UploadedByUserId { get; set; }

        public string EvidenceText { get; set; } = string.Empty;

        public string? FileUrl { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Dispute? Dispute { get; set; }

        public User? UploadedByUser { get; set; }
    }
}