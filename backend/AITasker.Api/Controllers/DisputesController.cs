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
    [Route("api/disputes")]
    [Authorize]
    public class DisputesController : ControllerBase
    {
        private readonly IDisputeService _disputeService;

        public DisputesController(IDisputeService disputeService)
        {
            _disputeService = disputeService;
        }

        [HttpPost]
        public async Task<IActionResult> OpenDispute(
            [FromBody] OpenDisputeRequest request)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var disputeId = await _disputeService.OpenDisputeAsync(
                    request.ProjectId,
                    request.MilestoneId,
                    currentUserId,
                    request.RespondentUserId,
                    request.DisputedAmount,
                    request.Reason ?? string.Empty
                );

                return Ok(new
                {
                    success = true,
                    message = "Dispute opened successfully. Escrow funds have been frozen temporarily.",
                    disputeId
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
                    message = "An internal error occurred while opening dispute."
                });
            }
        }

        [HttpPost("{disputeId}/resolve")]
        public async Task<IActionResult> ResolveDispute(
            int disputeId,
            [FromBody] ResolveDisputeRequest request)
        {
            try
            {
                var result = await _disputeService.ResolveDisputeAsync(
                    disputeId,
                    request.ResolutionType,
                    request.ExpertAmount,
                    request.ClientAmount
                );

                return Ok(new
                {
                    success = true,
                    message = "Dispute resolved successfully.",
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
            catch (Exception)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "An internal error occurred while resolving dispute."
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