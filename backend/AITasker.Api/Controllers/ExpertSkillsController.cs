using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/expert-skills")]
public class ExpertSkillsController : ControllerBase
{
    private readonly IExpertSkillService _expertSkillService;

    public ExpertSkillsController(IExpertSkillService expertSkillService)
    {
        _expertSkillService = expertSkillService;
    }

    [HttpGet("my")]
    [Authorize(Roles = "EXPERT")]
    public async Task<IActionResult> GetMySkills()
    {
        try
        {
            var userId = GetCurrentUserId();
            var skills = await _expertSkillService.GetMySkillsAsync(userId);

            return Ok(skills);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("my")]
    [Authorize(Roles = "EXPERT")]
    public async Task<IActionResult> UpdateMySkills([FromBody] UpdateExpertSkillsRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var skills = await _expertSkillService.UpdateMySkillsAsync(userId, request);

            return Ok(skills);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("expert/{expertProfileId:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetExpertSkills(int expertProfileId)
    {
        try
        {
            var skills = await _expertSkillService.GetExpertSkillsAsync(expertProfileId);

            return Ok(skills);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    private int GetCurrentUserId()
    {
        var userIdValue =
            User.FindFirstValue("userId") ??
            User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(userIdValue))
        {
            throw new InvalidOperationException("UserId not found in token.");
        }

        return int.Parse(userIdValue);
    }
}