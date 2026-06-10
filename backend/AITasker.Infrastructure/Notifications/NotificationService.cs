using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AITasker.Infrastructure.Notifications
{
    public class NotificationService : INotificationService
    {
        private readonly AITaskerDbContext _context;
        private readonly INotificationRealtimeService _realtimeService;

        public NotificationService(AITaskerDbContext context, INotificationRealtimeService realtimeService)
        {
            _context = context;
            _realtimeService = realtimeService;
        }

        public async Task<List<Notification>> GetNotificationsByUserIdAsync(int userId)
        {
            return await _context.Notifications
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();
        }

        public async Task<Notification?> CreateNotificationAsync(int userId, string title, string content, string type)
        {
            try
            {
                var notification = new Notification
                {
                    UserId = userId,
                    Title = title,
                    Content = content,
                    Type = type,
                    IsRead = false, 
                    CreatedAt = DateTime.UtcNow
                };

                _context.Notifications.Add(notification);
                await _context.SaveChangesAsync();

                await _realtimeService.SendNotificationAsync(
                    userId, 
                    notification.Id, 
                    notification.Title, 
                    notification.Content, 
                    notification.Type, 
                    notification.CreatedAt
                );

                return notification;
            }
            catch (Exception)
            {
                return null;
            }
        }

        public async Task<bool> MarkAsReadAsync(int notificationId, int userId)
        {
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);
            
            if (notification == null) return false;

            notification.IsRead = true; 
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> MarkAllAsReadAsync(int userId)
        {
            var unreadNotifications = await _context.Notifications
                .Where(n => n.UserId == userId && !n.IsRead)
                .ToListAsync();

            if (!unreadNotifications.Any()) return true;

            foreach (var noti in unreadNotifications)
            {
                noti.IsRead = true;
            }

            return await _context.SaveChangesAsync() > 0;
        }
    }
}