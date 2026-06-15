namespace AITasker.Application.DTOs.Responses
{
    public class NotificationListResponse
    {
        public int TotalCount { get; set; }

        public int UnreadCount { get; set; }

        public List<NotificationResponse> Notifications { get; set; } = new();
    }
}