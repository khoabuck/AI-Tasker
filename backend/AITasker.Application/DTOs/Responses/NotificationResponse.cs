namespace AITasker.Application.DTOs.Responses
{
    public class NotificationResponse
    {
        public int NotificationId { get; set; }

        public int UserId { get; set; }

        public string Title { get; set; } = string.Empty;

        public string Content { get; set; } = string.Empty;

        public string Type { get; set; } = string.Empty;

        public bool IsRead { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime CreatedAtUtc { get; set; }

        public string TimeZone { get; set; } = "Asia/Ho_Chi_Minh";
    }
}