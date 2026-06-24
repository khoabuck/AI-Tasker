using System;
using System.Threading.Tasks;

namespace AITasker.Application.Interfaces
{
    public interface INotificationRealtimeService
    {
        Task SendNotificationAsync(int userId, int notificationId, string title, string content, string type, DateTime createdAt);
    }
}
