using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Route("api/proposals")]
    [Authorize]
    public class ProposalsController : ControllerBase
    {
        private readonly IProposalService _proposalService;

        public ProposalsController(IProposalService proposalService)
        {
            _proposalService = proposalService;
        }

        [HttpPost("submit")]
        [Authorize(Roles = "EXPERT")]
        public async Task<IActionResult> Submit([FromBody] SubmitProposalRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _proposalService.SubmitProposalAsync(
                    userId,
                    request);

                return Ok(new
                {
                    success = true,
                    message = "Proposal submitted successfully.",
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

        [HttpGet("me")]
        [Authorize(Roles = "EXPERT")]
        public async Task<IActionResult> GetMyProposals()
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _proposalService.GetMyProposalsAsync(userId);

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

        [HttpGet("/api/jobs/{jobId:int}/proposals")]
        [Authorize(Roles = "CLIENT")]
        public async Task<IActionResult> GetJobProposals(int jobId)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _proposalService.GetJobProposalsAsync(
                    userId,
                    jobId);

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

        [HttpGet("{proposalId:int}")]
        public async Task<IActionResult> GetProposalById(int proposalId)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _proposalService.GetProposalByIdAsync(
                    userId,
                    proposalId);

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

        [HttpGet("{proposalId:int}/versions")]
        public async Task<IActionResult> GetProposalVersions(int proposalId)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _proposalService.GetProposalVersionsAsync(
                    userId,
                    proposalId);

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

        [HttpPost("{proposalId:int}/resubmit")]
        [Authorize(Roles = "EXPERT")]
        public async Task<IActionResult> ResubmitProposal(
            int proposalId,
            [FromBody] ResubmitProposalRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _proposalService.ResubmitProposalAsync(
                    userId,
                    proposalId,
                    request);

                return Ok(new
                {
                    success = true,
                    message = "Proposal resubmitted successfully.",
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

        [HttpPost("{proposalId:int}/decision")]
        [Authorize(Roles = "CLIENT")]
        public async Task<IActionResult> Decision(
            int proposalId,
            [FromQuery] string decision)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _proposalService.ProcessProposalStatusAsync(
                    userId,
                    proposalId,
                    decision);

                return Ok(new
                {
                    success = true,
                    message = "Proposal processed successfully.",
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

        [HttpPatch("{proposalId:int}/withdraw")]
        [Authorize(Roles = "EXPERT")]
        public async Task<IActionResult> Withdraw(int proposalId)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _proposalService.WithdrawProposalAsync(
                    userId,
                    proposalId);

                return Ok(new
                {
                    success = true,
                    message = "Proposal withdrawn successfully.",
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
                throw new InvalidOperationException("Invalid user token.");
            }

            return userId;
        }
    }
}