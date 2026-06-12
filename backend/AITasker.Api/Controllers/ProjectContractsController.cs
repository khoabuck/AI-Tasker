using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AITasker.Application.Interfaces;
using AITasker.Application.DTOs.Requests;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ProjectContractsController : ControllerBase
    {
        private readonly IProjectContractService _contractService;

        public ProjectContractsController(
            IProjectContractService contractService)
        {
            _contractService = contractService;
        }

        [HttpPost("draft")]
        public async Task<IActionResult> CreateDraft(
            [FromBody] CreateContractRequest request)
        {
            try
            {
                var result =
                    await _contractService.CreateDraftContractAsync(request);

                return Ok(new
                {
                    success = result
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

        [HttpPost("{id}/confirm")]
        public async Task<IActionResult> Confirm(
            int id,
            [FromQuery] string role)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result =
                    await _contractService.ConfirmContractAsync(
                        id,
                        userId,
                        role
                    );

                return Ok(new
                {
                    success = result
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
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new
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
                throw new InvalidOperationException(
                    "Invalid user token.");
            }

            return userId;
        }
    }
}