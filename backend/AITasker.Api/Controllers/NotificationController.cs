using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    [Authorize]
    public class NotificationController : ControllerBase
    {
        private readonly INotificationService _notificationService;

        public NotificationController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
            {
                throw new InvalidOperationException("Unauthorized or invalid user token structure.");
            }
            return userId;
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetMyNotifications()
        {
            try
            {
                int currentUserId = GetCurrentUserId();
                var list = await _notificationService.GetNotificationsByUserIdAsync(currentUserId);
                return Ok(new { data = list });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{notificationId}/read")]
        public async Task<IActionResult> MarkAsRead(int notificationId)
        {
            try
            {
                int currentUserId = GetCurrentUserId();
                var success = await _notificationService.MarkAsReadAsync(notificationId, currentUserId);
                
                if (!success) return BadRequest(new { message = "Notification not found or access denied." });
                return Ok(new { success = true, message = "Notification marked as read successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            try
            {
                int currentUserId = GetCurrentUserId();
                await _notificationService.MarkAllAsReadAsync(currentUserId);
                
                return Ok(new { success = true, message = "All notifications marked as read." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}