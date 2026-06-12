using System;
using System.Collections.Generic;
using System.Linq;
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
            if (requests == null || !requests.Any())
            {
                throw new InvalidOperationException("Initialization aborted: At least one milestone is required to start a project.");
            }

            foreach (var r in requests)
            {
                if (string.IsNullOrWhiteSpace(r.Title))
                {
                    throw new InvalidOperationException("Milestone validation failed: Title cannot be left blank.");
                }

                if (r.Amount <= 0)
                {
                    throw new InvalidOperationException($"Milestone validation failed: Amount for '{r.Title}' must be greater than 0.");
                }
            }

            var contract = await _context.ProjectContracts.FirstOrDefaultAsync(c => c.ContractId == contractId);
            if (contract == null || contract.Status != "CONFIRMED")
            {
                throw new InvalidOperationException("Project generation requires a successfully signed and confirmed baseline contract.");
            }

            var projectExists = await _context.Projects.AnyAsync(p => p.ContractId == contractId);
            if (projectExists)
            {
                throw new InvalidOperationException($"A project has already been initialized for Contract Reference #{contractId}.");
            }

            var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == contract.ClientId);
            if (wallet == null || wallet.LockedBalance < contract.TotalClientPayment)
            {
                throw new InvalidOperationException("Initialization aborted: Client milestone funds have not been locked inside the Escrow wallet system.");
            }

            decimal totalMilestonesAmount = requests.Sum(r => r.Amount);
            if (totalMilestonesAmount != contract.FinalPrice)
            {
                throw new InvalidOperationException($"Budget mismatch: The sum of milestone amounts (${totalMilestonesAmount}) must exactly equal the contract final price (${contract.FinalPrice}).");
            }

            using var dbTransaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var project = new Project
                {
                    ContractId = contractId,
                    Title = $"Project via Contract Reference #{contractId}",
                    Description = contract.ProjectScope,
                    TotalBudget = contract.FinalPrice,
                    Status = "ACTIVE",
                    StartDate = DateTime.UtcNow,
                    EndDate = DateTime.UtcNow.AddDays(contract.FinalTimelineDays),
                    CreatedAt = DateTime.UtcNow
                };

                _context.Projects.Add(project);
                await _context.SaveChangesAsync();

                foreach (var r in requests)
                {
                    var milestone = new Milestone
                    {
                        ProjectId = project.ProjectId,
                        Title = r.Title,
                        Description = r.Description,
                        Amount = r.Amount,
                        Deadline = r.Deadline,
                        Status = "LOCKED",
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.Milestones.Add(milestone);
                }

                contract.Status = "ACTIVE";
                
                var affectedRows = await _context.SaveChangesAsync();
                await dbTransaction.CommitAsync();

                return affectedRows > 0;
            }
            catch (Exception)
            {
                await dbTransaction.RollbackAsync();
                throw;
            }
        }
    }
}