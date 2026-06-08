using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AITasker.Domain.Entities
{
    [Table("Disputes", Schema = "dbo")] 
    public class Dispute
    {
        [Key]
        [Column("DisputeId")] 
        public int Id { get; set; }

        public int ProjectId { get; set; } 
        
        public int? MilestoneId { get; set; }

        public int OpenedByUserId { get; set; }
        
        public int RespondentUserId { get; set; } 
        
        public string Reason { get; set; } = string.Empty;
        
        public decimal DisputedAmount { get; set; } 
        
        public string Status { get; set; } = "OPEN"; 
        
        public string? ResolutionType { get; set; } 
        
        public string? AdminDecision { get; set; }
        
        public DateTime OpenedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? ResolvedAt { get; set; }
    }
}