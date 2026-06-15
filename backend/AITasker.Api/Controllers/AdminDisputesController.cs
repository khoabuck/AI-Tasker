using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Route("api/admin/disputes")]
    [Authorize(Roles = "ADMIN")]
    public class AdminDisputesController : ControllerBase
    {
        private readonly IDisputeService _disputeService;

        public AdminDisputesController(IDisputeService disputeService)
        {
            _disputeService = disputeService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAdminDisputes()
        {
            try
            {
                var result = await _disputeService.GetAdminDisputesAsync();

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

        [HttpGet("{disputeId:int}")]
        public async Task<IActionResult> GetAdminDisputeById(int disputeId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var result = await _disputeService.GetDisputeByIdAsync(
                    currentUserId,
                    disputeId);

                return Ok(new
                {
                    success = true,
                    data = result
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

        [HttpPost("{disputeId:int}/resolve")]
        public async Task<IActionResult> ResolveDispute(
            int disputeId,
            [FromBody] ResolveDisputeRequest request)
        {
            try
            {
                var currentAdminUserId = GetCurrentUserId();

                var result = await _disputeService.ResolveDisputeAsync(
                    currentAdminUserId,
                    disputeId,
                    request);

                return Ok(new
                {
                    success = true,
                    message = "Dispute has been resolved successfully.",
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