using System;
using System.Security.Claims;
using System.Threading.Tasks;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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

        [HttpPost]
        public async Task<IActionResult> SubmitDeliverable(
            [FromBody] SubmitDeliverableRequest request)
        {
            try
            {
                var currentExpertUserId = GetCurrentUserId();

                var result = await _deliverableService.SubmitDeliverableAsync(
                    request.MilestoneId,
                    currentExpertUserId,
                    request.Description ?? string.Empty,
                    request.FileUrl,
                    request.DemoUrl,
                    request.TestResultUrl
                );

                if (result == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Failed to submit deliverable."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Deliverable submitted successfully.",
                    deliverableId = result.DeliverableId,
                    version = result.VersionNumber
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
            catch (Exception)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "An internal error occurred while submitting deliverable."
                });
            }
        }

        [HttpPost("{deliverableId}/approve")]
        public async Task<IActionResult> ApproveDeliverable(int deliverableId)
        {
            try
            {
                var currentClientUserId = GetCurrentUserId();

                var success = await _deliverableService.ApproveDeliverableAsync(
                    deliverableId,
                    currentClientUserId
                );

                return Ok(new
                {
                    success = true,
                    message = "Deliverable approved and escrow funds released successfully.",
                    data = success
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
            catch (Exception)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "An internal error occurred while approving deliverable."
                });
            }
        }

        [HttpPost("{deliverableId}/revision")]
        public async Task<IActionResult> RequestRevision(
            int deliverableId,
            [FromBody] RevisionRequest request)
        {
            try
            {
                var currentClientUserId = GetCurrentUserId();

                var success = await _deliverableService.RequestRevisionAsync(
                    deliverableId,
                    currentClientUserId,
                    request.Feedback ?? string.Empty
                );

                return Ok(new
                {
                    success = true,
                    message = "Revision requested successfully.",
                    data = success
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
            catch (Exception)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "An internal error occurred while requesting revision."
                });
            }
        }

        private int GetCurrentUserId()
        {
            var userIdValue =
                User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("userId")
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
            {
                throw new InvalidOperationException(
                    "Authorization failed: Invalid token."
                );
            }

            return userId;
        }
    }
}