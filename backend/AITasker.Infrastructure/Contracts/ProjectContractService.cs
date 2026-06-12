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

        public ProjectContractService(
            AITaskerDbContext context)
        {
            _context = context;
        }

        public async Task<bool> CreateDraftContractAsync(
            CreateContractRequest request)
        {
            ValidateCreateRequest(request);

            var proposal = await _context.Proposals
                .FirstOrDefaultAsync(
                    p => p.ProposalId == request.ProposalId);

            if (proposal == null)
            {
                throw new InvalidOperationException(
                    "Proposal not found.");
            }

            if (proposal.Status != "ACCEPTED")
            {
                throw new InvalidOperationException(
                    "Only ACCEPTED proposals can create contracts.");
            }

            var existingContract =
                await _context.ProjectContracts
                    .AnyAsync(
                        c => c.ProposalId == request.ProposalId);

            if (existingContract)
            {
                throw new InvalidOperationException(
                    "Contract already exists for this proposal.");
            }

            var job = await _context.JobPostings
                .FirstOrDefaultAsync(
                    j => j.JobPostingId == proposal.JobId);

            if (job == null)
            {
                throw new InvalidOperationException(
                    "Job posting not found.");
            }

            var clientProfile = await _context.ClientProfiles
                .FirstOrDefaultAsync(
                    c => c.ClientProfileId == job.ClientProfileId);

            decimal rate = 5m;

            if (clientProfile != null
                && clientProfile.ClientType == "BUSINESS")
            {
                rate = 10m;
            }

            decimal feeAmount =
                request.FinalPrice * rate / 100m;

            decimal totalPayment =
                request.FinalPrice + feeAmount;

            var contract = new ProjectContract
            {
                ProposalId = proposal.ProposalId,
                ClientId = job.ClientProfileId,
                ExpertId = proposal.ExpertId,

                ProjectScope = request.ProjectScope,

                FinalPrice = request.FinalPrice,

                PlatformFeeRate = rate,

                PlatformFeeAmount = feeAmount,

                TotalClientPayment = totalPayment,

                FinalTimelineDays =
                    request.FinalTimelineDays,

                Deliverables =
                    request.Deliverables,

                AcceptanceCriteria =
                    request.AcceptanceCriteria,

                RevisionLimit =
                    request.RevisionLimit,

                PaymentTerms =
                    request.PaymentTerms,

                ContractSource = "PROPOSAL",

                Status = "DRAFT",

                CreatedAt = DateTime.UtcNow
            };

            _context.ProjectContracts.Add(contract);

            var affectedRows =
                await _context.SaveChangesAsync();

            return affectedRows > 0;
        }

        public async Task<bool> ConfirmContractAsync(
            int contractId,
            int userId,
            string userRole)
        {
            var contract =
                await _context.ProjectContracts
                    .FirstOrDefaultAsync(
                        c => c.ContractId == contractId);

            if (contract == null)
            {
                throw new InvalidOperationException(
                    "Contract not found.");
            }

            if (contract.Status != "DRAFT")
            {
                throw new InvalidOperationException(
                    "Contract is no longer editable.");
            }

            userRole = userRole.ToUpper();

            if (userRole == "CLIENT")
            {
                contract.ClientConfirmed = true;
            }
            else if (userRole == "EXPERT")
            {
                contract.ExpertConfirmed = true;
            }
            else
            {
                throw new UnauthorizedAccessException(
                    "Invalid role.");
            }

            if (contract.ClientConfirmed
                && contract.ExpertConfirmed)
            {
                contract.Status = "CONFIRMED";
                contract.ConfirmedAt = DateTime.UtcNow;
            }

            var affectedRows =
                await _context.SaveChangesAsync();

            return affectedRows > 0;
        }

        private static void ValidateCreateRequest(
            CreateContractRequest request)
        {
            if (request.ProposalId <= 0)
            {
                throw new InvalidOperationException(
                    "ProposalId is required.");
            }

            if (string.IsNullOrWhiteSpace(
                    request.ProjectScope))
            {
                throw new InvalidOperationException(
                    "Project scope is required.");
            }

            if (request.FinalPrice <= 0)
            {
                throw new InvalidOperationException(
                    "Final price must be greater than 0.");
            }

            if (request.FinalTimelineDays <= 0)
            {
                throw new InvalidOperationException(
                    "Timeline must be greater than 0.");
            }

            if (string.IsNullOrWhiteSpace(
                    request.Deliverables))
            {
                throw new InvalidOperationException(
                    "Deliverables are required.");
            }

            if (string.IsNullOrWhiteSpace(
                    request.AcceptanceCriteria))
            {
                throw new InvalidOperationException(
                    "Acceptance criteria are required.");
            }

            if (request.RevisionLimit < 0)
            {
                throw new InvalidOperationException(
                    "Revision limit cannot be negative.");
            }

            if (string.IsNullOrWhiteSpace(
                    request.PaymentTerms))
            {
                throw new InvalidOperationException(
                    "Payment terms are required.");
            }
        }
    }
}