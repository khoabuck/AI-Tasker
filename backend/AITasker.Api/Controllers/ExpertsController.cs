using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/experts")]
public class ExpertsController : ControllerBase
{
    private readonly IExpertDirectoryService _expertDirectoryService;

    public ExpertsController(IExpertDirectoryService expertDirectoryService)
    {
        _expertDirectoryService = expertDirectoryService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetExperts(
        [FromQuery] string? keyword,
        [FromQuery] int? skillId,
        [FromQuery] string? level,
        [FromQuery] bool availableOnly = true,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12
    )
    {
        var result = await _expertDirectoryService.GetExpertsAsync(
            keyword,
            skillId,
            level,
            availableOnly,
            page,
            pageSize
        );

        return Ok(result);
    }

    [HttpGet("{expertProfileId:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetExpertById(int expertProfileId)
    {
        var expert = await _expertDirectoryService.GetExpertByIdAsync(expertProfileId);

        if (expert == null)
        {
            return NotFound(new
            {
                message = "Expert not found."
            });
        }

        return Ok(expert);
    }
}