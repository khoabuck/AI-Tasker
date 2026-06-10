using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/jobs")]
public class JobsController : ControllerBase
{
    private readonly IJobService _jobService;

    public JobsController(IJobService jobService)
    {
        _jobService = jobService;
    }

    [HttpPost("draft")]
    [Authorize(Roles = "CLIENT")]
    public async Task<IActionResult> CreateDraft([FromBody] CreateJobRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var job = await _jobService.CreateDraftAsync(userId, request);

            return Ok(job);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("submit")]
    [Authorize(Roles = "CLIENT")]
    public async Task<IActionResult> SubmitJob([FromBody] CreateJobRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var job = await _jobService.SubmitJobAsync(userId, request);

            return Ok(job);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}/submit")]
    [Authorize(Roles = "CLIENT")]
    public async Task<IActionResult> SubmitDraft(int id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var job = await _jobService.SubmitDraftAsync(userId, id);

            if (job == null)
            {
                return NotFound(new { message = "Job not found." });
            }

            return Ok(job);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("open")]
    [AllowAnonymous]
    public async Task<IActionResult> GetOpenJobs(
        [FromQuery] string? keyword,
        [FromQuery] int? skillId)
    {
        var jobs = await _jobService.GetOpenJobsAsync(keyword, skillId);
        return Ok(jobs);
    }

    [HttpGet("my")]
    [Authorize(Roles = "CLIENT")]
    public async Task<IActionResult> GetMyJobs()
    {
        var userId = GetCurrentUserId();
        var jobs = await _jobService.GetMyJobsAsync(userId);

        return Ok(jobs);
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetJobById(int id)
    {
        var userId = TryGetCurrentUserId();
        var role = GetCurrentUserRole();

        var job = await _jobService.GetJobByIdAsync(id, userId, role);

        if (job == null)
        {
            return NotFound(new { message = "Job not found." });
        }

        return Ok(job);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "CLIENT")]
    public async Task<IActionResult> UpdateJob(
        int id,
        [FromBody] UpdateJobRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var job = await _jobService.UpdateJobAsync(userId, id, request);

            if (job == null)
            {
                return NotFound(new { message = "Job not found." });
            }

            return Ok(job);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}/cancel")]
    [Authorize(Roles = "CLIENT")]
    public async Task<IActionResult> CancelJob(int id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _jobService.CancelJobAsync(userId, id);

            if (!result)
            {
                return NotFound(new { message = "Job not found." });
            }

            return Ok(new { message = "Job cancelled successfully." });
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

    private int? TryGetCurrentUserId()
    {
        var userIdValue =
            User.FindFirstValue("userId") ??
            User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(userIdValue))
        {
            return null;
        }

        return int.TryParse(userIdValue, out var userId)
            ? userId
            : null;
    }

    private string? GetCurrentUserRole()
    {
        if (User.IsInRole("ADMIN"))
        {
            return "ADMIN";
        }

        if (User.IsInRole("CLIENT"))
        {
            return "CLIENT";
        }

        if (User.IsInRole("EXPERT"))
        {
            return "EXPERT";
        }

        return User.FindFirstValue(ClaimTypes.Role) ??
               User.FindFirstValue("role");
    }
}