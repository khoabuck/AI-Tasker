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

        public async Task<bool> InitializeProjectWithMilestonesAsync(
            int currentUserId,
            int contractId,
            List<CreateMilestoneRequest> requests)
        {
            if (requests == null || !requests.Any())
                throw new InvalidOperationException("Initialization aborted: At least one milestone is required.");

            foreach (var r in requests)
            {
                if (string.IsNullOrWhiteSpace(r.Title))
                    throw new InvalidOperationException("Milestone title cannot be blank.");

                if (r.Amount <= 0)
                    throw new InvalidOperationException($"Milestone amount for '{r.Title}' must be greater than 0.");
            }

            var contract = await _context.ProjectContracts
                .FirstOrDefaultAsync(c => c.ContractId == contractId);

            if (contract == null || contract.Status != "CONFIRMED")
                throw new InvalidOperationException("Project generation requires a confirmed contract.");

            var clientProfile = await _context.ClientProfiles
                .FirstOrDefaultAsync(c =>
                    c.ClientProfileId == contract.ClientId &&
                    c.UserId == currentUserId);

            if (clientProfile == null)
                throw new InvalidOperationException("Only the contract client can initialize this project.");

            var projectExists = await _context.Projects
                .AnyAsync(p => p.ContractId == contractId);

            if (projectExists)
                throw new InvalidOperationException("Project already exists for this contract.");

            var wallet = await _context.Wallets
                .FirstOrDefaultAsync(w => w.UserId == clientProfile.UserId);

            if (wallet == null || wallet.LockedBalance < contract.TotalClientPayment)
                throw new InvalidOperationException("Client milestone funds have not been locked in escrow.");

            var totalMilestonesAmount = requests.Sum(r => r.Amount);

            if (totalMilestonesAmount != contract.FinalPrice)
                throw new InvalidOperationException(
                    $"Budget mismatch: milestone total ({totalMilestonesAmount}) must equal contract final price ({contract.FinalPrice})."
                );

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
            catch
            {
                await dbTransaction.RollbackAsync();
                throw;
            }
        }
    }
}