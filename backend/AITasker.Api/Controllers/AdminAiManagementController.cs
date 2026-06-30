using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/admin/ai-management")]
[Authorize(Roles = "ADMIN")]
public class AdminAiManagementController : ControllerBase
{
    private readonly IAiManagementService _aiManagementService;

    public AdminAiManagementController(IAiManagementService aiManagementService)
    {
        _aiManagementService = aiManagementService;
    }

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        var settings = await _aiManagementService.GetSettingsAsync();
        return Ok(settings);
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings(
        [FromBody] UpdateAiSettingsRequest request)
    {
        try
        {
            var adminId = GetCurrentAdminId();
            var settings = await _aiManagementService.UpdateSettingsAsync(
                adminId,
                request
            );

            return Ok(settings);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }

    [HttpGet("usage/summary")]
    public async Task<IActionResult> GetUsageSummary([FromQuery] int days = 30)
    {
        var summary = await _aiManagementService.GetUsageSummaryAsync(days);
        return Ok(summary);
    }

    [HttpGet("usage/by-feature")]
    public async Task<IActionResult> GetUsageByFeature([FromQuery] int days = 30)
    {
        var result = await _aiManagementService.GetUsageByFeatureAsync(days);
        return Ok(result);
    }

    [HttpGet("usage/logs")]
    public async Task<IActionResult> GetUsageLogs(
        [FromQuery] int take = 100,
        [FromQuery] int days = 30)
    {
        var logs = await _aiManagementService.GetUsageLogsAsync(take, days);
        return Ok(logs);
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
