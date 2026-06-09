using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/admin/reviews")]
[Authorize(Roles = "ADMIN")]
public class AdminReviewsController : ControllerBase
{
    private readonly IReviewService _reviewService;

    public AdminReviewsController(IReviewService reviewService)
    {
        _reviewService = reviewService;
    }

    [HttpPost("{reviewId:int}/hide")]
    public async Task<IActionResult> Hide(int reviewId)
    {
        try
        {
            var data = await _reviewService.HideAsync(reviewId);
            return Ok(new { success = true, message = "Review hidden.", data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
