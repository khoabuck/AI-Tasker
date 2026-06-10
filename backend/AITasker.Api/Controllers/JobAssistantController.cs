using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/jobs/ai-assistant")]
public class JobAssistantController : ControllerBase
{
    private readonly IJobAssistantService _jobAssistantService;

    public JobAssistantController(IJobAssistantService jobAssistantService)
    {
        _jobAssistantService = jobAssistantService;
    }

    [HttpPost("analyze")]
    [Authorize(Roles = "CLIENT")]
    public async Task<IActionResult> AnalyzeJob([FromBody] JobAssistantRequest request)
    {
        try
        {
            var result = await _jobAssistantService.AnalyzeJobAsync(request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}