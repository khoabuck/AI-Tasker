using System.Security.Claims;

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;
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
    private const string AuthCookieName = "access_token";

    private readonly IAuthService _authService;
    private readonly string _frontendBaseUrl;
    private readonly IWebHostEnvironment _environment;

    public AuthController(
        IAuthService authService,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        _authService = authService;
        _environment = environment;
        _frontendBaseUrl = (configuration["AppUrls:FrontendBaseUrl"] ?? "http://localhost:5173")
            .Trim()
            .TrimEnd('/');
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

            SetAuthCookie(result.AccessToken, result.ExpiresAt);

            return Ok(new
            {
                success = true,
                message = "Login successful.",
                data = new
                {
                    user = result.User,
                    expiresAt = result.ExpiresAt
                }
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
            return Redirect($"{_frontendBaseUrl}/login?oauth=failed");
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
            return Redirect($"{_frontendBaseUrl}/login?oauth=missing_info");
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

            SetAuthCookie(result.AccessToken, result.ExpiresAt);

            var redirectUrl =
                $"{_frontendBaseUrl}/oauth/callback" +
                $"?status={Uri.EscapeDataString(status)}" +
                $"&role={Uri.EscapeDataString(role)}" +
                $"&userId={result.User.UserId}" +
                $"&expiresAt={Uri.EscapeDataString(result.ExpiresAt.ToString("O"))}";

            return Redirect(redirectUrl);
        }
        catch (InvalidOperationException)
        {
            return Redirect($"{_frontendBaseUrl}/login?oauth=error");
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
                $"{_frontendBaseUrl}/verify-email" +
                $"?success=true" +
                $"&message={Uri.EscapeDataString(result.Message)}";

            return Redirect(redirectUrl);
        }
        catch (InvalidOperationException ex)
        {
            var redirectUrl =
                $"{_frontendBaseUrl}/verify-email" +
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

    [AllowAnonymous]
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        DeleteAuthCookie();

        return Ok(new
        {
            success = true,
            message = "Logout successful."
        });
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
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
            var result = await _authService.ChangePasswordAsync(
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

        if (user.Status == "SUSPENDED")
        {
            return Unauthorized(new
            {
                success = false,
                status = "SUSPENDED",
                message = "Your account is temporarily locked."
            });
        }

        if (user.Status == "BANNED")
        {
            return Unauthorized(new
            {
                success = false,
                status = "BANNED",
                message = "Your account has been banned."
            });
        }

        return Ok(user);
    }

    private void SetAuthCookie(string accessToken, DateTime expiresAt)
    {
        Response.Cookies.Append(
            AuthCookieName,
            accessToken,
            CreateAuthCookieOptions(expiresAt)
        );
    }

    private void DeleteAuthCookie()
    {
        Response.Cookies.Delete(
            AuthCookieName,
            CreateDeleteAuthCookieOptions()
        );
    }

    private CookieOptions CreateAuthCookieOptions(DateTime expiresAt)
    {
        var isProduction = _environment.IsProduction();

        return new CookieOptions
        {
            HttpOnly = true,
            Secure = isProduction,
            SameSite = isProduction ? SameSiteMode.None : SameSiteMode.Lax,
            Expires = ToUtcDateTimeOffset(expiresAt),
            Path = "/"
        };
    }

    private CookieOptions CreateDeleteAuthCookieOptions()
    {
        var isProduction = _environment.IsProduction();

        return new CookieOptions
        {
            HttpOnly = true,
            Secure = isProduction,
            SameSite = isProduction ? SameSiteMode.None : SameSiteMode.Lax,
            Path = "/"
        };
    }

    private static DateTimeOffset ToUtcDateTimeOffset(DateTime value)
    {
        var utcValue = value.Kind == DateTimeKind.Utc
            ? value
            : value.ToUniversalTime();

        return new DateTimeOffset(utcValue);
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