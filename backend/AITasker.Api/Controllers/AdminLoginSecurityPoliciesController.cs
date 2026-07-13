using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/admin/login-security-policy")]
[Authorize(Roles = "ADMIN")]
public class AdminLoginSecurityPoliciesController : ControllerBase
{
    private readonly ILoginSecurityPolicyService _loginSecurityPolicyService;

    public AdminLoginSecurityPoliciesController(
        ILoginSecurityPolicyService loginSecurityPolicyService)
    {
        _loginSecurityPolicyService = loginSecurityPolicyService;
    }

    [HttpGet]
    public async Task<IActionResult> GetActivePolicy()
    {
        var policy = await _loginSecurityPolicyService.GetActivePolicyAsync();

        return Ok(policy);
    }

    [HttpPut]
    public async Task<IActionResult> UpdateActivePolicy(
        [FromBody] UpdateLoginSecurityPolicyRequest request)
    {
        try
        {
            var adminId = GetCurrentAdminId();

            var policy = await _loginSecurityPolicyService.UpdateActivePolicyAsync(
                adminId,
                request
            );

            return Ok(policy);
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
