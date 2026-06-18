using System.Security.Claims;

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private const string GoogleScheme = "Google";
    private const string ExternalCookieScheme = "External";

    // FE đang chạy port 5173.
    // Nếu Vite tự nhảy sang 5174 thì đổi dòng này thành http://localhost:5174
    private const string FrontendBaseUrl = "http://localhost:5173";

    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        try
        {
            var result = await _authService.RegisterAsync(request);

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                success = false,
                message = ex.Message
            });
        }
        catch (DbUpdateException)
        {
            return BadRequest(new
            {
                success = false,
                message = "Cannot register user. Email may already exist."
            });
        }
    }
    
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        try
        {
            var result = await _authService.LoginAsync(request);

            return Ok(result);
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

    [AllowAnonymous]
    [HttpGet("google-login")]
    public IActionResult GoogleLogin()
    {
        var properties = new AuthenticationProperties
        {
            RedirectUri = Url.Action(nameof(GoogleCallback), "Auth")
        };

        return Challenge(properties, GoogleScheme);
    }

    [AllowAnonymous]
    [HttpGet("google-callback")]
    public async Task<IActionResult> GoogleCallback()
    {
        var authenticateResult = await HttpContext.AuthenticateAsync(
            ExternalCookieScheme
        );

        if (!authenticateResult.Succeeded || authenticateResult.Principal == null)
        {
            return Redirect($"{FrontendBaseUrl}/login?oauth=failed");
        }

        var principal = authenticateResult.Principal;

        var googleId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        var email = principal.FindFirstValue(ClaimTypes.Email);
        var fullName = principal.FindFirstValue(ClaimTypes.Name);
        var avatarUrl = principal.FindFirstValue("urn:google:picture");

        await HttpContext.SignOutAsync(ExternalCookieScheme);

        if (string.IsNullOrWhiteSpace(googleId)
            || string.IsNullOrWhiteSpace(email))
        {
            return Redirect($"{FrontendBaseUrl}/login?oauth=missing_info");
        }

        try
        {
            var result = await _authService.GoogleLoginAsync(
                email,
                fullName ?? email,
                googleId,
                avatarUrl
            );

            var role = result.User.Role ?? string.Empty;
            var status = result.User.Status ?? string.Empty;

            var redirectUrl =
                $"{FrontendBaseUrl}/oauth/callback" +
                $"?token={Uri.EscapeDataString(result.AccessToken)}" +
                $"&status={Uri.EscapeDataString(status)}" +
                $"&role={Uri.EscapeDataString(role)}" +
                $"&userId={result.User.UserId}";

            return Redirect(redirectUrl);
        }
        catch (InvalidOperationException)
        {
            return Redirect($"{FrontendBaseUrl}/login?oauth=error");
        }
    }

    [AllowAnonymous]
    [HttpGet("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromQuery] string token)
    {
        try
        {
            var result = await _authService.VerifyEmailAsync(token);

            var redirectUrl =
                $"{FrontendBaseUrl}/verify-email" +
                $"?success=true" +
                $"&message={Uri.EscapeDataString(result.Message)}";

            return Redirect(redirectUrl);
        }
        catch (InvalidOperationException ex)
        {
            var redirectUrl =
                $"{FrontendBaseUrl}/verify-email" +
                $"?success=false" +
                $"&message={Uri.EscapeDataString(ex.Message)}";

            return Redirect(redirectUrl);
        }
    }

    [AllowAnonymous]
    [HttpPost("resend-verification-email")]
    public async Task<IActionResult> ResendVerificationEmail(
        ResendVerificationEmailRequest request)
    {
        try
        {
            var result = await _authService.ResendVerificationEmailAsync(request);

            return Ok(result);
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

    [AllowAnonymous]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
    {
        try
        {
            var result = await _authService.ForgotPasswordAsync(request);

            return Ok(result);
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

    [AllowAnonymous]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
    {
        try
        {
            var result = await _authService.ResetPasswordAsync(request);

            return Ok(result);
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

    [Authorize]
    [HttpPost("select-role")]
    public async Task<IActionResult> SelectRole(SelectRoleRequest request)
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

        try
        {
            var result = await _authService.SelectRoleAsync(
                userId.Value,
                request
            );

            return Ok(result);
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

    [Authorize]
    [HttpPut("me/avatar")]
    public async Task<IActionResult> UpdateMyAvatar(UpdateAvatarRequest request)
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

        try
        {
            var result = await _authService.UpdateAvatarAsync(
                userId.Value,
                request
            );

            return Ok(result);
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

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
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

        var user = await _authService.GetCurrentUserAsync(userId.Value);

        if (user == null)
        {
            return NotFound(new
            {
                success = false,
                message = "User not found."
            });
        }

        if (user.Status == "SUSPENDED" || user.Status == "BANNED")
        {
            return Unauthorized(new
            {
                success = false,
                message = "Your account is not allowed to access this resource."
            });
        }

        return Ok(user);
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
}