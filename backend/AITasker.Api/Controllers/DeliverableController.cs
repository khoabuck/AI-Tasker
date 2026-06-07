using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Api.Controllers
{
    [Authorize] 
    [ApiController]
    [Route("api/deliverables")]
    public class DeliverableController : ControllerBase
    {
        private readonly AITaskerDbContext _context;
        private readonly IWalletService _walletService;

        public DeliverableController(AITaskerDbContext context, IWalletService walletService)
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
        public async Task<IActionResult> SubmitDeliverable([FromBody] Deliverable model)
        {
            try
            {
                int expertId = GetCurrentUserId();
                if (string.IsNullOrWhiteSpace(model.ProjectId) || string.IsNullOrWhiteSpace(model.FileUrl))
                {
                    return BadRequest(new { message = "ProjectId and FileUrl are strictly required." });
                }

                var latestVersion = await _context.Deliverables
                    .Where(d => d.ProjectId == model.ProjectId)
                    .OrderByDescending(d => d.Version)
                    .Select(d => d.Version)
                    .FirstOrDefaultAsync();

                var deliverable = new Deliverable
                {
                    ProjectId = model.ProjectId,
                    ExpertId = expertId,
                    Version = latestVersion == 0 ? 1 : latestVersion + 1,
                    FileUrl = model.FileUrl,
                    Description = model.Description,
                    Status = "PENDING",
                    SubmittedAt = DateTime.UtcNow
                };

                _context.Deliverables.Add(deliverable);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Deliverable submitted successfully.", data = deliverable });
            }
            catch (Exception ex) {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}/approve")]
        public async Task<IActionResult> ApproveDeliverable(int id, [FromQuery] int expertId)
        {
            using var dbTransaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var deliverable = await _context.Deliverables.FindAsync(id);
                if (deliverable == null) return NotFound(new { message = "Deliverable not found." });
                if (deliverable.Status == "APPROVED") return BadRequest(new { message = "Deliverable was already approved." });

                deliverable.Status = "APPROVED";
                await _context.SaveChangesAsync();

                var releaseSuccess = await _walletService.ReleaseEscrowAsync(deliverable.ProjectId, expertId);
                if (!releaseSuccess)
                {
                    await dbTransaction.RollbackAsync();
                    return BadRequest(new { message = "Failed to automatically release escrow funds for this deliverable." });
                }

                await dbTransaction.CommitAsync();
                return Ok(new { success = true, message = "Deliverable approved and funds successfully released to the Expert." });
            }
            catch (Exception ex) {
                await dbTransaction.RollbackAsync();
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}/revision")]
        public async Task<IActionResult> RequestRevision(int id, [FromBody] string feedback)
        {
            try
            {
                var deliverable = await _context.Deliverables.FindAsync(id);
                if (deliverable == null) return NotFound(new { message = "Deliverable not found." });

                deliverable.Status = "REVISION_REQUESTED";
                deliverable.Description += $" | [Revision Feedback]: {feedback}";
                
                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = "Revision requested successfully. Waiting for Expert to re-submit." });
            }
            catch (Exception ex) {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}