using System;

namespace AITasker.Domain.Entities
{
    public class Transaction
    {
        public Guid TransactionId { get; set; } = Guid.NewGuid();
        
        public int UserId { get; set; }
        
        public decimal Amount { get; set; } 
        
        public string Type { get; set; } = string.Empty;
        
        public string Description { get; set; } = string.Empty;
        
        public string ReferenceId { get; set; } = string.Empty;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}