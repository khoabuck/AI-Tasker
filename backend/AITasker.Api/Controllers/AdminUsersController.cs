using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = "ADMIN")]
public class AdminUsersController : ControllerBase
{
    private readonly IAdminUserService _adminUserService;

    public AdminUsersController(IAdminUserService adminUserService)
    {
        _adminUserService = adminUserService;
    }

    // GET /api/admin/users?search=a&role=CLIENT&status=ACTIVE
    [HttpGet]
    public async Task<IActionResult> GetUsers(
        [FromQuery] string? search,
        [FromQuery] string? role,
        [FromQuery] string? status)
    {
        var users = await _adminUserService.GetUsersAsync(
            search,
            role,
            status
        );

        return Ok(users);
    }

    // GET /api/admin/users/1
    [HttpGet("{userId:int}")]
    public async Task<IActionResult> GetUserById(int userId)
    {
        var user = await _adminUserService.GetUserByIdAsync(userId);

        if (user == null)
        {
            return NotFound(new
            {
                message = "User not found."
            });
        }

        return Ok(user);
    }

    // PATCH /api/admin/users/1/lock
    [HttpPatch("{userId:int}/lock")]
    public async Task<IActionResult> LockUser(
        int userId,
        [FromBody] AdminLockUserRequest request)
    {
        try
        {
            var adminId = GetCurrentAdminId();

            var user = await _adminUserService.LockUserAsync(
                adminId,
                userId,
                request
            );

            if (user == null)
            {
                return NotFound(new
                {
                    message = "User not found."
                });
            }

            return Ok(user);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }

    // PATCH /api/admin/users/1/unlock
    [HttpPatch("{userId:int}/unlock")]
    public async Task<IActionResult> UnlockUser(
        int userId,
        [FromBody] AdminUnlockUserRequest request)
    {
        try
        {
            var adminId = GetCurrentAdminId();

            var user = await _adminUserService.UnlockUserAsync(
                adminId,
                userId,
                request
            );

            if (user == null)
            {
                return NotFound(new
                {
                    message = "User not found."
                });
            }

            return Ok(user);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }

    // PATCH /api/admin/users/1/ban
    [HttpPatch("{userId:int}/ban")]
    public async Task<IActionResult> BanUser(
        int userId,
        [FromBody] AdminBanUserRequest request)
    {
        try
        {
            var adminId = GetCurrentAdminId();

            var user = await _adminUserService.BanUserAsync(
                adminId,
                userId,
                request
            );

            if (user == null)
            {
                return NotFound(new
                {
                    message = "User not found."
                });
            }

            return Ok(user);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }

    private int GetCurrentAdminId()
    {
        var userIdValue = User.FindFirstValue("userId")
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!int.TryParse(userIdValue, out var adminId))
        {
            throw new InvalidOperationException("Invalid admin token.");
        }

        return adminId;
    }
}
