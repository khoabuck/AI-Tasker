using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/jobs")]
[Authorize]
public class JobsController : ControllerBase
{
    private readonly IJobService _jobService;

    public JobsController(IJobService jobService)
    {
        _jobService = jobService;
    }

    [HttpPost("ai-suggest")]
    [Authorize(Roles = "CLIENT")]
    public async Task<IActionResult> AiSuggest([FromBody] AiJobSuggestionRequest request)
    {
        try
        {
            var data = await _jobService.AiSuggestAsync(GetCurrentUserId(), request);
            return Ok(new { success = true, data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost]
    [Authorize(Roles = "CLIENT")]
    public async Task<IActionResult> Create([FromBody] CreateJobRequest request)
    {
        try
        {
            var data = await _jobService.CreateAsync(GetCurrentUserId(), request);
            return Ok(new { success = true, message = "Job draft created.", data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("{jobId:int}")]
    [Authorize(Roles = "CLIENT")]
    public async Task<IActionResult> Update(int jobId, [FromBody] UpdateJobRequest request)
    {
        try
        {
            var data = await _jobService.UpdateDraftAsync(GetCurrentUserId(), jobId, request);
            return Ok(new { success = true, message = "Job updated.", data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("{jobId:int}/submit")]
    [Authorize(Roles = "CLIENT")]
    public async Task<IActionResult> Submit(int jobId)
    {
        try
        {
            var data = await _jobService.SubmitAsync(GetCurrentUserId(), jobId);
            return Ok(new { success = true, message = "Job submitted.", data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("{jobId:int}/cancel")]
    [Authorize(Roles = "CLIENT")]
    public async Task<IActionResult> Cancel(int jobId)
    {
        try
        {
            var data = await _jobService.CancelAsync(GetCurrentUserId(), jobId);
            return Ok(new { success = true, message = "Job cancelled.", data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> Browse([FromQuery] JobFilterRequest filter)
    {
        try
        {
            var data = await _jobService.BrowseAsync(filter);
            return Ok(new { success = true, data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("{jobId:int}")]
    public async Task<IActionResult> GetById(int jobId)
    {
        try
        {
            var data = await _jobService.GetByIdAsync(jobId);
            return Ok(new { success = true, data });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
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
            throw new InvalidOperationException("Invalid user token.");
        }

        return userId;
    }
}
