using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AITasker.Application.Interfaces;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Route("api/escrow")]
    [Authorize]
    public class EscrowController : ControllerBase
    {
        private readonly IWalletService _walletService;

        public EscrowController(IWalletService walletService)
        {
            _walletService = walletService;
        }

        [HttpPost("hold")]
        public async Task<IActionResult> HoldEscrow(
            [FromQuery] int clientId,
            [FromQuery] int milestoneId,
            [FromQuery] decimal amount)
        {
            try
            {
                var result = await _walletService.HoldEscrowAsync(
                    clientId,
                    milestoneId,
                    amount
                );

                return Ok(new
                {
                    success = true,
                    message = "Escrow funds held successfully.",
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
                    message = "An internal error occurred while holding escrow funds."
                });
            }
        }

        [HttpPost("release")]
        public async Task<IActionResult> ReleaseEscrow(
            [FromQuery] int milestoneId)
        {
            try
            {
                var expertUserId = GetCurrentUserId();

                var result = await _walletService.ReleaseEscrowAsync(
                    milestoneId,
                    expertUserId
                );

                return Ok(new
                {
                    success = true,
                    message = "Escrow funds released successfully.",
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
                    message = "An internal error occurred while releasing escrow funds."
                });
            }
        }

        [HttpPost("refund")]
        public async Task<IActionResult> RefundEscrow(
            [FromQuery] int milestoneId)
        {
            try
            {
                var result = await _walletService.RefundEscrowAsync(
                    milestoneId
                );

                return Ok(new
                {
                    success = true,
                    message = "Escrow funds refunded successfully.",
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
                    message = "An internal error occurred while refunding escrow funds."
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