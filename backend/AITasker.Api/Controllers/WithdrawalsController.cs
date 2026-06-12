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

        public WithdrawalsController(IWithdrawalService withdrawalService)
        {
            _withdrawalService = withdrawalService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateWithdrawalRequest([FromBody] CreateWithdrawalRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _withdrawalService.CreateWithdrawalRequestAsync(userId, request);

                return Ok(new
                {
                    success = true,
                    message = "Withdrawal request submitted successfully.",
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
                    message = "Withdrawal request approved successfully.",
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
                    message = "Withdrawal request rejected successfully.",
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
                throw new InvalidOperationException("Invalid user token.");

            return userId;
        }
    }
}