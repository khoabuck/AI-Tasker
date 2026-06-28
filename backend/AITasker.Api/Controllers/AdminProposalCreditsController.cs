using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/admin/proposal-credits")]
[Authorize(Roles = "ADMIN")]
public class AdminProposalCreditsController : ControllerBase
{
    private readonly IAdminProposalCreditService _adminProposalCreditService;

    public AdminProposalCreditsController(
        IAdminProposalCreditService adminProposalCreditService)
    {
        _adminProposalCreditService = adminProposalCreditService;
    }

    [HttpGet("experts")]
    public async Task<IActionResult> GetExpertCredits(
        [FromQuery] string? search,
        [FromQuery] string? profileReviewStatus,
        [FromQuery] bool? availableForWork)
    {
        var result = await _adminProposalCreditService.GetExpertCreditsAsync(
            search,
            profileReviewStatus,
            availableForWork);

        return Ok(result);
    }

    [HttpGet("experts/{expertProfileId:int}")]
    public async Task<IActionResult> GetExpertCreditById(int expertProfileId)
    {
        var result = await _adminProposalCreditService.GetExpertCreditByIdAsync(
            expertProfileId);

        if (result == null)
        {
            return NotFound(new
            {
                message = "Expert profile not found."
            });
        }

        return Ok(result);
    }

    [HttpPatch("experts/{expertProfileId:int}/credits")]
    public async Task<IActionResult> AdjustCredits(
        int expertProfileId,
        [FromBody] AdminAdjustProposalCreditsRequest request)
    {
        try
        {
            var adminId = GetCurrentAdminId();

            var result = await _adminProposalCreditService.AdjustCreditsAsync(
                adminId,
                expertProfileId,
                request);

            if (result == null)
            {
                return NotFound(new
                {
                    message = "Expert profile not found."
                });
            }

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }

    [HttpPatch("experts/{expertProfileId:int}/free-submit")]
    public async Task<IActionResult> SetFreeProposalSubmit(
        int expertProfileId,
        [FromBody] AdminSetFreeProposalSubmitRequest request)
    {
        try
        {
            var adminId = GetCurrentAdminId();

            var result = await _adminProposalCreditService.SetFreeProposalSubmitAsync(
                adminId,
                expertProfileId,
                request);

            if (result == null)
            {
                return NotFound(new
                {
                    message = "Expert profile not found."
                });
            }

            return Ok(result);
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