using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AITasker.Domain.Entities
{
    [Table("Notifications", Schema = "dbo")]
    public class Notification
    {
        [Key]
        [Column("NotificationId")]
        public int Id { get; set; }
        
        public int UserId { get; set; }
        
        public string Title { get; set; } = string.Empty;
        
        public string Content { get; set; } = string.Empty; 
        
        public string Type { get; set; } = "SYSTEM"; 
        
        public bool IsRead { get; set; } = false;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}