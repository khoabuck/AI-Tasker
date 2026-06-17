using System.Security.Claims;
using AITasker.Api.Models;
using AITasker.Application.DTOs.Requests;
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
    private readonly IAuthService _authService;

    public UploadsController(
        IImageUploadService imageUploadService,
        IAuthService authService)
    {
        _imageUploadService = imageUploadService;
        _authService = authService;
    }

    [HttpPost("images")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> UploadImage(
        [FromForm] UploadImageFormRequest request)
    {
        try
        {
            if (request.File == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Image file is required."
                });
            }

            var normalizedPurpose = NormalizePurpose(request.Purpose);
            var folder = ResolveFolder(normalizedPurpose);

            await using var stream = request.File.OpenReadStream();

            var uploadResult = await _imageUploadService.UploadImageAsync(
                stream,
                request.File.FileName,
                request.File.ContentType,
                request.File.Length,
                folder
            );

            if (normalizedPurpose == "avatar")
            {
                var userId = GetCurrentUserId();

                if (userId == null)
                {
                    return Unauthorized(new
                    {
                        success = false,
                        message = "Invalid token."
                    });
                }

                var updatedUser = await _authService.UpdateAvatarAsync(
                    userId.Value,
                    new UpdateAvatarRequest
                    {
                        AvatarUrl = uploadResult.Url
                    }
                );

                return Ok(new
                {
                    success = true,
                    message = "Avatar uploaded and updated successfully.",
                    avatarUrl = uploadResult.Url,
                    image = uploadResult,
                    user = updatedUser
                });
            }

            return Ok(new
            {
                success = true,
                message = "Image uploaded successfully.",
                image = uploadResult
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

    private string ResolveFolder(string normalizedPurpose)
    {
        var role = GetCurrentUserRole();

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

    private static string NormalizePurpose(string? purpose)
    {
        return string.IsNullOrWhiteSpace(purpose)
            ? "images"
            : purpose.Trim().ToLowerInvariant();
    }

    private int? GetCurrentUserId()
    {
        var userIdText = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("userId");

        if (!int.TryParse(userIdText, out var userId))
        {
            return null;
        }

        return userId;
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

        return User.FindFirstValue(ClaimTypes.Role)
            ?? User.FindFirstValue("role");
    }
}