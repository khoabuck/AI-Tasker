using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System.Linq;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Route("api/deliverables")]
    [Authorize]
    public class DeliverablesController : ControllerBase
    {
        private readonly AITaskerDbContext _context;

        public DeliverablesController(AITaskerDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> SubmitDeliverable([FromBody] SubmitDeliverableDto dto)
        {
            int latestVersion = await _context.Deliverables
                .Where(d => d.MilestoneId == dto.MilestoneId)
                .Select(d => (int?)d.VersionNumber)
                .MaxAsync() ?? 0;

            var deliverable = new Deliverable
            {
                MilestoneId = dto.MilestoneId,
                ExpertId = dto.ExpertId,
                Description = dto.Description,
                FileUrl = dto.FileUrl,
                DemoUrl = dto.DemoUrl,
                VersionNumber = latestVersion + 1,
                Status = "SUBMITTED"
            };

            _context.Deliverables.Add(deliverable);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Deliverable submitted successfully!", versionNumber = deliverable.VersionNumber });
        }
    }

    public class SubmitDeliverableDto
    {
        public int MilestoneId { get; set; }
        public int ExpertId { get; set; }
        public string Description { get; set; } = string.Empty;
        public string? FileUrl { get; set; }
        public string? DemoUrl { get; set; }
    }
}