using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/deliverables")]
    public class DeliverablesController : ControllerBase
    {
        private readonly IDeliverableService _deliverableService;

        public DeliverablesController(IDeliverableService deliverableService)
        {
            _deliverableService = deliverableService;
        }

        [HttpPost("/api/milestones/{milestoneId:int}/deliverables")]
        [Authorize(Roles = "EXPERT")]
        public async Task<IActionResult> SubmitDeliverableByMilestone(
            int milestoneId,
            [FromBody] SubmitDeliverableRequest request)
        {
            try
            {
                var currentExpertUserId = GetCurrentUserId();

                request.MilestoneId = milestoneId;

                var result = await _deliverableService.SubmitDeliverableAsync(
                    currentExpertUserId,
                    request);

                return Ok(new
                {
                    success = true,
                    message = "Deliverable submitted successfully.",
                    data = result
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = ex.Message
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

        [HttpPost]
        [Authorize(Roles = "EXPERT")]
        public async Task<IActionResult> SubmitDeliverable(
            [FromBody] SubmitDeliverableRequest request)
        {
            try
            {
                var currentExpertUserId = GetCurrentUserId();

                var result = await _deliverableService.SubmitDeliverableAsync(
                    currentExpertUserId,
                    request);

                return Ok(new
                {
                    success = true,
                    message = "Deliverable submitted successfully.",
                    data = result
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = ex.Message
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

        [HttpGet("/api/milestones/{milestoneId:int}/deliverables")]
        public async Task<IActionResult> GetMilestoneDeliverables(int milestoneId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var result = await _deliverableService.GetMilestoneDeliverablesAsync(
                    currentUserId,
                    milestoneId);

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        [HttpGet("{deliverableId:int}")]
        public async Task<IActionResult> GetDeliverableById(int deliverableId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var result = await _deliverableService.GetDeliverableByIdAsync(
                    currentUserId,
                    deliverableId);

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        [HttpPost("{deliverableId:int}/approve")]
        [Authorize(Roles = "CLIENT")]
        public async Task<IActionResult> ApproveDeliverable(int deliverableId)
        {
            try
            {
                var currentClientUserId = GetCurrentUserId();

                var result = await _deliverableService.ApproveDeliverableAsync(
                    deliverableId,
                    currentClientUserId);

                return Ok(new
                {
                    success = true,
                    message = "Deliverable approved and escrow released successfully.",
                    data = result
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = ex.Message
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

        [HttpPost("{deliverableId:int}/request-revision")]
        [Authorize(Roles = "CLIENT")]
        public async Task<IActionResult> RequestRevision(
            int deliverableId,
            [FromBody] RevisionRequest request)
        {
            try
            {
                var currentClientUserId = GetCurrentUserId();

                var result = await _deliverableService.RequestRevisionAsync(
                    deliverableId,
                    currentClientUserId,
                    request);

                return Ok(new
                {
                    success = true,
                    message = "Revision requested successfully.",
                    data = result
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = ex.Message
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

        [HttpPost("{deliverableId:int}/revision")]
        [Authorize(Roles = "CLIENT")]
        public async Task<IActionResult> RequestRevisionLegacy(
            int deliverableId,
            [FromBody] RevisionRequest request)
        {
            return await RequestRevision(deliverableId, request);
        }

        private int GetCurrentUserId()
        {
            var userIdValue =
                User.FindFirstValue("userId") ??
                User.FindFirstValue(ClaimTypes.NameIdentifier) ??
                User.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
            {
                throw new InvalidOperationException("Authorization failed: Invalid token.");
            }

            return userId;
        }
    }
}