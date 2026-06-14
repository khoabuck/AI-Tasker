using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/client-profiles")]
[Authorize]
public class ClientProfilesController : ControllerBase
{
    private readonly IClientProfileService _clientProfileService;

    public ClientProfilesController(IClientProfileService clientProfileService)
    {
        _clientProfileService = clientProfileService;
    }

    [HttpPost("individual")]
    public async Task<IActionResult> CreateIndividual(
        CreateIndividualClientProfileRequest request)
    {
        var userIdResult = GetCurrentUserId();

        if (userIdResult == null)
        {
            return Unauthorized(new
            {
                success = false,
                message = "Invalid token."
            });
        }

        try
        {
            var result = await _clientProfileService.CreateIndividualAsync(
                userIdResult.Value,
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

    [HttpPost("business")]
    public async Task<IActionResult> CreateBusiness(
        CreateBusinessClientProfileRequest request)
    {
        var userIdResult = GetCurrentUserId();

        if (userIdResult == null)
        {
            return Unauthorized(new
            {
                success = false,
                message = "Invalid token."
            });
        }

        try
        {
            var result = await _clientProfileService.CreateBusinessAsync(
                userIdResult.Value,
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

    [HttpPut("business/resubmit")]
    public async Task<IActionResult> ResubmitBusiness(
        CreateBusinessClientProfileRequest request)
    {
        var userIdResult = GetCurrentUserId();

        if (userIdResult == null)
        {
            return Unauthorized(new
            {
                success = false,
                message = "Invalid token."
            });
        }

        try
        {
            var result = await _clientProfileService.ResubmitBusinessAsync(
                userIdResult.Value,
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

    [HttpPut("individual/me")]
    public async Task<IActionResult> UpdateIndividual(
        UpdateIndividualClientProfileRequest request)
    {
        var userIdResult = GetCurrentUserId();

        if (userIdResult == null)
        {
            return Unauthorized(new
            {
                success = false,
                message = "Invalid token."
            });
        }

        try
        {
            var result = await _clientProfileService.UpdateIndividualAsync(
                userIdResult.Value,
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

    [HttpPut("business/me")]
    public async Task<IActionResult> UpdateBusiness(
        UpdateBusinessClientProfileRequest request)
    {
        var userIdResult = GetCurrentUserId();

        if (userIdResult == null)
        {
            return Unauthorized(new
            {
                success = false,
                message = "Invalid token."
            });
        }

        try
        {
            var result = await _clientProfileService.UpdateBusinessAsync(
                userIdResult.Value,
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

    [HttpGet("me")]
    public async Task<IActionResult> GetMyProfile()
    {
        var userIdResult = GetCurrentUserId();

        if (userIdResult == null)
        {
            return Unauthorized(new
            {
                success = false,
                message = "Invalid token."
            });
        }

        var result = await _clientProfileService.GetMyProfileAsync(
            userIdResult.Value
        );

        if (result == null)
        {
            return NotFound(new
            {
                success = false,
                message = "Client profile not found."
            });
        }

        return Ok(result);
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