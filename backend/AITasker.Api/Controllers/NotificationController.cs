using AITasker.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System.Linq;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly AITaskerDbContext _context;

        public NotificationsController(AITaskerDbContext context)
        {
            _context = context;
        }

        [HttpGet("me/{userId}")]
        public async Task<IActionResult> GetMyNotifications(int userId)
        {
            var list = await _context.Notifications
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .Select(n => new {
                    n.Id,
                    n.Title,
                    n.Content,
                    n.Type,
                    n.IsRead,
                    n.CreatedAt
                })
                .ToListAsync();

            return Ok(list);
        }
    }
}