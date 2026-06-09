using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/experts/me/skills")]
[Authorize(Roles = "EXPERT")]
public class ExpertSkillsController : ControllerBase
{
    private readonly IExpertSkillService _expertSkillService;

    public ExpertSkillsController(IExpertSkillService expertSkillService)
    {
        _expertSkillService = expertSkillService;
    }

    [HttpGet]
    public async Task<IActionResult> GetMine()
    {
        try
        {
            var data = await _expertSkillService.GetMySkillsAsync(GetCurrentUserId());
            return Ok(new { success = true, data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut]
    public async Task<IActionResult> SetMine([FromBody] SetExpertSkillsRequest request)
    {
        try
        {
            var data = await _expertSkillService.SetMySkillsAsync(GetCurrentUserId(), request);
            return Ok(new { success = true, message = "Skills updated.", data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
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
