using System.Security.Claims;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    [Authorize]
    public class NotificationController : ControllerBase
    {
        private readonly INotificationService _notificationService;
        private readonly IJobDigestNotificationService _jobDigestNotificationService;

        public NotificationController(
            INotificationService notificationService,
            IJobDigestNotificationService jobDigestNotificationService)
        {
            _notificationService = notificationService;
            _jobDigestNotificationService = jobDigestNotificationService;
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetMyNotifications()
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var result = await _notificationService.GetNotificationsByUserIdAsync(
                    currentUserId);

                return Ok(new
                {
                    success = true,
                    data = result.Notifications,
                    totalCount = result.TotalCount,
                    unreadCount = result.UnreadCount
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        [HttpGet("{notificationId:int}")]
        public async Task<IActionResult> GetNotificationDetail(int notificationId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var result = await _notificationService.GetNotificationDetailAsync(
                    notificationId,
                    currentUserId);

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var unreadCount = await _notificationService.GetUnreadCountAsync(
                    currentUserId);

                return Ok(new
                {
                    success = true,
                    unreadCount
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        [HttpPost("{notificationId:int}/read")]
        public async Task<IActionResult> MarkAsRead(int notificationId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var result = await _notificationService.MarkAsReadAsync(
                    notificationId,
                    currentUserId);

                return Ok(new
                {
                    success = true,
                    message = "Notification marked as read successfully.",
                    data = result
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        [HttpPost("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var updatedCount = await _notificationService.MarkAllAsReadAsync(
                    currentUserId);

                return Ok(new
                {
                    success = true,
                    message = "All notifications marked as read.",
                    updatedCount
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        private int GetCurrentUserId()
        {
            var userIdValue =
                User.FindFirstValue("userId") ??
                User.FindFirstValue(ClaimTypes.NameIdentifier) ??
                User.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
            {
                throw new InvalidOperationException("Unauthorized or invalid user token structure.");
            }

            return userId;
        }

        [HttpPost("job-digest/trigger")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> TriggerJobDigest()
        {
            try
            {
                var result = await _jobDigestNotificationService.SendDailyJobDigestAsync();

                return Ok(new
                {
                    success = true,
                    message = "Job digest notification triggered successfully.",
                    data = result
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }
    }
}