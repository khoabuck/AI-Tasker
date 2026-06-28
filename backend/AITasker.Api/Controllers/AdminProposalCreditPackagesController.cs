using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/admin/proposal-credit-packages")]
[Authorize(Roles = "ADMIN")]
public class AdminProposalCreditPackagesController : ControllerBase
{
    private readonly IProposalCreditPackageService _proposalCreditPackageService;

    public AdminProposalCreditPackagesController(
        IProposalCreditPackageService proposalCreditPackageService)
    {
        _proposalCreditPackageService = proposalCreditPackageService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllPackages()
    {
        var packages = await _proposalCreditPackageService.GetAdminPackagesAsync();
        return Ok(packages);
    }

    [HttpGet("{packageId:int}")]
    public async Task<IActionResult> GetPackageById(int packageId)
    {
        var package = await _proposalCreditPackageService.GetPackageByIdAsync(packageId);

        if (package == null)
        {
            return NotFound(new { message = "Proposal credit package not found." });
        }

        return Ok(package);
    }

    [HttpPost]
    public async Task<IActionResult> CreatePackage(
        [FromBody] CreateProposalCreditPackageRequest request)
    {
        try
        {
            var adminId = GetCurrentAdminId();
            var package = await _proposalCreditPackageService.CreatePackageAsync(
                adminId,
                request);

            return Ok(package);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{packageId:int}")]
    public async Task<IActionResult> UpdatePackage(
        int packageId,
        [FromBody] UpdateProposalCreditPackageRequest request)
    {
        try
        {
            var adminId = GetCurrentAdminId();
            var package = await _proposalCreditPackageService.UpdatePackageAsync(
                adminId,
                packageId,
                request);

            if (package == null)
            {
                return NotFound(new { message = "Proposal credit package not found." });
            }

            return Ok(package);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("{packageId:int}/activate")]
    public async Task<IActionResult> ActivatePackage(
        int packageId,
        [FromBody] AdminProposalCreditPackageStatusRequest request)
    {
        return await SetPackageActive(packageId, true, request.Reason);
    }

    [HttpPatch("{packageId:int}/deactivate")]
    public async Task<IActionResult> DeactivatePackage(
        int packageId,
        [FromBody] AdminProposalCreditPackageStatusRequest request)
    {
        return await SetPackageActive(packageId, false, request.Reason);
    }

    private async Task<IActionResult> SetPackageActive(
        int packageId,
        bool isActive,
        string? reason)
    {
        try
        {
            var adminId = GetCurrentAdminId();
            var package = await _proposalCreditPackageService.SetPackageActiveAsync(
                adminId,
                packageId,
                isActive,
                reason);

            if (package == null)
            {
                return NotFound(new { message = "Proposal credit package not found." });
            }

            return Ok(package);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
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

public class AdminProposalCreditPackageStatusRequest
{
    public string? Reason { get; set; }
}