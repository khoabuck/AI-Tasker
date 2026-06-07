using System;

namespace AITasker.Domain.Entities
{
    public class Deliverable
    {
        public int Id { get; set; }
        
        public string ProjectId { get; set; } = string.Empty;
        
        public int ExpertId { get; set; }
        
        public int Version { get; set; } = 1;
        
        public string FileUrl { get; set; } = string.Empty;
        
        public string Description { get; set; } = string.Empty;
        
        public string Status { get; set; } = "PENDING"; 
        
        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    }
}