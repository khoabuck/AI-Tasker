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
            string type);

        Task<NotificationResponse> MarkAsReadAsync(
            int notificationId,
            int userId);

        Task<int> MarkAllAsReadAsync(
            int userId);
    }
}