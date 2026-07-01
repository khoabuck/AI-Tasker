using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/withdrawals")]
    public class WithdrawalsController : ControllerBase
    {
        private readonly IWithdrawalService _withdrawalService;
        private readonly IPayOsPayoutService _payOsPayoutService;

        public WithdrawalsController(
            IWithdrawalService withdrawalService,
            IPayOsPayoutService payOsPayoutService)
        {
            _withdrawalService = withdrawalService;
            _payOsPayoutService = payOsPayoutService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateWithdrawalRequest(
            [FromBody] CreateWithdrawalRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _withdrawalService.CreateWithdrawalRequestAsync(
                    userId,
                    request);

                var success = !string.Equals(
                    result.Status,
                    "FAILED",
                    StringComparison.OrdinalIgnoreCase);

                return Ok(new
                {
                    success,
                    message = success
                        ? "Withdrawal request submitted successfully. The withdrawal amount is now held until admin processes the payout."
                        : result.BankVerificationMessage ?? "Withdrawal request failed.",
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

        [HttpGet("me")]
        public async Task<IActionResult> GetMyWithdrawalRequests()
        {
            var userId = GetCurrentUserId();

            var result = await _withdrawalService.GetMyWithdrawalRequestsAsync(userId);

            return Ok(new
            {
                success = true,
                data = result
            });
        }

        [HttpGet("admin")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> GetAllWithdrawalRequests([FromQuery] string? status)
        {
            var result = await _withdrawalService.GetAllWithdrawalRequestsAsync(status);

            return Ok(new
            {
                success = true,
                data = result
            });
        }

        [HttpGet("admin/payos/balance")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> GetPayOsPayoutBalance()
        {
            try
            {
                var result = await _payOsPayoutService.GetPayoutAccountBalanceAsync();

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

        [HttpPost("admin/{withdrawalRequestId:int}/approve")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> ApproveWithdrawal(
            int withdrawalRequestId,
            [FromBody] ProcessWithdrawalRequest request)
        {
            try
            {
                var adminId = GetCurrentUserId();

                var result = await _withdrawalService.ApproveWithdrawalAsync(
                    withdrawalRequestId,
                    adminId,
                    request);

                return Ok(new
                {
                    success = true,
                    message = "Withdrawal marked as paid manually.",
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

        [HttpPost("admin/{withdrawalRequestId:int}/approve-payos")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> ApproveWithdrawalWithPayOs(
            int withdrawalRequestId,
            [FromBody] ProcessWithdrawalRequest request)
        {
            try
            {
                var adminId = GetCurrentUserId();

                var result = await _withdrawalService.ApproveWithdrawalWithPayOsAsync(
                    withdrawalRequestId,
                    adminId,
                    request);

                return Ok(new
                {
                    success = true,
                    message = "Withdrawal payout has been sent to PayOS and is now processing.",
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

        [HttpPost("admin/{withdrawalRequestId:int}/sync-payos")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> SyncPayOsWithdrawal(int withdrawalRequestId)
        {
            try
            {
                var adminId = GetCurrentUserId();

                var result = await _withdrawalService.SyncPayOsWithdrawalAsync(
                    withdrawalRequestId,
                    adminId);

                return Ok(new
                {
                    success = true,
                    message = "PayOS withdrawal status synchronized successfully.",
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

        [HttpPost("admin/{withdrawalRequestId:int}/reject")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> RejectWithdrawal(
            int withdrawalRequestId,
            [FromBody] ProcessWithdrawalRequest request)
        {
            try
            {
                var adminId = GetCurrentUserId();

                var result = await _withdrawalService.RejectWithdrawalAsync(
                    withdrawalRequestId,
                    adminId,
                    request);

                return Ok(new
                {
                    success = true,
                    message = "Withdrawal request rejected and held funds returned successfully.",
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

        private int GetCurrentUserId()
        {
            var userIdValue =
                User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("userId")
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
            {
                throw new InvalidOperationException("Invalid user token.");
            }

            return userId;
        }
    }
}
