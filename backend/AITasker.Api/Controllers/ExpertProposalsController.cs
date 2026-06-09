using System.Security.Claims;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/experts/me/proposals")]
[Authorize(Roles = "EXPERT")]
public class ExpertProposalsController : ControllerBase
{
    private readonly IProposalService _proposalService;

    public ExpertProposalsController(IProposalService proposalService)
    {
        _proposalService = proposalService;
    }

    [HttpGet]
    public async Task<IActionResult> GetMine()
    {
        try
        {
            var data = await _proposalService.GetMineAsync(GetCurrentUserId());
            return Ok(new { success = true, data });
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
