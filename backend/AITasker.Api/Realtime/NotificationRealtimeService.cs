using AITasker.Api.Hubs;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace AITasker.Api.Realtime
{
    public class NotificationRealtimeService : INotificationRealtimeService
    {
        private const string VietnamTimeZoneId = "SE Asia Standard Time";
        private const string VietnamTimeZoneName = "Asia/Ho_Chi_Minh";

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
            var createdAtUtc = SpecifyUtc(createdAt);
            var createdAtVietnam = ConvertUtcToVietnamTime(createdAtUtc);

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
                    createdAt = createdAtVietnam,
                    createdAtUtc,

                    timeZone = VietnamTimeZoneName
                });
        }

        private static DateTime SpecifyUtc(DateTime value)
        {
            if (value.Kind == DateTimeKind.Utc)
            {
                return value;
            }

            return DateTime.SpecifyKind(value, DateTimeKind.Utc);
        }

        private static DateTime ConvertUtcToVietnamTime(DateTime utcDateTime)
        {
            try
            {
                var timeZone = TimeZoneInfo.FindSystemTimeZoneById(VietnamTimeZoneId);
                return TimeZoneInfo.ConvertTimeFromUtc(utcDateTime, timeZone);
            }
            catch (TimeZoneNotFoundException)
            {
                return utcDateTime.AddHours(7);
            }
            catch (InvalidTimeZoneException)
            {
                return utcDateTime.AddHours(7);
            }
        }
    }
}