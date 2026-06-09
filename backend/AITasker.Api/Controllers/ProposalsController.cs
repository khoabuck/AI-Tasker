using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Authorize]
public class ProposalsController : ControllerBase
{
    private readonly IProposalService _proposalService;

    public ProposalsController(IProposalService proposalService)
    {
        _proposalService = proposalService;
    }

    [HttpPost("api/jobs/{jobId:int}/proposals")]
    [Authorize(Roles = "EXPERT")]
    public async Task<IActionResult> Submit(int jobId, [FromBody] CreateProposalRequest request)
    {
        try
        {
            var data = await _proposalService.SubmitAsync(GetCurrentUserId(), jobId, request);
            return Ok(new { success = true, message = "Proposal submitted.", data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("api/jobs/{jobId:int}/proposals")]
    [Authorize(Roles = "CLIENT")]
    public async Task<IActionResult> ListForJob(int jobId)
    {
        try
        {
            var data = await _proposalService.GetForJobAsync(GetCurrentUserId(), jobId);
            return Ok(new { success = true, data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("api/proposals/{proposalId:int}")]
    public async Task<IActionResult> GetById(int proposalId)
    {
        try
        {
            var data = await _proposalService.GetByIdAsync(GetCurrentUserId(), proposalId);
            return Ok(new { success = true, data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("api/proposals/{proposalId:int}/counter-offer")]
    [Authorize(Roles = "CLIENT")]
    public async Task<IActionResult> CounterOffer(int proposalId, [FromBody] CounterOfferRequest request)
    {
        try
        {
            var data = await _proposalService.CounterOfferAsync(GetCurrentUserId(), proposalId, request);
            return Ok(new { success = true, message = "Counter offer sent.", data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("api/proposals/{proposalId:int}/accept")]
    [Authorize(Roles = "CLIENT")]
    public async Task<IActionResult> Accept(int proposalId)
    {
        try
        {
            var data = await _proposalService.AcceptAsync(GetCurrentUserId(), proposalId);
            return Ok(new { success = true, message = "Proposal accepted.", data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("api/proposals/{proposalId:int}/reject")]
    [Authorize(Roles = "CLIENT")]
    public async Task<IActionResult> Reject(int proposalId)
    {
        try
        {
            var data = await _proposalService.RejectAsync(GetCurrentUserId(), proposalId);
            return Ok(new { success = true, message = "Proposal rejected.", data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("api/proposals/{proposalId:int}/withdraw")]
    [Authorize(Roles = "EXPERT")]
    public async Task<IActionResult> Withdraw(int proposalId)
    {
        try
        {
            var data = await _proposalService.WithdrawAsync(GetCurrentUserId(), proposalId);
            return Ok(new { success = true, message = "Proposal withdrawn.", data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    private int GetCurrentUserId()
    {
        var userIdValue =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("userId")
            ?? User.FindFirstValue("sub");

        if (!int.TryParse(userIdValue, out var userId))
        {
            throw new InvalidOperationException("Invalid user token.");
        }

        return userId;
    }
}
