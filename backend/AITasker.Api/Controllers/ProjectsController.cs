using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System.Collections.Generic;
using AITasker.Application.Interfaces;
using AITasker.Application.DTOs.Requests;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProjectsController : ControllerBase
    {
        private readonly IProjectService _projectService;

        public ProjectsController(IProjectService projectService)
        {
            _projectService = projectService;
        }

        [HttpPost("initialize/{contractId}")]
        public async Task<IActionResult> InitializeProject(int contractId, [FromBody] List<CreateMilestoneRequest> milestones)
        {
            var result = await _projectService.InitializeProjectWithMilestonesAsync(contractId, milestones);
            return Ok(new { Success = result });
        }
    }
}