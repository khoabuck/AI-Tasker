using AITasker.Api.Hubs;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace AITasker.Api.Realtime
{
    public class NotificationRealtimeService : INotificationRealtimeService
    {
        private readonly IHubContext<NotificationHub> _hubContext;

        public NotificationRealtimeService(
            IHubContext<NotificationHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task SendNotificationAsync(
            int userId,
            int notificationId,
            string title,
            string content,
            string type,
            DateTime createdAt)
        {
            await _hubContext
                .Clients
                .Group($"User_{userId}")
                .SendAsync("ReceiveNotification", new
                {
                    notificationId,
                    userId,
                    title,
                    content,
                    type,
                    isRead = false,
                    createdAt
                });
        }
    }
}