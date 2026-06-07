using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using AITasker.Application.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/disputes")]
    public class DisputeController : ControllerBase
    {
        private readonly AITaskerDbContext _context;
        private readonly IWalletService _walletService;

        public DisputeController(AITaskerDbContext context, IWalletService walletService)
        {
            _context = context;
            _walletService = walletService;
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
        public async Task<IActionResult> OpenDispute([FromBody] Dispute model)
        {
            try
            {
                int userId = GetCurrentUserId();
                if (string.IsNullOrWhiteSpace(model.ProjectId) || string.IsNullOrWhiteSpace(model.Reason))
                {
                    return BadRequest(new { message = "ProjectId and Reason are required." });
                }

                var dispute = new Dispute
                {
                    ProjectId = model.ProjectId,
                    OpenedByUserId = userId,
                    Reason = model.Reason,
                    EvidenceUrl = model.EvidenceUrl,
                    Status = "OPEN",
                    OpenedAt = DateTime.UtcNow
                };

                _context.Disputes.Add(dispute);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Dispute opened. Escrow funds are strictly frozen.", data = dispute });
            }
            catch (Exception ex) {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/evidence")]
        public async Task<IActionResult> SubmitEvidence(int id, [FromBody] string evidenceUrl)
        {
            try
            {
                var dispute = await _context.Disputes.FindAsync(id);
                if (dispute == null) return NotFound(new { message = "Dispute case not found." });
                if (dispute.Status == "RESOLVED") return BadRequest(new { message = "Cannot attach evidence to a resolved dispute." });

                dispute.EvidenceUrl += $" | New Evidence: {evidenceUrl}";
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "New case evidence attached successfully." });
            }
            catch (Exception ex) {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize(Roles = "ADMIN")]
        [HttpPut("{id}/resolve")]
        public async Task<IActionResult> ResolveDispute(int id, [FromQuery] decimal refundClientAmount, [FromQuery] decimal releaseExpertAmount, [FromQuery] int clientId, [FromQuery] int expertId)
        {
            using var dbTransaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var dispute = await _context.Disputes.FindAsync(id);
                if (dispute == null) return NotFound(new { message = "Dispute case not found." });
                if (dispute.Status == "RESOLVED") return BadRequest(new { message = "Dispute has already been resolved." });

                if (refundClientAmount > 0)
                {
                    await _walletService.DepositAsync(clientId, refundClientAmount, $"[Dispute Resolve Refund] Project ID {dispute.ProjectId}", dispute.ProjectId);
                }

                if (releaseExpertAmount > 0)
                {
                    await _walletService.DepositAsync(expertId, releaseExpertAmount, $"[Dispute Resolve Release] Project ID {dispute.ProjectId}", dispute.ProjectId);
                }

                dispute.Status = "RESOLVED";
                dispute.ResolvedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                await dbTransaction.CommitAsync();
                return Ok(new { success = true, message = $"Dispute ID {id} has been resolved by Admin. Funds distributed successfully." });
            }
            catch (Exception ex) {
                await dbTransaction.RollbackAsync();
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}