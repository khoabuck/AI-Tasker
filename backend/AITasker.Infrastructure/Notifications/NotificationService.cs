using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Domain.Constants;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;

namespace AITasker.Infrastructure.Notifications
{
    public class NotificationService : INotificationService
    {
        private readonly AITaskerDbContext _context;
        private readonly INotificationRealtimeService _realtimeService;
        private readonly ILogger<NotificationService> _logger;
        private readonly IServiceScopeFactory _scopeFactory;

        public NotificationService(
            AITaskerDbContext context,
            INotificationRealtimeService realtimeService,
            ILogger<NotificationService> logger,
            IServiceScopeFactory scopeFactory)
        {
            _context = context;
            _realtimeService = realtimeService;
            _logger = logger;
            _scopeFactory = scopeFactory;
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
            int? relatedConversationId = null)
        {
            ValidateCreateNotificationInput(
                userId,
                title,
                content,
                type);

            Notification notification;

            await using (var scope = _scopeFactory.CreateAsyncScope())
            {
                var notificationContext = scope.ServiceProvider
                    .GetRequiredService<AITaskerDbContext>();

                await EnsureUserExistsAsync(notificationContext, userId);

                notification = new Notification
                {
                    UserId = userId,
                    Title = title.Trim(),
                    Content = content.Trim(),
                    Type = type.Trim().ToUpperInvariant(),

                    RelatedEntityType = string.IsNullOrWhiteSpace(relatedEntityType)
                        ? null
                        : relatedEntityType.Trim().ToUpperInvariant(),
                    RelatedEntityId = relatedEntityId,
                    RelatedJobId = relatedJobId,
                    RelatedProposalId = relatedProposalId,
                    RelatedContractId = relatedContractId,
                    RelatedProjectId = relatedProjectId,
                    RelatedMilestoneId = relatedMilestoneId,
                    RelatedDeliverableId = relatedDeliverableId,
                    RelatedDisputeId = relatedDisputeId,
                    RelatedConversationId = relatedConversationId,

                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };

                notificationContext.Notifications.Add(notification);
                await notificationContext.SaveChangesAsync();
            }

            var response = MapToResponse(notification);

            try
            {
                await _realtimeService.SendNotificationAsync(
                    userId,
                    notification.NotificationId,
                    notification.Title,
                    notification.Content,
                    notification.Type,
                    notification.CreatedAt,
                    notification.RelatedEntityType,
                    notification.RelatedEntityId,
                    notification.RelatedJobId,
                    notification.RelatedProposalId,
                    notification.RelatedContractId,
                    notification.RelatedProjectId,
                    notification.RelatedMilestoneId,
                    notification.RelatedDeliverableId,
                    notification.RelatedDisputeId,
                    notification.RelatedConversationId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "SignalR notification failed. NotificationId={NotificationId}, UserId={UserId}",
                    notification.NotificationId,
                    userId);
            }

            return response;
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

        public async Task<NotificationDetailResponse> GetNotificationDetailAsync(
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

            var response = new NotificationDetailResponse
            {
                Notification = MapToResponse(notification)
            };

            if (notification.Type == NotificationTypes.JobDailyDigest)
            {
                response.JobDigest = await BuildJobDigestPayloadAsync(notification);
            }

            return response;
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

        private Task EnsureUserExistsAsync(int userId)
        {
            return EnsureUserExistsAsync(_context, userId);
        }

        private static async Task EnsureUserExistsAsync(
            AITaskerDbContext context,
            int userId)
        {
            var exists = await context.Users
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
                RelatedEntityType = notification.RelatedEntityType,
                RelatedEntityId = notification.RelatedEntityId,
                RelatedJobId = notification.RelatedJobId,
                RelatedProposalId = notification.RelatedProposalId,
                RelatedContractId = notification.RelatedContractId,
                RelatedProjectId = notification.RelatedProjectId,
                RelatedMilestoneId = notification.RelatedMilestoneId,
                RelatedDeliverableId = notification.RelatedDeliverableId,
                RelatedDisputeId = notification.RelatedDisputeId,
                RelatedConversationId = notification.RelatedConversationId,
                IsRead = notification.IsRead,
                CreatedAt = notification.CreatedAt
            };
        }

        private async Task<JobDigestNotificationPayload> BuildJobDigestPayloadAsync(
            Notification notification)
        {
            var windowEndUtc = notification.CreatedAt;
            var windowStartUtc = windowEndUtc.AddHours(-24);

            var jobsQuery = _context.JobPostings
                .AsNoTracking()
                .Include(j => j.JobSkills)
                    .ThenInclude(js => js.Skill)
                .Where(j =>
                    j.CreatedAt >= windowStartUtc &&
                    j.CreatedAt < windowEndUtc &&
                    j.Status == "OPEN");

            var totalJobs = await jobsQuery.CountAsync();

            var jobs = await jobsQuery
                .OrderByDescending(j => j.CreatedAt)
                .Take(10)
                .ToListAsync();

            return new JobDigestNotificationPayload
            {
                WindowStart = windowStartUtc,
                WindowEnd = windowEndUtc,
                TotalJobs = totalJobs,
                DisplayedJobs = jobs.Count,
                Jobs = jobs.Select(j => new JobDigestJobItemResponse
                {
                    JobPostingId = j.JobPostingId,
                    Title = j.Title,
                    BudgetMin = j.BudgetMin,
                    BudgetMax = j.BudgetMax,
                    ProjectType = j.ProjectType,
                    Complexity = j.Complexity,
                    Status = j.Status,
                    Deadline = j.Deadline,
                    CreatedAt = j.CreatedAt,
                    Skills = j.JobSkills.Select(js => new JobSkillResponse
                    {
                        SkillId = js.SkillId,
                        SkillName = js.Skill != null ? js.Skill.SkillName : string.Empty,
                        Category = js.Skill?.Category
                    }).ToList()
                }).ToList()
            };
        }
    }
}