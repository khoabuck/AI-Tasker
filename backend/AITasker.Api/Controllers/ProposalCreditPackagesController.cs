using System.Security.Claims;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/proposal-credit-packages")]
public class ProposalCreditPackagesController : ControllerBase
{
    private readonly IProposalCreditPackageService _proposalCreditPackageService;

    public ProposalCreditPackagesController(
        IProposalCreditPackageService proposalCreditPackageService)
    {
        _proposalCreditPackageService = proposalCreditPackageService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetActivePackages()
    {
        var packages = await _proposalCreditPackageService.GetActivePackagesAsync();
        return Ok(packages);
    }

    [HttpGet("me")]
    [Authorize(Roles = "EXPERT")]
    public async Task<IActionResult> GetMyCreditPage()
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _proposalCreditPackageService.GetMyCreditPageAsync(userId);

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{packageId:int}/purchase")]
    [Authorize(Roles = "EXPERT")]
    public async Task<IActionResult> PurchasePackage(int packageId)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _proposalCreditPackageService.PurchasePackageAsync(
                userId,
                packageId);

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("my-purchases")]
    [Authorize(Roles = "EXPERT")]
    public async Task<IActionResult> GetMyPurchases()
    {
        try
        {
            var userId = GetCurrentUserId();
            var purchases = await _proposalCreditPackageService.GetMyPurchasesAsync(userId);

            return Ok(purchases);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
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
            throw new InvalidOperationException("UserId not found in token.");
        }

        return userId;
    }
}