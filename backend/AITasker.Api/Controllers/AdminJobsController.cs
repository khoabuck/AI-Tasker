using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/admin/jobs")]
[Authorize(Roles = "ADMIN")]
public class AdminJobsController : ControllerBase
{
    private readonly IAdminJobService _adminJobService;

    public AdminJobsController(IAdminJobService adminJobService)
    {
        _adminJobService = adminJobService;
    }

    // GET /api/admin/jobs?search=chatbot&status=OPEN&clientProfileId=1
    [HttpGet]
    public async Task<IActionResult> GetJobs(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] int? clientProfileId)
    {
        var jobs = await _adminJobService.GetJobsAsync(
            search,
            status,
            clientProfileId);

        return Ok(jobs);
    }

    // GET /api/admin/jobs/1
    [HttpGet("{jobId:int}")]
    public async Task<IActionResult> GetJobById(int jobId)
    {
        var job = await _adminJobService.GetJobByIdAsync(jobId);

        if (job == null)
        {
            return NotFound(new
            {
                message = "Job not found."
            });
        }

        return Ok(job);
    }

    // GET /api/admin/jobs/1/proposals
    [HttpGet("{jobId:int}/proposals")]
    public async Task<IActionResult> GetJobProposals(int jobId)
    {
        var proposals = await _adminJobService.GetJobProposalsAsync(jobId);

        if (proposals == null)
        {
            return NotFound(new
            {
                message = "Job not found."
            });
        }

        return Ok(proposals);
    }

    // PATCH /api/admin/jobs/1/cancel
    [HttpPatch("{jobId:int}/cancel")]
    public async Task<IActionResult> CancelJob(
        int jobId,
        [FromBody] AdminCancelJobRequest request)
    {
        try
        {
            var adminId = GetCurrentAdminId();

            var job = await _adminJobService.CancelJobAsync(
                adminId,
                jobId,
                request);

            if (job == null)
            {
                return NotFound(new
                {
                    message = "Job not found."
                });
            }

            return Ok(job);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }

    private int GetCurrentAdminId()
    {
        var userIdValue =
            User.FindFirstValue("userId") ??
            User.FindFirstValue(ClaimTypes.NameIdentifier) ??
            User.FindFirstValue("sub") ??
            User.FindFirstValue("UserId");

        if (!int.TryParse(userIdValue, out var adminId))
        {
            throw new InvalidOperationException("Cannot resolve current admin id from token.");
        }

        return adminId;
    }
}
