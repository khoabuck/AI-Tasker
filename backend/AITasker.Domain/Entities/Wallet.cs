using System;

namespace AITasker.Domain.Entities
{
    public class Wallet
    {
        public Guid WalletId { get; set; } = Guid.NewGuid();
        
        public int UserId { get; set; }
        
        public decimal Balance { get; set; } = 0m;
        
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public User? User { get; set; }
    }
}