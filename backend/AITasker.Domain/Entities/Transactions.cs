using System;

namespace AITasker.Domain.Entities
{
    public class Transaction
    {
        public int TransactionId { get; set; }
        
        public int? EscrowId { get; set; }
        
        public int ProjectId { get; set; }
        
        public int? MilestoneId { get; set; }
        
        public int UserId { get; set; }
        
        public string Type { get; set; } = string.Empty;
        
        public decimal Amount { get; set; }
        
        public string Status { get; set; } = "PENDING";
        
        public string Description { get; set; } = string.Empty;
        
        public string? ReferenceId { get; set; }
        
        public DateTime CreatedAt { get; set; }

        public virtual User User { get; set; } = null!;
    }
}