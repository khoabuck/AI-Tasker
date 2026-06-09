using System;

namespace AITasker.Domain.Entities
{
    public class Wallet
    {
        public int Id { get; set; }
            
        public int UserId { get; set; }

        public decimal AvailableBalance { get; set; }

        public decimal LockedBalance { get; set; }
        
        public DateTime UpdatedAt { get; set; }
    }
}