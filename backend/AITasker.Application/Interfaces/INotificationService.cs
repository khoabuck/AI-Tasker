using System.Collections.Generic;
using System.Threading.Tasks;
using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces
{
    public interface INotificationService
    {
        Task<List<Notification>> GetNotificationsByUserIdAsync(int userId);
    }
}