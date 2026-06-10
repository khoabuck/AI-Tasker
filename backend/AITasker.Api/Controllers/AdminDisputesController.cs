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
        public async Task<IActionResult> ResolveDispute(int disputeId, [FromBody] ResolveDisputeDto dto)
        {
            try
            {
                if (dto == null)
                {
                    return BadRequest(new { message = "Request body is required." });
                }

                if (string.IsNullOrWhiteSpace(dto.ResolutionType))
                {
                    return BadRequest(new { message = "ResolutionType is required." });
                }

                if (dto.ExpertAmount < 0 || dto.ClientAmount < 0)
                {
                    return BadRequest(new { message = "Amounts must be non-negative." });
                }

                var success = await _disputeService.ResolveDisputeAsync(
                    disputeId,
                    dto.ResolutionType,
                    dto.ExpertAmount,
                    dto.ClientAmount
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

    public class ResolveDisputeDto
    {
        public string ResolutionType { get; set; } = string.Empty;
        
        public decimal ExpertAmount { get; set; }
        
        public decimal ClientAmount { get; set; }
    }
}
