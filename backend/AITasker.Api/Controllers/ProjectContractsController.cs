using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using AITasker.Application.Interfaces;
using AITasker.Application.DTOs.Requests;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProjectContractsController : ControllerBase
    {
        private readonly IProjectContractService _contractService;

        public ProjectContractsController(IProjectContractService contractService)
        {
            _contractService = contractService;
        }

        [HttpPost("draft")]
        public async Task<IActionResult> CreateDraft([FromBody] CreateContractRequest request)
        {
            var result = await _contractService.CreateDraftContractAsync(request);
            return Ok(new { Success = result });
        }

        [HttpPost("{id}/confirm")]
        public async Task<IActionResult> Confirm(int id, [FromQuery] int userId, [FromQuery] string role)
        {
            var result = await _contractService.ConfirmContractAsync(id, userId, role);
            return Ok(new { Success = result });
        }
    }
}