using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces
{
    public interface INotificationService
    {
        Task<NotificationListResponse> GetNotificationsByUserIdAsync(
            int userId);

        Task<int> GetUnreadCountAsync(
            int userId);

        Task<NotificationResponse> CreateNotificationAsync(
            int userId,
            string title,
            string content,
            string type,
            string? relatedEntityType = null,
            int? relatedEntityId = null,
            int? relatedJobId = null,
            int? relatedProposalId = null,
            int? relatedContractId = null,
            int? relatedProjectId = null,
            int? relatedMilestoneId = null,
            int? relatedDeliverableId = null,
            int? relatedDisputeId = null,
            int? relatedConversationId = null);

        Task<NotificationResponse> MarkAsReadAsync(
            int notificationId,
            int userId);

        Task<int> MarkAllAsReadAsync(
            int userId);

        Task<NotificationDetailResponse> GetNotificationDetailAsync(
            int notificationId,
            int userId);
    }
}