using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/admin/business-verifications")]
[Authorize(Roles = "ADMIN")]
public class AdminBusinessVerificationsController : ControllerBase
{
    private readonly IBusinessVerificationService _businessVerificationService;

    public AdminBusinessVerificationsController(
        IBusinessVerificationService businessVerificationService)
    {
        _businessVerificationService = businessVerificationService;
    }

    [HttpGet("pending")]
    public async Task<IActionResult> GetPending()
    {
        var result = await _businessVerificationService.GetPendingAsync();

        return Ok(result);
    }

    [HttpPost("{businessProfileId:int}/approve")]
    public async Task<IActionResult> Approve(int businessProfileId)
    {
        try
        {
            var result = await _businessVerificationService.ApproveAsync(
                businessProfileId
            );

            return Ok(result);
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

    [HttpPost("{businessProfileId:int}/reject")]
    public async Task<IActionResult> Reject(
        int businessProfileId,
        RejectBusinessVerificationRequest request)
    {
        try
        {
            var result = await _businessVerificationService.RejectAsync(
                businessProfileId,
                request
            );

            return Ok(result);
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
}