namespace AITasker.Application.DTOs.Requests
{
    public class SendConversationMessageRequest
    {
        public string Content { get; set; } = string.Empty;

        public string? MessageType { get; set; }

        public string? AttachmentUrl { get; set; }
    }
}