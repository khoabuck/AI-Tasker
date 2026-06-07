using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/notifications")]
    public class NotificationController : ControllerBase
    {
        private readonly AITaskerDbContext _context;

        public NotificationController(AITaskerDbContext context)
        {
            _context = context;
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

        [HttpGet]
        public async Task<IActionResult> GetMyNotifications()
        {
            try
            {
                int userId = GetCurrentUserId();
                
                var mockNotifications = new[]
                {
                    new { id = 1, userId, title = "Wallet Updated", message = "Your deposit via VNPay was processed successfully.", isRead = false, createdAt = DateTime.UtcNow.AddMinutes(-5) },
                    new { id = 2, userId, title = "Deliverable Submitted", message = "Expert has submitted a new product version for your project.", isRead = true, createdAt = DateTime.UtcNow.AddHours(-2) }
                };

                return Ok(mockNotifications);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            try
            {
                return Ok(new { success = true, message = $"Notification ID {id} has been marked as read." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}