using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AITasker.Application.Interfaces;
using AITasker.Application.DTOs.Requests;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Route("api/proposals")]
    [Authorize]
    public class ProposalsController : ControllerBase
    {
        private readonly IProposalService _proposalService;

        public ProposalsController(
            IProposalService proposalService)
        {
            _proposalService = proposalService;
        }

        [HttpPost("submit")]
        public async Task<IActionResult> Submit(
            [FromBody] SubmitProposalRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result =
                    await _proposalService.SubmitProposalAsync(
                        userId,
                        request);

                return Ok(new
                {
                    success = true,
                    message = "Proposal submitted successfully.",
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

        [HttpPost("{proposalId}/counter")]
        public async Task<IActionResult> CounterOffer(
            int proposalId,
            [FromBody] CounterOfferRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result =
                    await _proposalService.CounterOfferAsync(
                        userId,
                        proposalId,
                        request);

                return Ok(new
                {
                    success = true,
                    message = "Counter offer submitted successfully.",
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

        [HttpPost("{proposalId}/decision")]
        public async Task<IActionResult> Decision(
            int proposalId,
            [FromQuery] string decision)
        {
            try
            {
                var userId = GetCurrentUserId();

                var result =
                    await _proposalService.ProcessProposalStatusAsync(
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
                throw new InvalidOperationException(
                    "Invalid user token.");
            }

            return userId;
        }
    }
}