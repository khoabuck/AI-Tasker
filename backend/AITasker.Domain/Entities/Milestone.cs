using System;

namespace AITasker.Domain.Entities
{
    public class Milestone
    {
        public int MilestoneId { get; set; }
        
        public int ProjectId { get; set; }
        
        public string Title { get; set; } = string.Empty;
        
        public string Description { get; set; } = string.Empty;
        
        public decimal Amount { get; set; }
        
        public DateTime Deadline { get; set; }
        
        public string Status { get; set; } = "PENDING";
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public Project? Project { get; set; }
    }
}