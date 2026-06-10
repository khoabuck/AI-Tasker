using System.Security.Claims;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/recommendations")]
public class RecommendationsController : ControllerBase
{
    private readonly IRecommendationService _recommendationService;

    public RecommendationsController(IRecommendationService recommendationService)
    {
        _recommendationService = recommendationService;
    }

    [HttpGet("jobs/{jobPostingId:int}/experts")]
    [Authorize(Roles = "CLIENT,ADMIN")]
    public async Task<IActionResult> GetRecommendedExpertsForJob(
        int jobPostingId,
        [FromQuery] int limit = 10
    )
    {
        try
        {
            var userId = GetCurrentUserId();
            var role = GetCurrentUserRole();

            var recommendations =
                await _recommendationService.GetRecommendedExpertsForJobAsync(
                    userId,
                    role,
                    jobPostingId,
                    limit
                );

            return Ok(recommendations);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
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

    private string? GetCurrentUserRole()
    {
        return User.FindFirstValue("role") ??
            User.FindFirstValue(ClaimTypes.Role);
    }
}