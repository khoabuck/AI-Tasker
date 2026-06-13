using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/expert-profiles")]
public class ExpertProfilesController : ControllerBase
{
    private readonly IExpertProfileService _expertProfileService;

    public ExpertProfilesController(IExpertProfileService expertProfileService)
    {
        _expertProfileService = expertProfileService;
    }

    [HttpPost]
    [Authorize(Roles = "EXPERT")]
    public async Task<IActionResult> CreateExpertProfile(
        [FromBody] CreateExpertProfileRequest request
    )
    {
        try
        {
            var userId = GetCurrentUserId();

            var result = await _expertProfileService.CreateAsync(
                userId,
                request
            );

            return Ok(new
            {
                success = true,
                message = GetSubmitMessage(result.ProfileReviewStatus),
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

    [HttpPut("resubmit")]
    [Authorize(Roles = "EXPERT")]
    public async Task<IActionResult> ResubmitExpertProfile(
        [FromBody] CreateExpertProfileRequest request
    )
    {
        try
        {
            var userId = GetCurrentUserId();

            var result = await _expertProfileService.ResubmitAsync(
                userId,
                request
            );

            return Ok(new
            {
                success = true,
                message = GetSubmitMessage(result.ProfileReviewStatus),
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

    [HttpPut("me")]
    [Authorize(Roles = "EXPERT")]
    public async Task<IActionResult> UpdateMyExpertProfile(
        [FromBody] UpdateExpertProfileRequest request
    )
    {
        try
        {
            var userId = GetCurrentUserId();

            var result = await _expertProfileService.UpdateAsync(
                userId,
                request
            );

            return Ok(new
            {
                success = true,
                message = GetSubmitMessage(result.ProfileReviewStatus),
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

    [HttpPut("me/work-preferences")]
    [Authorize(Roles = "EXPERT")]
    public async Task<IActionResult> UpdateMyWorkPreferences(
        [FromBody] UpdateExpertWorkPreferencesRequest request
    )
    {
        try
        {
            var userId = GetCurrentUserId();

            var result = await _expertProfileService.UpdateWorkPreferencesAsync(
                userId,
                request
            );

            return Ok(new
            {
                success = true,
                message = "Expert work preferences updated successfully.",
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

    [HttpGet("me")]
    [Authorize(Roles = "EXPERT")]
    public async Task<IActionResult> GetMyExpertProfile()
    {
        try
        {
            var userId = GetCurrentUserId();

            var result = await _expertProfileService.GetMeAsync(userId);

            return Ok(new
            {
                success = true,
                message = "Expert profile retrieved successfully.",
                data = result
            });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new
            {
                success = false,
                message = ex.Message
            });
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

    private static string GetSubmitMessage(string? profileReviewStatus)
    {
        return profileReviewStatus?.Trim().ToUpperInvariant() switch
        {
            "APPROVED" => "Expert profile approved successfully.",
            "NEEDS_CORRECTION" => "Expert profile submitted but needs correction.",
            "REJECTED" => "Expert profile rejected.",
            _ => "Expert profile submitted but needs correction."
        };
    }
}