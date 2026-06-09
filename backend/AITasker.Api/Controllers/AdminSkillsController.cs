using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/admin/skills")]
[Authorize(Roles = "ADMIN")]
public class AdminSkillsController : ControllerBase
{
    private readonly ISkillService _skillService;

    public AdminSkillsController(ISkillService skillService)
    {
        _skillService = skillService;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSkillRequest request)
    {
        try
        {
            var data = await _skillService.CreateAsync(request);
            return Ok(new { success = true, message = "Skill created.", data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("{skillId:int}")]
    public async Task<IActionResult> Update(int skillId, [FromBody] UpdateSkillRequest request)
    {
        try
        {
            var data = await _skillService.UpdateAsync(skillId, request);
            return Ok(new { success = true, message = "Skill updated.", data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
