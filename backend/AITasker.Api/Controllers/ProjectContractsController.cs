using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Route("api/contracts")]
    [Authorize]
    public class ProjectContractsController : ControllerBase
    {
        private readonly IProjectContractService _contractService;

        public ProjectContractsController(IProjectContractService contractService)
        {
            _contractService = contractService;
        }

        [HttpPost("from-proposal/{proposalId:int}")]
        [Authorize(Roles = "CLIENT,EXPERT")]
        public async Task<IActionResult> CreateFromProposal(int proposalId)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _contractService.CreateContractFromProposalAsync(
                    userId,
                    proposalId);

                return Ok(new
                {
                    success = true,
                    message = "Contract draft created successfully.",
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

        [HttpPost("draft")]
        [Authorize(Roles = "CLIENT,EXPERT")]
        public async Task<IActionResult> CreateDraft([FromBody] CreateContractRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _contractService.CreateDraftContractAsync(
                    userId,
                    request);

                return Ok(new
                {
                    success = true,
                    message = "Contract draft created successfully.",
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

        [HttpPut("{contractId:int}/draft")]
        [Authorize(Roles = "CLIENT,EXPERT")]
        public async Task<IActionResult> UpdateDraft(
            int contractId,
            [FromBody] UpdateContractDraftRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _contractService.UpdateContractDraftAsync(
                    userId,
                    contractId,
                    request);

                return Ok(new
                {
                    success = true,
                    message = "Contract draft updated successfully. Previous confirmations were reset if the draft changed.",
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

        [HttpGet("{contractId:int}/milestone-drafts")]
        [Authorize(Roles = "CLIENT,EXPERT,ADMIN")]
        public async Task<IActionResult> GetMilestoneDrafts(int contractId)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _contractService.GetContractMilestoneDraftsAsync(
                    userId,
                    contractId);

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

        [HttpPut("{contractId:int}/milestone-drafts")]
        [Authorize(Roles = "CLIENT,EXPERT")]
        public async Task<IActionResult> ReplaceMilestoneDrafts(
            int contractId,
            [FromBody] ReplaceContractMilestoneDraftsRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _contractService.ReplaceContractMilestoneDraftsAsync(
                    userId,
                    contractId,
                    request);

                return Ok(new
                {
                    success = true,
                    message = "Contract milestone drafts updated successfully. Previous confirmations were reset.",
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

        [HttpGet("{contractId:int}")]
        public async Task<IActionResult> GetContractById(int contractId)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _contractService.GetContractByIdAsync(
                    userId,
                    contractId);

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

        [HttpGet("/api/proposals/{proposalId:int}/contract")]
        public async Task<IActionResult> GetContractByProposalId(int proposalId)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _contractService.GetContractByProposalIdAsync(
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

        [HttpPost("{contractId:int}/confirm")]
        [Authorize(Roles = "CLIENT,EXPERT")]
        public async Task<IActionResult> Confirm(int contractId)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _contractService.ConfirmContractAsync(
                    contractId,
                    userId);

                return Ok(new
                {
                    success = true,
                    message = "Contract confirmation updated successfully.",
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

        [HttpPost("{contractId:int}/cancel")]
        [Authorize(Roles = "CLIENT,EXPERT")]
        public async Task<IActionResult> Cancel(
            int contractId,
            [FromBody] CancelContractRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result = await _contractService.CancelContractAsync(
                    userId,
                    contractId,
                    request);

                return Ok(new
                {
                    success = true,
                    message = "Contract cancelled successfully.",
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