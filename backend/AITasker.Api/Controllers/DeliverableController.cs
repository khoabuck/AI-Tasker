using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Route("api/deliverables")]
    [Authorize]
    public class DeliverablesController : ControllerBase
    {
        private readonly IDeliverableService _deliverableService;

        public DeliverablesController(IDeliverableService deliverableService)
        {
            _deliverableService = deliverableService;
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

        [HttpPost]
        public async Task<IActionResult> SubmitDeliverable([FromBody] SubmitDeliverableDto dto)
        {
            try
            {
                int currentExpertId = GetCurrentUserId();
                
                var result = await _deliverableService.SubmitDeliverableAsync(
                    dto.MilestoneId,
                    currentExpertId,
                    dto.Description,
                    dto.FileUrl,
                    dto.DemoUrl,
                    dto.TestResultUrl
                );

                if (result == null) 
                {
                    return BadRequest(new { message = "Failed to submit deliverable. Internal error occurred." });
                }

                return Ok(new { message = "Deliverable submitted successfully!", deliverableId = result.Id, version = result.VersionNumber });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public class SubmitDeliverableDto
    {
        public int MilestoneId { get; set; }
        
        public string Description { get; set; } = string.Empty;
        
        public string? FileUrl { get; set; }
        
        public string? DemoUrl { get; set; }
        
        public string? TestResultUrl { get; set; }
    }
}