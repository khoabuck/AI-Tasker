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
            DateTime createdAt,
            string? relatedEntityType = null,
            int? relatedEntityId = null,
            int? relatedJobId = null,
            int? relatedProposalId = null,
            int? relatedContractId = null,
            int? relatedProjectId = null,
            int? relatedMilestoneId = null,
            int? relatedDeliverableId = null,
            int? relatedDisputeId = null,
            int? relatedConversationId = null)
        {
            if (createdAt.Kind != DateTimeKind.Utc)
            {
                throw new InvalidOperationException(
                    "Realtime notification timestamps must be UTC.");
            }

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
                    relatedEntityType,
                    relatedEntityId,
                    relatedJobId,
                    relatedProposalId,
                    relatedContractId,
                    relatedProjectId,
                    relatedMilestoneId,
                    relatedDeliverableId,
                    relatedDisputeId,
                    relatedConversationId,
                    isRead = false,
                    createdAt
                });
        }
    }
}
