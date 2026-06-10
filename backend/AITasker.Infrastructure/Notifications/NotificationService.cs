using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AITasker.Infrastructure.Notifications
{
    public class NotificationService : INotificationService
    {
        private readonly AITaskerDbContext _context;

        public NotificationService(AITaskerDbContext context)
        {
            _context = context;
        }

        public async Task<List<Notification>> GetNotificationsByUserIdAsync(int userId)
        {
            return await _context.Notifications
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();
        }
    }
}