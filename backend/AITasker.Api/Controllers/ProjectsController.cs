using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AITasker.Application.Interfaces;
using AITasker.Application.DTOs.Requests;

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

        [HttpPost("initialize/{contractId}")]
        public async Task<IActionResult> InitializeProject(
            int contractId,
            [FromBody] List<CreateMilestoneRequest> milestones)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                var result =
                    await _projectService.InitializeProjectWithMilestonesAsync(
                        currentUserId,
                        contractId,
                        milestones
                    );

                return Ok(new
                {
                    success = true,
                    message = "Project and milestones initialized successfully.",
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
            catch (Exception)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "An internal error occurred while initializing project."
                });
            }
        }

        private int GetCurrentUserId()
        {
            var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier)
                              ?? User.FindFirstValue("userId")
                              ?? User.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
            {
                throw new InvalidOperationException(
                    "Authorization failed: Invalid or missing user token."
                );
            }

            return userId;
        }
    }
}