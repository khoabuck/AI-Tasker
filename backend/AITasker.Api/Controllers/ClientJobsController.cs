using System.Security.Claims;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/clients/me/jobs")]
[Authorize(Roles = "CLIENT")]
public class ClientJobsController : ControllerBase
{
    private readonly IJobService _jobService;

    public ClientJobsController(IJobService jobService)
    {
        _jobService = jobService;
    }

    [HttpGet]
    public async Task<IActionResult> GetMine()
    {
        try
        {
            var data = await _jobService.GetMyJobsAsync(GetCurrentUserId());
            return Ok(new { success = true, data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
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
