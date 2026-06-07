using System;

namespace AITasker.Domain.Entities
{
    public class AiRequestLog
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Feature { get; set; } = string.Empty;
        public string RequestBody { get; set; } = string.Empty;
        public string ResponseBody { get; set; } = string.Empty;
        public string Status { get; set; } = "Success";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}