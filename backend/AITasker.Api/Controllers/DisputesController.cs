using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
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
        private const int MaxImagesPerRequest = 10;
        private const long MaxTotalRequestSize = 60 * 1024 * 1024;

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
        [RequestSizeLimit(MaxTotalRequestSize)]
        public async Task<IActionResult> OpenDispute([FromForm] OpenDisputeFormRequest request)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var uploadedImages = await UploadImagesAsync(
                    request.Images,
                    $"dispute-evidences/opening/{request.ProjectId}");

                var result = await _disputeService.OpenDisputeAsync(
                    currentUserId,
                    new OpenDisputeRequest
                    {
                        ProjectId = request.ProjectId,
                        MilestoneId = request.MilestoneId,
                        DeliverableId = request.DeliverableId,
                        RespondentUserId = request.RespondentUserId,
                        DisputedAmount = request.DisputedAmount,
                        Reason = request.Reason ?? string.Empty,
                        EvidenceText = request.EvidenceText,
                        EvidenceFileUrl = request.EvidenceFileUrl,
                        EvidenceImageUrl = request.EvidenceImageUrl,
                        EvidenceImageUrls = uploadedImages
                            .Select(x => x.Url)
                            .Where(x => !string.IsNullOrWhiteSpace(x))
                            .ToList()
                    });

                return Ok(new
                {
                    success = true,
                    message = "Dispute opened successfully. Related escrow has been frozen.",
                    images = uploadedImages,
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

        [HttpPost("{disputeId:int}/evidences/images")]
        [HttpPost("{disputeId:int}/evidences/image")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(MaxTotalRequestSize)]
        public async Task<IActionResult> AddImageEvidence(
            int disputeId,
            [FromForm] AddDisputeEvidenceImagesFormRequest request)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                if (request.Images == null || request.Images.Count == 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "At least one evidence image is required."
                    });
                }

                var uploadedImages = await UploadImagesAsync(
                    request.Images,
                    $"dispute-evidences/{disputeId}");

                var result = await _disputeService.AddEvidenceAsync(
                    currentUserId,
                    disputeId,
                    new CreateDisputeEvidenceRequest
                    {
                        EvidenceText = request.EvidenceText ?? string.Empty,
                        ImageUrls = uploadedImages
                            .Select(x => x.Url)
                            .Where(x => !string.IsNullOrWhiteSpace(x))
                            .ToList()
                    });

                return Ok(new
                {
                    success = true,
                    message = "Dispute image evidence submitted successfully.",
                    images = uploadedImages,
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

        private async Task<List<UploadImageResponse>> UploadImagesAsync(
            List<IFormFile>? images,
            string folder)
        {
            var result = new List<UploadImageResponse>();

            if (images == null || images.Count == 0)
            {
                return result;
            }

            if (images.Count > MaxImagesPerRequest)
            {
                throw new InvalidOperationException($"You can upload at most {MaxImagesPerRequest} images per request.");
            }

            foreach (var image in images)
            {
                if (image == null || image.Length == 0)
                {
                    continue;
                }

                await using var stream = image.OpenReadStream();

                var uploadResult = await _imageUploadService.UploadImageAsync(
                    stream,
                    image.FileName,
                    image.ContentType,
                    image.Length,
                    folder);

                result.Add(uploadResult);
            }

            return result;
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

            public int? DeliverableId { get; set; }

            public int? RespondentUserId { get; set; }

            public decimal DisputedAmount { get; set; }

            public string? Reason { get; set; }

            public string? EvidenceText { get; set; }

            public string? EvidenceFileUrl { get; set; }

            public string? EvidenceImageUrl { get; set; }

            public List<IFormFile>? Images { get; set; }
        }

        public class AddDisputeEvidenceImagesFormRequest
        {
            public string? EvidenceText { get; set; }

            public List<IFormFile> Images { get; set; } = new();
        }
    }
}
