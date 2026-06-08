using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AITasker.Domain.Entities
{
    [Table("Deliverables", Schema = "dbo")] 
    public class Deliverable
    {
        [Key]
        [Column("DeliverableId")] 
        public int Id { get; set; }

        public int MilestoneId { get; set; } 
       
        public int ExpertId { get; set; }
        
        public string Description { get; set; } = string.Empty;
        
        public int VersionNumber { get; set; } 
        
        public string Status { get; set; } = "SUBMITTED"; 
        
        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

        public string? FileUrl { get; set; }
        
        public string? DemoUrl { get; set; }
        
        public string? HandoverNotes { get; set; }
        
        public string? TestResultUrl { get; set; }
        
        public string? ClientFeedback { get; set; }
    }
}