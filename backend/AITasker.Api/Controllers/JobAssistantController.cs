using System.Security.Claims;
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
            var userId = GetCurrentUserId();
            var result = await _jobAssistantService.AnalyzeJobAsync(userId, request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private int GetCurrentUserId()
    {
        var userIdValue =
            User.FindFirstValue("userId") ??
            User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(userIdValue))
        {
            throw new InvalidOperationException("UserId not found in token.");
        }

        return int.Parse(userIdValue);
    }
}