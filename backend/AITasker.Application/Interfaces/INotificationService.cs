using System.Collections.Generic;
using System.Threading.Tasks;
using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces
{
    public interface INotificationService
    {
        Task<List<Notification>> GetNotificationsByUserIdAsync(int userId);
        
        Task<Notification?> CreateNotificationAsync(int userId, string title, string content, string type);
        
        Task<bool> MarkAsReadAsync(int notificationId, int userId);
        
        Task<bool> MarkAllAsReadAsync(int userId);
    }
}