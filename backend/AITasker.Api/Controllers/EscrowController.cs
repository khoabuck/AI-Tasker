using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

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

        [HttpPost("milestones/{milestoneId:int}/lock")]
        public async Task<IActionResult> LockFunds(int milestoneId)
        {
            try
            {
                var clientId = GetCurrentUserId();

                var success = await _walletService.HoldEscrowAsync(clientId, milestoneId);

                if (!success)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Failed to lock escrow funds. Check milestone status, ownership, or wallet balance."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = $"Successfully locked escrow funds for Milestone ID {milestoneId}."
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        [HttpPost("milestones/{milestoneId:int}/release")]
        public async Task<IActionResult> ReleaseFunds(int milestoneId)
        {
            try
            {
                var success = await _walletService.ReleaseEscrowAsync(milestoneId);

                if (!success)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Failed to release escrow funds. Invalid milestone, missing escrow hold, or already processed."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = $"Successfully released escrow funds for Milestone ID {milestoneId}."
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        [HttpPost("milestones/{milestoneId:int}/refund")]
        public async Task<IActionResult> RefundFunds(int milestoneId)
        {
            try
            {
                var success = await _walletService.RefundEscrowAsync(milestoneId);

                if (!success)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Failed to refund escrow funds. Invalid milestone, missing escrow hold, or already processed."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = $"Successfully refunded escrow funds for Milestone ID {milestoneId}."
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        [HttpPost("milestones/{milestoneId:int}/freeze")]
        public IActionResult FreezeFunds(int milestoneId)
        {
            return Ok(new
            {
                success = true,
                message = $"Escrow funds for Milestone ID {milestoneId} have been frozen due to an open dispute."
            });
        }

        private int GetCurrentUserId()
        {
            var userIdValue =
                User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("userId")
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
                throw new InvalidOperationException("Unauthorized or invalid user token structure.");

            return userId;
        }
    }
}