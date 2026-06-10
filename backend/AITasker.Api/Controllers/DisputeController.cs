using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace AITasker.Api.Controllers
{
    [ApiController]
    [Route("api/disputes")]
    [Authorize]
    public class DisputesController : ControllerBase
    {
        private readonly AITaskerDbContext _context;

        public DisputesController(AITaskerDbContext context)
        {
            _context = context;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
            {
                throw new InvalidOperationException("Unauthorized or invalid user token structure.");
            }
            return userId;
        }

        [HttpPost]
        public async Task<IActionResult> OpenDispute([FromBody] OpenDisputeDto dto)
        {
            try
            {
                int currentUserId = GetCurrentUserId();

                var dispute = new Dispute
                {
                    ProjectId = dto.ProjectId,
                    MilestoneId = dto.MilestoneId,
                    OpenedByUserId = currentUserId,
                    RespondentUserId = dto.RespondentUserId,
                    DisputedAmount = dto.DisputedAmount,
                    Reason = dto.Reason,
                    Status = "OPEN"
                };

                _context.Disputes.Add(dispute);

                if (dto.MilestoneId.HasValue)
                {
                    string refMilestoneId = dto.MilestoneId.Value.ToString();

                    var holdTxn = await _context.Transactions
                        .FirstOrDefaultAsync(t => t.ReferenceId == refMilestoneId && t.Type == "EscrowHold");

                    if (holdTxn != null)
                    {
                        holdTxn.Type = "EscrowFrozen";
                        holdTxn.Description += $" | [FROZEN] Due to Dispute Open at {DateTime.UtcNow}";
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(new { message = "Dispute opened successfully. Escrow funds have been strictly FROZEN temporarily!", disputeId = dispute.Id });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public class OpenDisputeDto
    {
        public int ProjectId { get; set; }
        public int? MilestoneId { get; set; }
        public int RespondentUserId { get; set; }
        public decimal DisputedAmount { get; set; }
        public string Reason { get; set; } = string.Empty;
    }
}