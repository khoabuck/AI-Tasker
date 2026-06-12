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

                var result = await _projectService.InitializeProjectWithMilestonesAsync(contractId, milestones);

                return Ok(new 
                { 
                    Success = true,
                    Message = "Project and milestones initialized successfully with Escrow configuration.",
                    Data = result 
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new 
                { 
                    Success = false, 
                    Message = ex.Message 
                });
            }
            catch (Exception)
            {
                return StatusCode(500, new 
                { 
                    Success = false, 
                    Message = "An internal error occurred while processing your project initialization request." 
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
                throw new InvalidOperationException("Authorization failed: Invalid or missing user token.");
            }

            return userId;
        }
    }
}