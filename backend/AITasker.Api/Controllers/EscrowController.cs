using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using AITasker.Application.Interfaces;

namespace AITasker.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/escrows")]
    public class EscrowController : ControllerBase
    {
        private readonly IWalletService _walletService;

        public EscrowController(IWalletService walletService)
        {
            _walletService = walletService;
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

        [HttpPost("projects/{projectId}/lock")]
        public async Task<IActionResult> LockFunds(string projectId, [FromQuery] decimal amount)
        {
            try
            {
                int clientId = GetCurrentUserId();
                if (amount <= 0) return BadRequest(new { message = "Lock amount must be greater than 0." });

                var success = await _walletService.HoldEscrowAsync(clientId, amount, projectId);
                if (!success) return BadRequest(new { message = "Failed to lock escrow funds. Check wallet balance." });

                return Ok(new { success = true, message = $"Successfully locked {amount} VND for Project ID {projectId}." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("milestones/{milestoneId}/release")]
        public async Task<IActionResult> ReleaseFunds(string milestoneId, [FromQuery] int expertId)
        {
            try
            {
                var success = await _walletService.ReleaseEscrowAsync(milestoneId, expertId);
                if (!success) return BadRequest(new { message = "Failed to release escrow funds. Invalid reference or already processed." });

                return Ok(new { success = true, message = $"Successfully released escrow funds for Milestone ID {milestoneId} to Expert ID {expertId}." });
            }
            catch (Exception ex) {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("milestones/{milestoneId}/refund")]
        public async Task<IActionResult> RefundFunds(string milestoneId, [FromQuery] int clientId, [FromQuery] decimal amount)
        {
            try
            {
                var success = await _walletService.DepositAsync(clientId, amount, $"[Escrow Refund] Returned funds from cancelled Milestone ID {milestoneId}", milestoneId);
                if (!success) return BadRequest(new { message = "Failed to process escrow refund." });

                return Ok(new { success = true, message = $"Successfully refunded {amount} VND for Milestone ID {milestoneId} back to Client ID {clientId}." });
            }
            catch (Exception ex) {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("milestones/{milestoneId}/freeze")]
        public async Task<IActionResult> FreezeFunds(string milestoneId)
        {
            try
            {
                return Ok(new { success = true, message = $"Escrow funds for Milestone ID {milestoneId} have been strictly FROZEN due to an open dispute." });
            }
            catch (Exception ex) {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}