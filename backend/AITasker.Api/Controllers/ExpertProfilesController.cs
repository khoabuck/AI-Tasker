using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/expert-profiles")]
[Authorize]
public class ExpertProfilesController : ControllerBase
{
    private readonly IExpertProfileService _expertProfileService;

    public ExpertProfilesController(IExpertProfileService expertProfileService)
    {
        _expertProfileService = expertProfileService;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateExpertProfileRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _expertProfileService.CreateAsync(userId, request);

            return Ok(new
            {
                success = true,
                message = "Expert profile submitted successfully.",
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

    [HttpPut("resubmit")]
    public async Task<IActionResult> Resubmit([FromBody] CreateExpertProfileRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _expertProfileService.ResubmitAsync(userId, request);

            return Ok(new
            {
                success = true,
                message = "Expert profile resubmitted successfully.",
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

    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _expertProfileService.GetMeAsync(userId);

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

    private int GetCurrentUserId()
    {
        var userIdValue =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("userId")
            ?? User.FindFirstValue("sub");

        if (!int.TryParse(userIdValue, out var userId))
        {
            throw new InvalidOperationException("Invalid user token.");
        }

        return userId;
    }
}