using System;

namespace AITasker.Domain.Entities
{
    public class Wallet
    {
        public int WalletId { get; set; }
        
        public int UserId { get; set; }
        
        public decimal AvailableBalance { get; set; }
        
        public decimal LockedBalance { get; set; }

        public decimal PendingEarningsBalance { get; set; }
        
        public decimal TotalEarning { get; set; }
        
        public DateTime UpdatedAt { get; set; }

        public virtual User User { get; set; } = null!;
    }
}