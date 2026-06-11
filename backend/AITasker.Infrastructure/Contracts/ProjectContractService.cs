using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using AITasker.Application.Interfaces;
using AITasker.Application.DTOs.Requests;
using AITasker.Infrastructure.Data;
using AITasker.Domain.Entities;

namespace AITasker.Infrastructure.Contracts
{
    public class ProjectContractService : IProjectContractService
    {
        private readonly AITaskerDbContext _context;

        public ProjectContractService(AITaskerDbContext context)
        {
            _context = context;
        }

        public async Task<bool> CreateDraftContractAsync(CreateContractRequest request)
        {
            var proposal = await _context.Proposals.FirstOrDefaultAsync(p => p.ProposalId == request.ProposalId);
            if (proposal == null || proposal.Status != "ACCEPTED")
                throw new InvalidOperationException("A contract can only be drafted from an ACCEPTED proposal.");

            var job = await _context.JobPostings.FirstOrDefaultAsync(j => j.JobPostingId == proposal.JobId);
            if (job == null)
                throw new InvalidOperationException("Reference job metadata is unavailable.");

            // ─── BUSINESS CALCULATION ───
            var clientProfile = await _context.ClientProfiles.FirstOrDefaultAsync(c => c.ClientProfileId == job.ClientProfileId);
            decimal rate = (clientProfile?.ClientType == "BUSINESS") ? 10.00m : 5.00m;

            decimal feeAmount = request.FinalPrice * (rate / 100m);
            decimal totalPayment = request.FinalPrice + feeAmount;

            // ─── EXECUTION ───
            var contract = new ProjectContract
            {
                ProposalId = request.ProposalId,
                ClientId = job.ClientProfileId,
                ExpertId = proposal.ExpertId,
                ProjectScope = request.ProjectScope,
                FinalPrice = request.FinalPrice,
                PlatformFeeRate = rate,
                PlatformFeeAmount = feeAmount,
                TotalClientPayment = totalPayment,
                FinalTimelineDays = request.FinalTimelineDays,
                Deliverables = request.Deliverables,
                AcceptanceCriteria = request.AcceptanceCriteria,
                RevisionLimit = request.RevisionLimit,
                PaymentTerms = request.PaymentTerms,
                ContractSource = "PROPOSAL",
                Status = "DRAFT",
                CreatedAt = DateTime.UtcNow
            };

            _context.ProjectContracts.Add(contract);
            var affectedRows = await _context.SaveChangesAsync();
            return affectedRows > 0;
        }

        public async Task<bool> ConfirmContractAsync(int contractId, int userId, string userRole)
        {
            var contract = await _context.ProjectContracts.FirstOrDefaultAsync(c => c.ContractId == contractId);
            if (contract == null)
                throw new InvalidOperationException("Contract was not found.");

            if (contract.Status != "DRAFT")
                throw new InvalidOperationException("This contract cannot be modified as it is no longer in DRAFT status.");

            // ─── SIGNING LOGIC ───
            if (userRole.ToUpper() == "CLIENT" && contract.ClientId == userId) 
                contract.ClientConfirmed = true;
            else if (userRole.ToUpper() == "EXPERT" && contract.ExpertId == userId) 
                contract.ExpertConfirmed = true;
            else 
                throw new UnauthorizedAccessException("User identification context mismatch against contract signees.");

            if (contract.ClientConfirmed && contract.ExpertConfirmed)
            {
                contract.Status = "CONFIRMED";
                contract.ConfirmedAt = DateTime.UtcNow;
            }

            var affectedRows = await _context.SaveChangesAsync();
            return affectedRows > 0;
        }
    }
}