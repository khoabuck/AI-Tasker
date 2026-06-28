namespace AITasker.Application.DTOs.Responses
{
    public class ConversationMessageResponse
    {
        public int ConversationMessageId { get; set; }

        public int ConversationId { get; set; }

        public int SenderUserId { get; set; }

        public string SenderName { get; set; } = string.Empty;

        public string SenderRole { get; set; } = string.Empty;

        public string? SenderAvatarUrl { get; set; }

        public string Content { get; set; } = string.Empty;

        public string MessageType { get; set; } = string.Empty;

        public string? AttachmentUrl { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime CreatedAtUtc { get; set; }

        public string TimeZone { get; set; } = "Asia/Ho_Chi_Minh";
    }
}