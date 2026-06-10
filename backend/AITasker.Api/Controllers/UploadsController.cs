using System.Security.Claims;
using AITasker.Api.Models;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/uploads")]
[Authorize]
public class UploadsController : ControllerBase
{
    private readonly IImageUploadService _imageUploadService;

    public UploadsController(IImageUploadService imageUploadService)
    {
        _imageUploadService = imageUploadService;
    }

    [HttpPost("images")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> UploadImage([FromForm] UploadImageFormRequest request)
    {
        try
        {
            if (request.File == null)
            {
                return BadRequest(new { message = "Image file is required." });
            }

            var folder = ResolveFolder(request.Purpose);

            await using var stream = request.File.OpenReadStream();

            var result = await _imageUploadService.UploadImageAsync(
                stream,
                request.File.FileName,
                request.File.ContentType,
                request.File.Length,
                folder
            );

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private string ResolveFolder(string? purpose)
    {
        var role = GetCurrentUserRole();

        var normalizedPurpose = string.IsNullOrWhiteSpace(purpose)
            ? "images"
            : purpose.Trim().ToLower();

        if (normalizedPurpose == "avatar")
        {
            if (role == "EXPERT")
            {
                return "expert-avatars";
            }

            if (role == "CLIENT")
            {
                return "client-avatars";
            }

            return "user-avatars";
        }

        if (normalizedPurpose == "certificate")
        {
            return "expert-certificates";
        }

        return "images";
    }

    private string? GetCurrentUserRole()
    {
        if (User.IsInRole("ADMIN"))
        {
            return "ADMIN";
        }

        if (User.IsInRole("CLIENT"))
        {
            return "CLIENT";
        }

        if (User.IsInRole("EXPERT"))
        {
            return "EXPERT";
        }

        return User.FindFirstValue(ClaimTypes.Role) ??
               User.FindFirstValue("role");
    }
}