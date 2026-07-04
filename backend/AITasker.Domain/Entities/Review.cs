using System;
using System.Collections.Generic;

namespace AITasker.Domain.Entities
{
    public class Review
    {
        public int ReviewId { get; set; }
        public int ProjectId { get; set; }
        public int ClientId { get; set; }
        public int ExpertId { get; set; }
        public int Rating { get; set; }
        public string? Comment { get; set; }

        // VISIBLE / HIDDEN
        public string Status { get; set; } = "VISIBLE";

        public string? HiddenReason { get; set; }

        public DateTime? HiddenAt { get; set; }

        public int? HiddenByAdminId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Project Project { get; set; } = null!;
        public User Client { get; set; } = null!;
        public User Expert { get; set; } = null!;
        public User? HiddenByAdmin { get; set; }

        public ICollection<ReviewReport> ReviewReports { get; set; } = new List<ReviewReport>();
    }
}
