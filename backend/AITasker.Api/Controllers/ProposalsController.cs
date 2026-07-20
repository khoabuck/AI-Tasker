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

        [HttpGet("me/credits")]
        [Authorize(Roles = "EXPERT")]
        public async Task<IActionResult> GetMyProposalCredits()
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _proposalService.GetMyProposalCreditsAsync(userId);

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

        [HttpGet("drafts/me")]
        [Authorize(Roles = "EXPERT")]
        public async Task<IActionResult> GetMyProposalDrafts()
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _proposalService.GetMyProposalDraftsAsync(userId);

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

        [HttpPost("drafts")]
        [Authorize(Roles = "EXPERT")]
        public async Task<IActionResult> SaveProposalDraft(
            [FromBody] SubmitProposalRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _proposalService.SaveProposalDraftAsync(
                    userId,
                    request);

                return Ok(new
                {
                    success = true,
                    message = "Proposal draft saved successfully.",
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

        [HttpPut("drafts/{proposalId:int}")]
        [Authorize(Roles = "EXPERT")]
        public async Task<IActionResult> UpdateProposalDraft(
            int proposalId,
            [FromBody] SubmitProposalRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _proposalService.UpdateProposalDraftAsync(
                    userId,
                    proposalId,
                    request);

                return Ok(new
                {
                    success = true,
                    message = "Proposal draft updated successfully.",
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

        [HttpPost("drafts/{proposalId:int}/submit")]
        [Authorize(Roles = "EXPERT")]
        public async Task<IActionResult> SubmitProposalDraft(int proposalId)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _proposalService.SubmitProposalDraftAsync(
                    userId,
                    proposalId);

                return Ok(new
                {
                    success = true,
                    message = "Proposal draft submitted successfully.",
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

        [HttpDelete("drafts/{proposalId:int}")]
        [Authorize(Roles = "EXPERT")]
        public async Task<IActionResult> DeleteProposalDraft(int proposalId)
        {
            try
            {
                var userId = GetCurrentUserId();

                await _proposalService.DeleteProposalDraftAsync(
                    userId,
                    proposalId);

                return Ok(new
                {
                    success = true,
                    message = "Proposal draft deleted successfully."
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

        [HttpPost("{proposalId:int}/decline-accepted-deal")]
        [Authorize(Roles = "CLIENT,EXPERT")]
        public async Task<IActionResult> DeclineAcceptedDeal(
            int proposalId,
            [FromBody] DeclineAcceptedProposalDealRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _proposalService.DeclineAcceptedDealAsync(
                    userId,
                    proposalId,
                    request);

                return Ok(new
                {
                    success = true,
                    message = "Accepted deal declined successfully. The job was reopened.",
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

        [HttpGet("{proposalId:int}/withdraw-warning")]
        [Authorize(Roles = "EXPERT")]
        public async Task<IActionResult> GetWithdrawWarning(int proposalId)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _proposalService.GetWithdrawWarningAsync(
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
                    message = "Proposal withdrawn successfully. The proposal submission credit used for this proposal is not refundable.",
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