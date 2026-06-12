using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;

namespace AITasker.Infrastructure.Proposals
{
    public class ProposalService : IProposalService
    {
        private readonly AITaskerDbContext _context;

        public ProposalService(
            AITaskerDbContext context)
        {
            _context = context;
        }

        public async Task<bool> SubmitProposalAsync(
            int userId,
            SubmitProposalRequest request)
        {
            if (request.ProposedPrice <= 0)
            {
                throw new InvalidOperationException(
                    "Proposed price must be greater than 0.");
            }

            var expert =
                await _context.ExpertProfiles
                    .Include(x => x.User)
                    .FirstOrDefaultAsync(
                        x => x.UserId == userId);

            if (expert == null)
            {
                throw new InvalidOperationException(
                    "Expert profile not found.");
            }

            if (!expert.AvailableForWork)
            {
                throw new InvalidOperationException(
                    "Expert is not available for work.");
            }

            var job =
                await _context.JobPostings
                    .FirstOrDefaultAsync(
                        x => x.JobPostingId == request.JobId);

            if (job == null)
            {
                throw new InvalidOperationException(
                    "Job posting not found.");
            }

            if (job.Status != "OPEN")
            {
                throw new InvalidOperationException(
                    "Job posting is not open.");
            }

            var alreadySubmitted =
                await _context.Proposals.AnyAsync(
                    x =>
                        x.JobId == request.JobId &&
                        x.ExpertId == expert.ExpertProfileId &&
                        x.Status != "REJECTED");

            if (alreadySubmitted)
            {
                throw new InvalidOperationException(
                    "You already submitted a proposal.");
            }

            var proposal = new Proposal
            {
                JobId = request.JobId,
                ExpertId = expert.ExpertProfileId,
                CoverLetter = request.CoverLetter,
                ProposedPrice = request.ProposedPrice,
                ProposedTimelineDays =
                    request.ProposedTimelineDays,
                ExpectedOutputs =
                    request.ExpectedOutputs,
                WorkingApproach =
                    request.WorkingApproach,
                PreliminaryMilestonePlan =
                    request.PreliminaryMilestonePlan,
                Status = "SUBMITTED",
                CreatedAt = DateTime.UtcNow
            };

            _context.Proposals.Add(proposal);

            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> CounterOfferAsync(
            int userId,
            int proposalId,
            CounterOfferRequest request)
        {
            if (request.CounterPrice <= 0)
            {
                throw new InvalidOperationException(
                    "Counter price must be greater than 0.");
            }

            var proposal =
                await _context.Proposals
                    .FirstOrDefaultAsync(
                        x => x.ProposalId == proposalId);

            if (proposal == null)
            {
                throw new InvalidOperationException(
                    "Proposal not found.");
            }

            if (
                proposal.Status == "ACCEPTED" ||
                proposal.Status == "REJECTED")
            {
                throw new InvalidOperationException(
                    "Proposal already finalized.");
            }

            proposal.CounterPrice =
                request.CounterPrice;

            proposal.CounterTimelineDays =
                request.CounterTimelineDays;

            proposal.CounterMessage =
                request.CounterMessage;

            proposal.Status =
                "COUNTER_OFFER";

            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> ProcessProposalStatusAsync(
            int userId,
            int proposalId,
            string decision)
        {
            var proposal =
                await _context.Proposals
                    .FirstOrDefaultAsync(
                        x => x.ProposalId == proposalId);

            if (proposal == null)
            {
                throw new InvalidOperationException(
                    "Proposal not found.");
            }

            decision = decision.ToUpper();

            if (
                decision != "ACCEPT" &&
                decision != "REJECT")
            {
                throw new InvalidOperationException(
                    "Decision must be ACCEPT or REJECT.");
            }

            if (decision == "REJECT")
            {
                proposal.Status = "REJECTED";

                return await _context.SaveChangesAsync() > 0;
            }

            proposal.Status = "ACCEPTED";

            var contractExists =
                await _context.ProjectContracts
                    .AnyAsync(
                        x => x.ProposalId == proposalId);

            if (!contractExists)
            {
                var contract =
                    new ProjectContract
                    {
                        ProposalId =
                            proposal.ProposalId,

                        ExpertId =
                            proposal.ExpertId,

                        ClientId = 0,

                        ProjectScope =
                            proposal.WorkingApproach,

                        FinalPrice =
                            proposal.CounterPrice ??
                            proposal.ProposedPrice,

                        FinalTimelineDays =
                            proposal.CounterTimelineDays ??
                            proposal.ProposedTimelineDays,

                        Deliverables =
                            proposal.ExpectedOutputs,

                        AcceptanceCriteria =
                            "To be defined",

                        RevisionLimit = 2,

                        PaymentTerms =
                            "Milestone Based",

                        PlatformFeeRate = 10,

                        PlatformFeeAmount = 0,

                        TotalClientPayment =
                            proposal.CounterPrice ??
                            proposal.ProposedPrice,

                        ContractSource =
                            "PROPOSAL",

                        Status = "DRAFT",

                        CreatedAt =
                            DateTime.UtcNow
                    };

                _context.ProjectContracts.Add(contract);
            }

            return await _context.SaveChangesAsync() > 0;
        }
    }
}