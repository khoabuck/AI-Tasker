using System;

namespace AITasker.Domain.Entities
{
    public class Deliverable
    {
        public int DeliverableId { get; set; }
        
        public int MilestoneId { get; set; }
        
        public int ExpertId { get; set; }
        
        public string? FileUrl { get; set; }
        
        public string? DemoUrl { get; set; }
        
        public string Description { get; set; } = string.Empty;
        
        public string? HandoverNotes { get; set; }
        
        public string? TestResultUrl { get; set; }
        
        public string? ClientFeedback { get; set; }
        
        public int VersionNumber { get; set; }
        
        public string Status { get; set; } = "SUBMITTED";
        
        public DateTime SubmittedAt { get; set; }

        public DateTime? ReviewDeadlineAt { get; set; }

        public DateTime? ReviewedAt { get; set; }

        public DateTime? OverdueNotifiedAt { get; set; }

        public virtual ExpertProfile Expert { get; set; } = null!;
    }
}