using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

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

        [HttpPost("{disputeId}/resolve")]
        public async Task<IActionResult> ResolveDispute(int disputeId, [FromBody] ResolveDisputeRequest request)
        {
            try
            {
                var success = await _disputeService.ResolveDisputeAsync(
                    disputeId,
                    request.ResolutionType ?? string.Empty,
                    request.ExpertAmount,
                    request.ClientAmount
                );

                if (!success)
                {
                    return BadRequest(new { message = "Failed to resolve dispute. Ensure dispute exists and transaction parameters are valid." });
                }

                return Ok(new { success = true, message = "Dispute has been resolved and escrow funds have been successfully distributed." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}