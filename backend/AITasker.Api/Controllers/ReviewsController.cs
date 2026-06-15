using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api")]
    public class ReviewsController : ControllerBase
    {
        private readonly IReviewService _reviewService;

        public ReviewsController(IReviewService reviewService)
        {
            _reviewService = reviewService;
        }

        [HttpPost("projects/{projectId:int}/reviews")]
        [Authorize(Roles = "CLIENT")]
        public async Task<IActionResult> CreateProjectReview(
            int projectId,
            [FromBody] CreateReviewRequest request)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var result = await _reviewService.CreateProjectReviewAsync(
                    projectId,
                    currentUserId,
                    request);

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

        [HttpGet("projects/{projectId:int}/review")]
        public async Task<IActionResult> GetProjectReview(int projectId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var result = await _reviewService.GetProjectReviewAsync(
                    currentUserId,
                    projectId);

                return Ok(new
                {
                    success = true,
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
                return NotFound(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        [HttpGet("experts/{expertProfileId:int}/reviews")]
        [AllowAnonymous]
        public async Task<IActionResult> GetExpertReviews(int expertProfileId)
        {
            try
            {
                var result = await _reviewService.GetExpertReviewsAsync(expertProfileId);

                return Ok(new
                {
                    success = true,
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

        [HttpGet("reviews/me")]
        [Authorize(Roles = "CLIENT,EXPERT,ADMIN")]
        public async Task<IActionResult> GetMyReviews()
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var result = await _reviewService.GetMyReviewsAsync(currentUserId);

                return Ok(new
                {
                    success = true,
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

        private int GetCurrentUserId()
        {
            var userIdValue =
                User.FindFirstValue("userId") ??
                User.FindFirstValue(ClaimTypes.NameIdentifier) ??
                User.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
            {
                throw new InvalidOperationException("Invalid user token.");
            }

            return userId;
        }
    }
}