using System;

namespace AITasker.Domain.Entities
{
    public class ReviewReport
    {
        public int ReviewReportId { get; set; }

        public int ReviewId { get; set; }

        public int ProjectId { get; set; }

        public int ExpertUserId { get; set; }

        public string Reason { get; set; } = string.Empty;

        // OPEN / ACCEPTED / REJECTED
        public string Status { get; set; } = "OPEN";

        public string? AdminDecision { get; set; }

        public int? ResolvedByAdminId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ResolvedAt { get; set; }

        public Review Review { get; set; } = null!;

        public Project Project { get; set; } = null!;

        public User ExpertUser { get; set; } = null!;

        public User? ResolvedByAdmin { get; set; }
    }
}
