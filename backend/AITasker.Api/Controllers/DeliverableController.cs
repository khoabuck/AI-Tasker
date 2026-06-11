using AITasker.Application.DTOs.Requests;
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
        public async Task<IActionResult> SubmitDeliverable([FromBody] SubmitDeliverableRequest request)
        {
            try
            {
                int currentExpertId = GetCurrentUserId();
                var result = await _deliverableService.SubmitDeliverableAsync(
                    request.MilestoneId,
                    currentExpertId,
                    request.FileUrl ?? string.Empty,
                    request.DemoUrl,
                    request.Description ?? string.Empty,
                    null    
                );

                if (result == null) 
                {
                    return BadRequest(new { message = "Failed to submit deliverable. Internal error occurred." });
                }

                return Ok(new { message = "Deliverable submitted successfully!", deliverableId = result.DeliverableId, version = result.VersionNumber });
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
        public async Task<IActionResult> RequestRevision(int deliverableId, [FromBody] RevisionRequest request)
        {
            try
            {
                var success = await _deliverableService.RequestRevisionAsync(deliverableId, request.Feedback ?? string.Empty);
                if (!success) return BadRequest(new { message = "Failed to request revision." });

                return Ok(new { success = true, message = "Revision requested successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}