using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/skills")]
public class SkillsController : ControllerBase
{
    private readonly ISkillService _skillService;

    public SkillsController(ISkillService skillService)
    {
        _skillService = skillService;
    }

    // GET /api/skills?keyword=AI&category=LLM&activeOnly=true
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetSkills(
        [FromQuery] string? keyword,
        [FromQuery] string? category,
        [FromQuery] bool activeOnly = true)
    {
        var skills = await _skillService.GetSkillsAsync(keyword, category, activeOnly);
        return Ok(skills);
    }

    // GET /api/skills/1
    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetSkillById(int id)
    {
        var skill = await _skillService.GetSkillByIdAsync(id);

        if (skill == null)
        {
            return NotFound(new { message = "Skill not found." });
        }

        return Ok(skill);
    }

    // POST /api/skills
    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> CreateSkill([FromBody] CreateSkillRequest request)
    {
        try
        {
            var skill = await _skillService.CreateSkillAsync(request);
            return CreatedAtAction(nameof(GetSkillById), new { id = skill.SkillId }, skill);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // PUT /api/skills/1
    [HttpPut("{id:int}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> UpdateSkill(int id, [FromBody] UpdateSkillRequest request)
    {
        try
        {
            var skill = await _skillService.UpdateSkillAsync(id, request);

            if (skill == null)
            {
                return NotFound(new { message = "Skill not found." });
            }

            return Ok(skill);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // DELETE /api/skills/1
    // Không xóa cứng vì JobSkills/ExpertSkills có thể đang tham chiếu Skill này.
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeactivateSkill(int id)
    {
        var result = await _skillService.DeactivateSkillAsync(id);

        if (!result)
        {
            return NotFound(new { message = "Skill not found." });
        }

        return Ok(new { message = "Skill deactivated successfully." });
    }

    // PUT /api/skills/1/activate
    [HttpPut("{id:int}/activate")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> ActivateSkill(int id)
    {
        var result = await _skillService.ActivateSkillAsync(id);

        if (!result)
        {
            return NotFound(new { message = "Skill not found." });
        }

        return Ok(new { message = "Skill activated successfully." });
    }
}