using System.Security.Claims;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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

        [HttpGet("me")]
        public async Task<IActionResult> GetMyWallet()
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _walletService.GetMyWalletAsync(userId);

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

        [HttpGet("balance")]
        public async Task<IActionResult> GetBalance()
        {
            try
            {
                var userId = GetCurrentUserId();

                var balance = await _walletService.GetBalanceAsync(userId);

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
        }

        [HttpGet("/api/transactions/me")]
        public async Task<IActionResult> GetMyTransactions()
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _walletService.GetMyTransactionsAsync(userId);

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

        [HttpPost("deposit")]
        public async Task<IActionResult> Deposit(
            [FromQuery] decimal amount,
            [FromQuery] string? transactionRef)
        {
            try
            {
                var userId = GetCurrentUserId();

                if (amount <= 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Deposit amount must be greater than 0."
                    });
                }

                var reference = string.IsNullOrWhiteSpace(transactionRef)
                    ? $"SIM_DEPOSIT_{userId}_{DateTime.UtcNow:yyyyMMddHHmmssfff}"
                    : transactionRef.Trim();

                var result = await _walletService.DepositAsync(
                    userId,
                    amount,
                    reference);

                if (!result)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Deposit failed."
                    });
                }

                var wallet = await _walletService.GetMyWalletAsync(userId);

                return Ok(new
                {
                    success = true,
                    message = "Deposit successful.",
                    data = wallet
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