using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using AITasker.Application.Interfaces;
using AITasker.Application.DTOs.Requests;
using AITasker.Infrastructure.Data;
using AITasker.Domain.Entities;

namespace AITasker.Infrastructure.Proposals
{
    public class ProposalService : IProposalService
    {
        private readonly AITaskerDbContext _context;

        public ProposalService(AITaskerDbContext context)
        {
            _context = context;
        }

        public async Task<bool> SubmitProposalAsync(int expertId, SubmitProposalRequest request)
        {
            if (request.ProposedPrice <= 0)
                throw new ArgumentException("Proposed price must be greater than 0.");

            var job = await _context.JobPostings.FirstOrDefaultAsync(j => j.JobPostingId == request.JobId);
            if (job == null || job.Status != "OPEN")
                throw new InvalidOperationException("The target job posting is not open for submission.");

            if (job.ClientProfileId == expertId)
                throw new InvalidOperationException("Experts cannot submit proposals to their own posted jobs.");

            var proposal = new Proposal
            {
                JobId = request.JobId,
                ExpertId = expertId,
                CoverLetter = request.CoverLetter,
                ProposedPrice = request.ProposedPrice,
                ProposedTimelineDays = request.ProposedTimelineDays,
                ExpectedOutputs = request.ExpectedOutputs,
                WorkingApproach = request.WorkingApproach,
                PreliminaryMilestonePlan = request.PreliminaryMilestonePlan,
                Status = "SUBMITTED"
            };

            _context.Proposals.Add(proposal);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> CounterOfferAsync(int proposalId, CounterOfferRequest request)
        {
            if (request.CounterPrice <= 0)
                throw new ArgumentException("Counter price offer must be greater than 0.");

            var proposal = await _context.Proposals.FirstOrDefaultAsync(p => p.ProposalId == proposalId);
            if (proposal == null)
                throw new InvalidOperationException("Target proposal does not exist.");

            proposal.CounterPrice = request.CounterPrice;
            proposal.CounterTimelineDays = request.CounterTimelineDays;
            proposal.CounterMessage = request.CounterMessage;
            proposal.Status = "COUNTER_OFFER";

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ProcessProposalStatusAsync(int proposalId, string decision)
        {
            var proposal = await _context.Proposals.FirstOrDefaultAsync(p => p.ProposalId == proposalId);
            if (proposal == null)
                throw new InvalidOperationException("Target proposal does not exist.");

            proposal.Status = decision == "ACCEPT" ? "ACCEPTED" : "REJECTED";
            await _context.SaveChangesAsync();
            return true;
        }
    }
}