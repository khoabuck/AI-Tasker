using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Authorize]
public class ReviewsController : ControllerBase
{
    private readonly IReviewService _reviewService;

    public ReviewsController(IReviewService reviewService)
    {
        _reviewService = reviewService;
    }

    [HttpPost("api/projects/{projectId:int}/reviews")]
    [Authorize(Roles = "CLIENT")]
    public async Task<IActionResult> Create(int projectId, [FromBody] CreateReviewRequest request)
    {
        try
        {
            var data = await _reviewService.CreateAsync(GetCurrentUserId(), projectId, request);
            return Ok(new { success = true, message = "Review submitted.", data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("api/experts/{expertId:int}/reviews")]
    [AllowAnonymous]
    public async Task<IActionResult> GetExpertReviews(int expertId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        try
        {
            var data = await _reviewService.GetExpertReviewsAsync(expertId, page, pageSize);
            return Ok(new { success = true, data });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("api/experts/me/reviews")]
    [Authorize(Roles = "EXPERT")]
    public async Task<IActionResult> GetMine()
    {
        try
        {
            var data = await _reviewService.GetMyReceivedAsync(GetCurrentUserId());
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
