using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace AITasker.Infrastructure.Deliverables
{
    public class DeliverableService : IDeliverableService
    {
        private readonly AITaskerDbContext _context;

        public DeliverableService(AITaskerDbContext context)
        {
            _context = context;
        }

        public async Task<Deliverable?> SubmitDeliverableAsync(int milestoneId, int expertId, string description, string? fileUrl, string? demoUrl, string? testResultUrl)
        {
            try
            {
                int latestVersion = await _context.Deliverables
                    .Where(d => d.MilestoneId == milestoneId)
                    .Select(d => d.VersionNumber)
                    .DefaultIfEmpty(0)
                    .MaxAsync();

                var deliverable = new Deliverable
                {
                    MilestoneId = milestoneId,
                    ExpertId = expertId,
                    VersionNumber = latestVersion + 1,
                    Description = description,
                    FileUrl = fileUrl,
                    DemoUrl = demoUrl,
                    TestResultUrl = testResultUrl,
                    Status = "SUBMITTED",
                    SubmittedAt = DateTime.UtcNow
                };

                _context.Deliverables.Add(deliverable);
                await _context.SaveChangesAsync();

                return deliverable;
            }
            catch (Exception)
            {
                return null;
            }
        }
    }
}