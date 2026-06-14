using System;

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
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Project Project { get; set; } = null!;
        public User Client { get; set; } = null!;
        public User Expert { get; set; } = null!;
    }
}