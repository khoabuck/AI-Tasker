using System.Security.Claims;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

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

        [HttpGet("projects/{projectId:int}")]
        public async Task<IActionResult> GetProjectEscrows(int projectId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var result = await _walletService.GetProjectEscrowsAsync(
                    currentUserId,
                    projectId);

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
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        [HttpPost("projects/{projectId:int}/lock")]
        [Authorize(Roles = "CLIENT")]
        public async Task<IActionResult> LockProjectEscrow(int projectId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var result = await _walletService.LockProjectEscrowAsync(
                    currentUserId,
                    projectId);

                return Ok(new
                {
                    success = true,
                    message = result.Message,
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

        [HttpPost("milestones/{milestoneId:int}/lock")]
        [Authorize(Roles = "CLIENT")]
        public async Task<IActionResult> LockMilestoneEscrow(int milestoneId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var result = await _walletService.HoldEscrowAsync(
                    currentUserId,
                    milestoneId);

                return Ok(new
                {
                    success = true,
                    message = result.Message,
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

        [HttpPost("milestones/{milestoneId:int}/release")]
        [Authorize(Roles = "CLIENT,ADMIN")]
        public async Task<IActionResult> ReleaseFunds(int milestoneId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var result = await _walletService.ReleaseEscrowAsync(
                    currentUserId,
                    milestoneId);

                return Ok(new
                {
                    success = true,
                    message = result.Message,
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

        [HttpPost("milestones/{milestoneId:int}/refund")]
        [Authorize(Roles = "CLIENT,ADMIN")]
        public async Task<IActionResult> RefundFunds(int milestoneId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var result = await _walletService.RefundEscrowAsync(
                    currentUserId,
                    milestoneId);

                return Ok(new
                {
                    success = true,
                    message = result.Message,
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

        [HttpPost("milestones/{milestoneId:int}/freeze")]
        [Authorize(Roles = "CLIENT,EXPERT,ADMIN")]
        public async Task<IActionResult> FreezeFunds(int milestoneId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var result = await _walletService.FreezeEscrowAsync(
                    currentUserId,
                    milestoneId);

                return Ok(new
                {
                    success = true,
                    message = result.Message,
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
                throw new InvalidOperationException("Unauthorized or invalid user token structure.");
            }

            return userId;
        }
    }
}