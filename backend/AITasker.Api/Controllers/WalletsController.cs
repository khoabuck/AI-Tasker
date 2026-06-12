using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AITasker.Application.Interfaces;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Route("api/wallets")]
    [Authorize]
    public class WalletsController : ControllerBase
    {
        private readonly IWalletService _walletService;

        public WalletsController(IWalletService walletService)
        {
            _walletService = walletService;
        }

        [HttpGet("balance")]
        public async Task<IActionResult> GetBalance()
        {
            try
            {
                var userId = GetCurrentUserId();

                var balance =
                    await _walletService.GetBalanceAsync(userId);

                return Ok(new
                {
                    success = true,
                    balance
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
                    message = "An error occurred while retrieving wallet balance."
                });
            }
        }

        [HttpPost("deposit")]
        public async Task<IActionResult> Deposit(
            [FromQuery] decimal amount,
            [FromQuery] string transactionRef)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result =
                    await _walletService.DepositAsync(
                        userId,
                        amount,
                        transactionRef
                    );

                return Ok(new
                {
                    success = true,
                    message = "Deposit successful.",
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
                    message = "An internal error occurred during deposit processing."
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