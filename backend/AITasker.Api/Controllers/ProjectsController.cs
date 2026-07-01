using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Route("api/projects")]
    [Authorize]
    public class ProjectsController : ControllerBase
    {
        private readonly IProjectService _projectService;

        public ProjectsController(IProjectService projectService)
        {
            _projectService = projectService;
        }

        [HttpGet("me")]
        [Authorize(Roles = "CLIENT,EXPERT")]
        public async Task<IActionResult> GetMyProjects()
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var result = await _projectService.GetMyProjectsAsync(currentUserId);

                return Ok(new
                {
                    success = true,
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

        [HttpGet("{projectId:int}")]
        public async Task<IActionResult> GetProjectById(int projectId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var result = await _projectService.GetProjectByIdAsync(
                    currentUserId,
                    projectId);

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = ex.Message
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

        [HttpGet("{projectId:int}/milestones")]
        public async Task<IActionResult> GetProjectMilestones(int projectId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var result = await _projectService.GetProjectMilestonesAsync(
                    currentUserId,
                    projectId);

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = ex.Message
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

        [HttpPost("{projectId:int}/complete-check")]
        public async Task<IActionResult> CompleteProjectCheck(int projectId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var result = await _projectService.CompleteProjectCheckAsync(
                    currentUserId,
                    projectId);

                return Ok(new
                {
                    success = true,
                    message = "Project completion check finished.",
                    data = result
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = ex.Message
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

        [HttpGet("/api/milestones/{milestoneId:int}")]
        public async Task<IActionResult> GetMilestoneById(int milestoneId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var result = await _projectService.GetMilestoneByIdAsync(
                    currentUserId,
                    milestoneId);

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = ex.Message
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
                User.FindFirstValue("userId") ??
                User.FindFirstValue(ClaimTypes.NameIdentifier) ??
                User.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
            {
                throw new InvalidOperationException("Invalid user token.");
            }

            return userId;
        }
    }
}