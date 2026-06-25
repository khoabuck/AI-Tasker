using System.Security.Claims;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/job-credit-packages")]
public class JobCreditPackagesController : ControllerBase
{
    private readonly IJobCreditPackageService _jobCreditPackageService;

    public JobCreditPackagesController(IJobCreditPackageService jobCreditPackageService)
    {
        _jobCreditPackageService = jobCreditPackageService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetActivePackages()
    {
        var packages = await _jobCreditPackageService.GetActivePackagesAsync();
        return Ok(packages);
    }

    [HttpPost("{packageId:int}/purchase")]
    [Authorize(Roles = "CLIENT")]
    public async Task<IActionResult> PurchasePackage(int packageId)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _jobCreditPackageService.PurchasePackageAsync(
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
    [Authorize(Roles = "CLIENT")]
    public async Task<IActionResult> GetMyPurchases()
    {
        try
        {
            var userId = GetCurrentUserId();
            var purchases = await _jobCreditPackageService.GetMyPurchasesAsync(userId);

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
