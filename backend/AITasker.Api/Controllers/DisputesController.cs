using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Route("api/disputes")]
    [Authorize]
    public class DisputesController : ControllerBase
    {
        private readonly IDisputeService _disputeService;
        private readonly IImageUploadService _imageUploadService;

        public DisputesController(IDisputeService disputeService, IImageUploadService imageUploadService)
        {
            _disputeService = disputeService;
            _imageUploadService = imageUploadService;
        }

        [HttpPost]
        [Authorize(Roles = "CLIENT,EXPERT")]
        public async Task<IActionResult> OpenDispute([FromBody] OpenDisputeRequest request)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var result = await _disputeService.OpenDisputeAsync(
                    currentUserId,
                    request);

                return Ok(new
                {
                    success = true,
                    message = "Dispute opened successfully. Related escrow has been frozen.",
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

        [HttpGet("me")]
        [Authorize(Roles = "CLIENT,EXPERT")]
        public async Task<IActionResult> GetMyDisputes()
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var result = await _disputeService.GetMyDisputesAsync(currentUserId);

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

        [HttpGet("{disputeId:int}")]
        public async Task<IActionResult> GetDisputeById(int disputeId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var result = await _disputeService.GetDisputeByIdAsync(
                    currentUserId,
                    disputeId);

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

        [HttpPost("{disputeId:int}/evidences")]
        public async Task<IActionResult> AddEvidence(
            int disputeId,
            [FromBody] CreateDisputeEvidenceRequest request)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var result = await _disputeService.AddEvidenceAsync(
                    currentUserId,
                    disputeId,
                    request);

                return Ok(new
                {
                    success = true,
                    message = "Dispute evidence submitted successfully.",
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

        [HttpPost("{disputeId:int}/evidences/image")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(5 * 1024 * 1024)]
        public async Task<IActionResult> AddImageEvidence(
            int disputeId,
            [FromForm] AddDisputeEvidenceImageFormRequest request)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                if (request.Image == null || request.Image.Length == 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Evidence image is required."
                    });
                }

                await using var stream = request.Image.OpenReadStream();

                var uploadResult = await _imageUploadService.UploadImageAsync(
                    stream,
                    request.Image.FileName,
                    request.Image.ContentType,
                    request.Image.Length,
                    $"dispute-evidences/{disputeId}");

                var result = await _disputeService.AddEvidenceAsync(
                    currentUserId,
                    disputeId,
                    new CreateDisputeEvidenceRequest
                    {
                        EvidenceText = request.EvidenceText ?? string.Empty,
                        FileUrl = uploadResult.Url
                    });

                return Ok(new
                {
                    success = true,
                    message = "Dispute image evidence submitted successfully.",
                    image = uploadResult,
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

        public class AddDisputeEvidenceImageFormRequest
        {
            public string? EvidenceText { get; set; }

            public IFormFile Image { get; set; } = null!;
        }
    }
}