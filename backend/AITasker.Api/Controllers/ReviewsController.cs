using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers
{
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
        public async Task<IActionResult> CreateProjectReview(
            int projectId,
            [FromBody] CreateReviewRequest request)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                var result = await _reviewService.CreateProjectReviewAsync(projectId, currentUserId, request);

                return Ok(new
                {
                    success = true,
                    message = "Review submitted successfully.",
                    data = result
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = ex.Message
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

        [HttpGet("api/experts/{expertId:int}/reviews")]
        [AllowAnonymous]
        public async Task<IActionResult> GetExpertReviews(int expertId)
        {
            var result = await _reviewService.GetExpertReviewsAsync(expertId);

            return Ok(new
            {
                success = true,
                data = result
            });
        }

        private int GetCurrentUserId()
        {
            var userIdValue =
                User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("userId")
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
                throw new InvalidOperationException("Invalid user token.");

            return userId;
        }
    }
}