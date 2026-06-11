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
            // ─── VALIDATION ───
            if (request.ProposedPrice <= 0)
                throw new ArgumentException("Proposed price must be greater than 0.");

            var job = await _context.JobPostings.FirstOrDefaultAsync(j => j.JobPostingId == request.JobId);
            if (job == null || job.Status != "OPEN")
                throw new InvalidOperationException("The target job posting is not open for submission.");

            if (job.ClientProfileId == expertId)
                throw new InvalidOperationException("Experts cannot submit proposals to their own posted jobs.");

            // Deep check: Prevent duplicate proposals from the same expert for this job
            var alreadySubmitted = await _context.Proposals
                .AnyAsync(p => p.JobId == request.JobId && p.ExpertId == expertId && p.Status != "REJECTED");
            if (alreadySubmitted)
                throw new InvalidOperationException("You have already submitted an active proposal for this job posting.");

            // ─── EXECUTION ───
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
                Status = "SUBMITTED",
                CreatedAt = DateTime.UtcNow
            };

            _context.Proposals.Add(proposal);
            var affectedRows = await _context.SaveChangesAsync();
            return affectedRows > 0;
        }

        public async Task<bool> CounterOfferAsync(int proposalId, CounterOfferRequest request)
        {
            if (request.CounterPrice <= 0)
                throw new ArgumentException("Counter price offer must be greater than 0.");

            var proposal = await _context.Proposals.FirstOrDefaultAsync(p => p.ProposalId == proposalId);
            if (proposal == null)
                throw new InvalidOperationException("Target proposal does not exist.");

            if (proposal.Status == "ACCEPTED" || proposal.Status == "REJECTED")
                throw new InvalidOperationException("Cannot counter an offer that has already been finalized.");

            // ─── EXECUTION ───
            proposal.CounterPrice = request.CounterPrice;
            proposal.CounterTimelineDays = request.CounterTimelineDays;
            proposal.CounterMessage = request.CounterMessage;
            proposal.Status = "COUNTER_OFFER";

            var affectedRows = await _context.SaveChangesAsync();
            return affectedRows > 0;
        }

        public async Task<bool> ProcessProposalStatusAsync(int proposalId, string decision)
        {
            var proposal = await _context.Proposals.FirstOrDefaultAsync(p => p.ProposalId == proposalId);
            if (proposal == null)
                throw new InvalidOperationException("Target proposal does not exist.");

            // ─── EXECUTION ───
            proposal.Status = decision.ToUpper() == "ACCEPT" ? "ACCEPTED" : "REJECTED";
            
            var affectedRows = await _context.SaveChangesAsync();
            return affectedRows > 0;
        }
    }
}