using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/admin/expert-profile-scoring-policy")]
[Authorize(Roles = "ADMIN")]
public class AdminExpertProfileScoringPoliciesController : ControllerBase
{
    private readonly IExpertProfileScoringPolicyService _scoringPolicyService;

    public AdminExpertProfileScoringPoliciesController(
        IExpertProfileScoringPolicyService scoringPolicyService)
    {
        _scoringPolicyService = scoringPolicyService;
    }

    // GET /api/admin/expert-profile-scoring-policy
    [HttpGet]
    public async Task<IActionResult> GetActivePolicy()
    {
        var policy = await _scoringPolicyService.GetActivePolicyAsync();

        return Ok(policy);
    }

    // PUT /api/admin/expert-profile-scoring-policy
    [HttpPut]
    public async Task<IActionResult> UpdateActivePolicy(
        [FromBody] UpdateExpertProfileScoringPolicyRequest request)
    {
        try
        {
            var adminId = GetCurrentAdminId();

            var policy = await _scoringPolicyService.UpdateActivePolicyAsync(
                adminId,
                request
            );

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
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? User.FindFirstValue("userId")
            ?? User.FindFirstValue("UserId");

        if (!int.TryParse(userIdValue, out var adminId))
        {
            throw new InvalidOperationException(
                "Cannot resolve current admin id from token."
            );
        }

        return adminId;
    }
}
