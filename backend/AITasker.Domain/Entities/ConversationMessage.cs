using System;

namespace AITasker.Domain.Entities
{
    public class ConversationMessage
    {
        public int ConversationMessageId { get; set; }

        public int ConversationId { get; set; }

        public int SenderUserId { get; set; }

        public string Content { get; set; } = string.Empty;

        public string MessageType { get; set; } = "TEXT";

        public string? AttachmentUrl { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Conversation? Conversation { get; set; }

        public User? SenderUser { get; set; }
    }
}