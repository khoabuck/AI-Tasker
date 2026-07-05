using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Route("api/admin/review-reports")]
    [Authorize(Roles = "ADMIN")]
    public class AdminReviewReportsController : ControllerBase
    {
        private readonly IReviewReportService _reviewReportService;

        public AdminReviewReportsController(IReviewReportService reviewReportService)
        {
            _reviewReportService = reviewReportService;
        }

        [HttpGet]
        public async Task<IActionResult> GetReviewReports(
            [FromQuery] string? status,
            [FromQuery] int take = 100)
        {
            try
            {
                var result = await _reviewReportService.GetAdminReviewReportsAsync(status, take);

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

        [HttpGet("{reviewReportId:int}")]
        public async Task<IActionResult> GetReviewReportById(int reviewReportId)
        {
            try
            {
                var result = await _reviewReportService.GetAdminReviewReportByIdAsync(reviewReportId);

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

        [HttpPost("{reviewReportId:int}/resolve")]
        public async Task<IActionResult> ResolveReviewReport(
            int reviewReportId,
            [FromBody] ResolveReviewReportRequest request)
        {
            try
            {
                var currentAdminUserId = GetCurrentUserId();

                var result = await _reviewReportService.ResolveReviewReportAsync(
                    currentAdminUserId,
                    reviewReportId,
                    request);

                return Ok(new
                {
                    success = true,
                    message = "Review report resolved successfully.",
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

        private int GetCurrentUserId()
        {
            var userIdValue =
                User.FindFirstValue("userId") ??
                User.FindFirstValue(ClaimTypes.NameIdentifier) ??
                User.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
            {
                throw new InvalidOperationException("Authorization failed: Invalid token.");
            }

            return userId;
        }
    }
}
