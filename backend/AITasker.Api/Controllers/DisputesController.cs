using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
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

        public DisputesController(
            IDisputeService disputeService,
            IImageUploadService imageUploadService)
        {
            _disputeService = disputeService;
            _imageUploadService = imageUploadService;
        }

        [HttpPost]
        [Authorize(Roles = "CLIENT,EXPERT")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(5 * 1024 * 1024)]
        public async Task<IActionResult> OpenDispute([FromForm] OpenDisputeFormRequest request)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                string? uploadedImageUrl = null;
                object? imagePayload = null;

                if (request.Image != null && request.Image.Length > 0)
                {
                    await using var stream = request.Image.OpenReadStream();

                    var uploadResult = await _imageUploadService.UploadImageAsync(
                        stream,
                        request.Image.FileName,
                        request.Image.ContentType,
                        request.Image.Length,
                        $"dispute-evidences/opening/{request.ProjectId}");

                    uploadedImageUrl = uploadResult.Url;
                    imagePayload = uploadResult;
                }

                var result = await _disputeService.OpenDisputeAsync(
                    currentUserId,
                    new OpenDisputeRequest
                    {
                        ProjectId = request.ProjectId,
                        MilestoneId = request.MilestoneId,
                        RespondentUserId = request.RespondentUserId,
                        DisputedAmount = request.DisputedAmount,
                        Reason = request.Reason ?? string.Empty,
                        EvidenceText = request.EvidenceText,
                        EvidenceFileUrl = request.EvidenceFileUrl,
                        EvidenceImageUrl = uploadedImageUrl ?? request.EvidenceImageUrl
                    });

                return Ok(new
                {
                    success = true,
                    message = "Dispute opened successfully. Related escrow has been frozen.",
                    image = imagePayload,
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
        [Authorize(Roles = "CLIENT,EXPERT")]
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
        [Authorize(Roles = "CLIENT,EXPERT")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(5 * 1024 * 1024)]
        public async Task<IActionResult> AddImageEvidence(
            int disputeId,
            [FromForm] AddDisputeEvidenceImageFormRequest request)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                string? uploadedImageUrl = null;
                object? imagePayload = null;

                if (request.Image != null && request.Image.Length > 0)
                {
                    await using var stream = request.Image.OpenReadStream();

                    var uploadResult = await _imageUploadService.UploadImageAsync(
                        stream,
                        request.Image.FileName,
                        request.Image.ContentType,
                        request.Image.Length,
                        $"dispute-evidences/{disputeId}");

                    uploadedImageUrl = uploadResult.Url;
                    imagePayload = uploadResult;
                }

                if (string.IsNullOrWhiteSpace(uploadedImageUrl) &&
                    string.IsNullOrWhiteSpace(request.ImageUrl))
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Evidence image or imageUrl is required."
                    });
                }

                var result = await _disputeService.AddEvidenceAsync(
                    currentUserId,
                    disputeId,
                    new CreateDisputeEvidenceRequest
                    {
                        EvidenceText = request.EvidenceText ?? string.Empty,
                        FileUrl = request.FileUrl,
                        ImageUrl = uploadedImageUrl ?? request.ImageUrl
                    });

                return Ok(new
                {
                    success = true,
                    message = "Dispute image evidence submitted successfully.",
                    image = imagePayload,
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

        public class OpenDisputeFormRequest
        {
            public int ProjectId { get; set; }

            public int? MilestoneId { get; set; }

            public int? RespondentUserId { get; set; }

            public decimal DisputedAmount { get; set; }

            public string? Reason { get; set; }

            public string? EvidenceText { get; set; }

            public string? EvidenceFileUrl { get; set; }

            public string? EvidenceImageUrl { get; set; }

            public IFormFile? Image { get; set; }
        }

        public class AddDisputeEvidenceImageFormRequest
        {
            public string? EvidenceText { get; set; }

            public string? FileUrl { get; set; }

            public string? ImageUrl { get; set; }

            public IFormFile? Image { get; set; }
        }
    }
}