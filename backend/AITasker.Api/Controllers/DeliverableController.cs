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

        [HttpPost("{deliverableId}/approve")]
        public async Task<IActionResult> ApproveDeliverable(int deliverableId)
        {
            try
            {
                var success = await _deliverableService.ApproveDeliverableAsync(deliverableId);
                if (!success) return BadRequest(new { message = "Failed to approve deliverable or release escrow." });

                return Ok(new { success = true, message = "Deliverable approved and escrow funds released successfully!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{deliverableId}/revision")]
        public async Task<IActionResult> RequestRevision(int deliverableId, [FromBody] RevisionRequestDto dto)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(dto.Feedback))
                {
                    return BadRequest(new { message = "Feedback is required when requesting a revision." });
                }

                var success = await _deliverableService.RequestRevisionAsync(deliverableId, dto.Feedback);
                if (!success) return BadRequest(new { message = "Failed to request revision." });

                return Ok(new { success = true, message = "Revision requested successfully." });
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

    public class RevisionRequestDto
    {
        public string Feedback { get; set; } = string.Empty;
    }
}