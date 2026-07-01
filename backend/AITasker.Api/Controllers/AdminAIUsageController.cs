using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/admin/ai-usage")]
[Authorize(Roles = "ADMIN")]
public class AdminAIUsageController : ControllerBase
{
    private readonly IAIUsageCostService _aiUsageCostService;

    public AdminAIUsageController(IAIUsageCostService aiUsageCostService)
    {
        _aiUsageCostService = aiUsageCostService;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _aiUsageCostService.GetCostOverviewAsync(
                from,
                to,
                cancellationToken);

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

    [HttpGet("logs")]
    public async Task<IActionResult> GetLogs(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? provider,
        [FromQuery] string? moduleName,
        [FromQuery] int take = 100,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _aiUsageCostService.GetUsageLogsAsync(
                from,
                to,
                provider,
                moduleName,
                take,
                cancellationToken);

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

    [HttpGet("pricing-policies")]
    public async Task<IActionResult> GetPricingPolicies(
        [FromQuery] string? provider,
        [FromQuery] string? modelName,
        [FromQuery] bool? isActive,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _aiUsageCostService.GetPricingPoliciesAsync(
                provider,
                modelName,
                isActive,
                cancellationToken);

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

    [HttpPost("pricing-policies")]
    public async Task<IActionResult> UpsertPricingPolicy(
        [FromBody] UpsertAIModelPricingPolicyRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _aiUsageCostService.UpsertPricingPolicyAsync(
                request,
                GetCurrentUserId(),
                cancellationToken);

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

    [HttpPatch("pricing-policies/{policyId:int}/deactivate")]
    public async Task<IActionResult> DeactivatePricingPolicy(
        int policyId,
        [FromQuery] string? reason,
        CancellationToken cancellationToken)
    {
        try
        {
            await _aiUsageCostService.DeactivatePricingPolicyAsync(
                policyId,
                GetCurrentUserId(),
                reason,
                cancellationToken);

            return Ok(new
            {
                success = true,
                message = "AI model pricing policy was deactivated."
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

    private int? GetCurrentUserId()
    {
        var userIdText =
            User.FindFirstValue("userId") ??
            User.FindFirstValue(ClaimTypes.NameIdentifier) ??
            User.FindFirstValue("sub") ??
            User.FindFirstValue("UserId");

        return int.TryParse(userIdText, out var userId)
            ? userId
            : null;
    }
}
