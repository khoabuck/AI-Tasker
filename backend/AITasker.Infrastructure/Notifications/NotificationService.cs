using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AITasker.Infrastructure.Notifications
{
    public class NotificationService : INotificationService
    {
        private readonly AITaskerDbContext _context;
        private readonly INotificationRealtimeService _realtimeService;
        private readonly ILogger<NotificationService> _logger;

        public NotificationService(
            AITaskerDbContext context,
            INotificationRealtimeService realtimeService,
            ILogger<NotificationService> logger)
        {
            _context = context;
            _realtimeService = realtimeService;
            _logger = logger;
        }

        public async Task<NotificationListResponse> GetNotificationsByUserIdAsync(
            int userId)
        {
            await EnsureUserExistsAsync(userId);

            var notifications = await _context.Notifications
                .AsNoTracking()
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            var unreadCount = notifications.Count(n => !n.IsRead);

            return new NotificationListResponse
            {
                TotalCount = notifications.Count,
                UnreadCount = unreadCount,
                Notifications = notifications
                    .Select(MapToResponse)
                    .ToList()
            };
        }

        public async Task<int> GetUnreadCountAsync(
            int userId)
        {
            await EnsureUserExistsAsync(userId);

            return await _context.Notifications
                .AsNoTracking()
                .CountAsync(n => n.UserId == userId && !n.IsRead);
        }

        public async Task<NotificationResponse> CreateNotificationAsync(
            int userId,
            string title,
            string content,
            string type)
        {
            ValidateCreateNotificationInput(
                userId,
                title,
                content,
                type);

            await EnsureUserExistsAsync(userId);

            var notification = new Notification
            {
                UserId = userId,
                Title = title.Trim(),
                Content = content.Trim(),
                Type = type.Trim().ToUpperInvariant(),
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            try
            {
                await _realtimeService.SendNotificationAsync(
                    userId,
                    notification.NotificationId,
                    notification.Title,
                    notification.Content,
                    notification.Type,
                    notification.CreatedAt);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "SignalR notification failed. NotificationId={NotificationId}, UserId={UserId}",
                    notification.NotificationId,
                    userId);
            }

            return MapToResponse(notification);
        }

        public async Task<NotificationResponse> MarkAsReadAsync(
            int notificationId,
            int userId)
        {
            await EnsureUserExistsAsync(userId);

            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n =>
                    n.NotificationId == notificationId &&
                    n.UserId == userId);

            if (notification == null)
            {
                throw new InvalidOperationException("Notification not found or access denied.");
            }

            if (!notification.IsRead)
            {
                notification.IsRead = true;
                await _context.SaveChangesAsync();
            }

            return MapToResponse(notification);
        }

        public async Task<int> MarkAllAsReadAsync(
            int userId)
        {
            await EnsureUserExistsAsync(userId);

            var unreadNotifications = await _context.Notifications
                .Where(n => n.UserId == userId && !n.IsRead)
                .ToListAsync();

            if (!unreadNotifications.Any())
            {
                return 0;
            }

            foreach (var notification in unreadNotifications)
            {
                notification.IsRead = true;
            }

            await _context.SaveChangesAsync();

            return unreadNotifications.Count;
        }

        private static void ValidateCreateNotificationInput(
            int userId,
            string title,
            string content,
            string type)
        {
            if (userId <= 0)
            {
                throw new InvalidOperationException("Notification userId is invalid.");
            }

            if (string.IsNullOrWhiteSpace(title))
            {
                throw new InvalidOperationException("Notification title is required.");
            }

            if (string.IsNullOrWhiteSpace(content))
            {
                throw new InvalidOperationException("Notification content is required.");
            }

            if (string.IsNullOrWhiteSpace(type))
            {
                throw new InvalidOperationException("Notification type is required.");
            }

            if (title.Trim().Length > 255)
            {
                throw new InvalidOperationException("Notification title cannot exceed 255 characters.");
            }

            if (type.Trim().Length > 50)
            {
                throw new InvalidOperationException("Notification type cannot exceed 50 characters.");
            }
        }

        private async Task EnsureUserExistsAsync(int userId)
        {
            var exists = await _context.Users
                .AsNoTracking()
                .AnyAsync(u => u.UserId == userId);

            if (!exists)
            {
                throw new InvalidOperationException("Notification target user not found.");
            }
        }

        private static NotificationResponse MapToResponse(Notification notification)
        {
            return new NotificationResponse
            {
                NotificationId = notification.NotificationId,
                UserId = notification.UserId,
                Title = notification.Title,
                Content = notification.Content,
                Type = notification.Type,
                IsRead = notification.IsRead,
                CreatedAt = notification.CreatedAt
            };
        }
    }
}