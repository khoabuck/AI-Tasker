using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using AITasker.Application.Interfaces;
using AITasker.Application.DTOs.Requests;
using AITasker.Infrastructure.Data;
using AITasker.Domain.Entities;

namespace AITasker.Infrastructure.Projects
{
    public class ProjectService : IProjectService
    {
        private readonly AITaskerDbContext _context;

        public ProjectService(AITaskerDbContext context)
        {
            _context = context;
        }

        public async Task<bool> InitializeProjectWithMilestonesAsync(int contractId, List<CreateMilestoneRequest> requests)
        {
            var contract = await _context.ProjectContracts.FirstOrDefaultAsync(c => c.ContractId == contractId);
            if (contract == null || contract.Status != "CONFIRMED")
                throw new InvalidOperationException("Project generation requires a successfully signed and confirmed baseline contract.");

            // Ensure the client has already secured funding via Escrow balances before initializing
            var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == contract.ClientId);
            if (wallet == null || wallet.LockedBalance < contract.TotalClientPayment)
                throw new InvalidOperationException("Initialization aborted: Client milestone funds have not been locked inside the Escrow wallet system.");

            var project = new Project
            {
                ContractId = contractId,
                Title = $"Project via Contract Reference #{contractId}",
                Description = contract.ProjectScope,
                TotalBudget = contract.FinalPrice,
                Status = "ACTIVE",
                StartDate = DateTime.UtcNow,
                EndDate = DateTime.UtcNow.AddDays(contract.FinalTimelineDays)
            };

            _context.Projects.Add(project);
            await _context.SaveChangesAsync(); // Generates tracking PK

            foreach (var r in requests)
            {
                var milestone = new Milestone
                {
                    ProjectId = project.ProjectId,
                    Title = r.Title,
                    Description = r.Description,
                    Amount = r.Amount,
                    Deadline = r.Deadline,
                    Status = "LOCKED"
                };
                _context.Milestones.Add(milestone);
            }

            contract.Status = "ACTIVE";
            await _context.SaveChangesAsync();
            return true;
        }
    }
}