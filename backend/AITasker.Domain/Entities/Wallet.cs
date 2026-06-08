using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AITasker.Domain.Entities
{
    [Table("Wallets", Schema = "dbo")]
    public class Wallet
    {
        [Key]
        [Column("WalletId")] 
        public int Id { get; set; }

        public int UserId { get; set; }
        
        public decimal AvailableBalance { get; set; }
        
        public decimal LockedBalance { get; set; }
        
        public decimal TotalEarning { get; set; } 
        
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}