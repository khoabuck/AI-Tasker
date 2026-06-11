using System;

namespace AITasker.Domain.Entities
{
    public class AiRequestLog
    {
        public int AiRequestLogId { get; set; }
        
        public int? UserId { get; set; }
        
        public string ModuleName { get; set; } = string.Empty;
        
        public string Provider { get; set; } = string.Empty;
        
        public string Prompt { get; set; } = string.Empty;
        
        public string? Response { get; set; }
        
        public string Status { get; set; } = "SUCCESS";
        
        public string? ErrorMessage { get; set; }
        
        public DateTime CreatedAt { get; set; }

        public virtual User? User { get; set; }
    }
}