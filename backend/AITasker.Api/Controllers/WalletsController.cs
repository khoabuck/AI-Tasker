using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
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

        [HttpPost("deposit-orders")]
        [Authorize(Roles = "CLIENT,EXPERT")]
        public async Task<IActionResult> CreateDepositOrder(
            [FromBody] CreateDepositOrderRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _walletService.CreateDepositOrderAsync(
                    userId,
                    request);

                return Ok(new
                {
                    success = true,
                    message = "Deposit order created successfully.",
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

        [HttpGet("deposit-orders/me")]
        [Authorize(Roles = "CLIENT,EXPERT,ADMIN")]
        public async Task<IActionResult> GetMyDepositOrders()
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _walletService.GetMyDepositOrdersAsync(userId);

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

        [HttpGet("deposit-orders/{depositOrderId:int}")]
        [Authorize(Roles = "CLIENT,EXPERT,ADMIN")]
        public async Task<IActionResult> GetDepositOrderById(int depositOrderId)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _walletService.GetDepositOrderByIdAsync(
                    userId,
                    depositOrderId);

                return Ok(new
                {
                    success = true,
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
                return NotFound(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        [HttpPost("deposit-orders/{depositOrderId:int}/simulate-paid")]
        [Authorize(Roles = "CLIENT,EXPERT,ADMIN")]
        public async Task<IActionResult> SimulateDepositPaid(int depositOrderId)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _walletService.SimulateDepositPaidAsync(
                    userId,
                    depositOrderId);

                return Ok(new
                {
                    success = true,
                    message = "Deposit order paid successfully.",
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