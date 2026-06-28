using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/admin/job-posting-ai-policy")]
[Authorize(Roles = "ADMIN")]
public class AdminJobPostingAiPolicyController : ControllerBase
{
    private readonly IJobPostingAiPolicyService _policyService;

    public AdminJobPostingAiPolicyController(IJobPostingAiPolicyService policyService)
    {
        _policyService = policyService;
    }

    [HttpGet]
    public async Task<IActionResult> GetActivePolicy()
    {
        var policy = await _policyService.GetActivePolicyAsync();
        return Ok(policy);
    }

    [HttpPut]
    public async Task<IActionResult> UpdateActivePolicy(
        [FromBody] UpdateJobPostingAiPolicyRequest request)
    {
        try
        {
            var adminId = GetCurrentAdminId();
            var policy = await _policyService.UpdateActivePolicyAsync(
                adminId,
                request);

            return Ok(policy);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }

    private int GetCurrentAdminId()
    {
        var userIdValue =
            User.FindFirstValue("userId") ??
            User.FindFirstValue(ClaimTypes.NameIdentifier) ??
            User.FindFirstValue("sub") ??
            User.FindFirstValue("UserId");

        if (!int.TryParse(userIdValue, out var adminId))
        {
            throw new InvalidOperationException("Cannot resolve current admin id from token.");
        }

        return adminId;
    }
}
