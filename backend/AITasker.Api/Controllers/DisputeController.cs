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
    [Route("api/disputes")]
    [Authorize]
    public class DisputesController : ControllerBase
    {
        private readonly IDisputeService _disputeService;

        public DisputesController(IDisputeService disputeService)
        {
            _disputeService = disputeService;
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
        public async Task<IActionResult> OpenDispute([FromBody] OpenDisputeRequest request)
        {
            try
            {
                int currentUserId = GetCurrentUserId();

                var disputeId = await _disputeService.OpenDisputeAsync(
                    request.ProjectId, 
                    request.MilestoneId, 
                    currentUserId, 
                    request.RespondentUserId, 
                    request.DisputedAmount, 
                    request.Reason ?? string.Empty
                );

                if (disputeId == null)
                {
                    return BadRequest(new { message = "Failed to open dispute. Internal server error occurred." });
                }

                return Ok(new { message = "Dispute opened successfully. Escrow funds have been strictly FROZEN temporarily!", disputeId = disputeId });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}