using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

        [HttpPost]
        public async Task<IActionResult> OpenDispute([FromBody] OpenDisputeDto dto)
        {
            var dispute = new Dispute
            {
                ProjectId = dto.ProjectId,
                MilestoneId = dto.MilestoneId,
                OpenedByUserId = dto.OpenedByUserId,
                RespondentUserId = dto.RespondentUserId,
                DisputedAmount = dto.DisputedAmount,
                Reason = dto.Reason,
                Status = "OPEN"
            };

            _context.Disputes.Add(dispute);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Dispute opened successfully. Escrow funds have been locked temporarily!", disputeId = dispute.Id });
        }
    }

    public class OpenDisputeDto
    {
        public int ProjectId { get; set; }
        public int? MilestoneId { get; set; }
        public int OpenedByUserId { get; set; }
        public int RespondentUserId { get; set; }
        public decimal DisputedAmount { get; set; }
        public string Reason { get; set; } = string.Empty;
    }
}