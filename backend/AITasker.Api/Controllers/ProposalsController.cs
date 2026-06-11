using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using AITasker.Application.Interfaces;
using AITasker.Application.DTOs.Requests;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProposalsController : ControllerBase
    {
        private readonly IProposalService _proposalService;

        public ProposalsController(IProposalService proposalService)
        {
            _proposalService = proposalService;
        }

        [HttpPost("submit")]
        public async Task<IActionResult> Submit([FromQuery] int expertId, [FromBody] SubmitProposalRequest request)
        {
            var result = await _proposalService.SubmitProposalAsync(expertId, request);
            return Ok(new { Success = result });
        }

        [HttpPost("{id}/counter")]
        public async Task<IActionResult> Counter(int id, [FromBody] CounterOfferRequest request)
        {
            var result = await _proposalService.CounterOfferAsync(id, request);
            return Ok(new { Success = result });
        }

        [HttpPost("{id}/decision")]
        public async Task<IActionResult> Decision(int id, [FromQuery] string status)
        {
            var result = await _proposalService.ProcessProposalStatusAsync(id, status);
            return Ok(new { Success = result });
        }
    }
}