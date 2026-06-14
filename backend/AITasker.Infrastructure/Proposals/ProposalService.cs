using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Proposals
{
    public class ProposalService : IProposalService
    {
        private const string StatusSubmitted = "SUBMITTED";
        private const string StatusCounterOffer = "COUNTER_OFFER";
        private const string StatusAccepted = "ACCEPTED";
        private const string StatusRejected = "REJECTED";
        private const string StatusWithdrawn = "WITHDRAWN";

        private const string ContractStatusDraft = "DRAFT";
        private const string ContractSourceProposal = "PROPOSAL";

        private readonly AITaskerDbContext _context;
        private readonly INotificationService _notificationService;

        public ProposalService(
            AITaskerDbContext context,
            INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<ProposalResponse> SubmitProposalAsync(
            int userId,
            SubmitProposalRequest request)
        {
            ValidateSubmitProposalRequest(request);

            var expert = await _context.ExpertProfiles
                .FirstOrDefaultAsync(x => x.UserId == userId);

            if (expert == null)
            {
                throw new InvalidOperationException("Expert profile not found.");
            }

            if (!string.Equals(expert.ProfileReviewStatus, "APPROVED", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Expert profile must be approved before submitting proposal.");
            }

            if (!expert.AvailableForWork)
            {
                throw new InvalidOperationException("Expert is not available for work.");
            }

            var job = await _context.JobPostings
                .FirstOrDefaultAsync(x => x.JobPostingId == request.JobId);

            if (job == null)
            {
                throw new InvalidOperationException("Job posting not found.");
            }

            if (!string.Equals(job.Status, "OPEN", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Job posting is not open.");
            }

            var alreadySubmitted = await _context.Proposals.AnyAsync(x =>
                x.JobId == request.JobId &&
                x.ExpertId == expert.ExpertProfileId &&
                x.Status != StatusWithdrawn);

            if (alreadySubmitted)
            {
                throw new InvalidOperationException("You already submitted a proposal for this job.");
            }

            var proposal = new Proposal
            {
                JobId = request.JobId,
                ExpertId = expert.ExpertProfileId,
                CoverLetter = request.CoverLetter.Trim(),
                ProposedPrice = request.ProposedPrice,
                ProposedTimelineDays = request.ProposedTimelineDays,
                ExpectedOutputs = request.ExpectedOutputs.Trim(),
                WorkingApproach = request.WorkingApproach.Trim(),
                PreliminaryMilestonePlan = string.IsNullOrWhiteSpace(request.PreliminaryMilestonePlan)
                    ? null
                    : request.PreliminaryMilestonePlan.Trim(),
                Status = StatusSubmitted,
                CreatedAt = DateTime.UtcNow
            };

            _context.Proposals.Add(proposal);
            await _context.SaveChangesAsync();

            var clientProfile = await GetClientProfileByIdAsync(job.ClientProfileId);

            await _notificationService.CreateNotificationAsync(
                clientProfile.UserId,
                "New proposal received",
                $"An expert submitted a proposal for your job: {job.Title}.",
                "PROPOSAL_SUBMITTED");

            return await MapToProposalResponseAsync(proposal);
        }

        public async Task<IReadOnlyList<ProposalResponse>> GetMyProposalsAsync(int userId)
        {
            var expert = await _context.ExpertProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId);

            if (expert == null)
            {
                throw new InvalidOperationException("Expert profile not found.");
            }

            var proposals = await _context.Proposals
                .AsNoTracking()
                .Where(x => x.ExpertId == expert.ExpertProfileId)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();

            var responses = new List<ProposalResponse>();

            foreach (var proposal in proposals)
            {
                responses.Add(await MapToProposalResponseAsync(proposal));
            }

            return responses;
        }

        public async Task<IReadOnlyList<ProposalResponse>> GetJobProposalsAsync(
            int userId,
            int jobId)
        {
            var job = await GetJobByIdAsync(jobId);

            await EnsureClientOwnsJobAsync(userId, job);

            var proposals = await _context.Proposals
                .AsNoTracking()
                .Where(x => x.JobId == jobId)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();

            var responses = new List<ProposalResponse>();

            foreach (var proposal in proposals)
            {
                responses.Add(await MapToProposalResponseAsync(proposal));
            }

            return responses;
        }

        public async Task<ProposalResponse> GetProposalByIdAsync(
            int userId,
            int proposalId)
        {
            var proposal = await GetProposalByIdAsync(proposalId);

            var canAccess = await CanAccessProposalAsync(userId, proposal);

            if (!canAccess)
            {
                throw new UnauthorizedAccessException("You do not have permission to view this proposal.");
            }

            return await MapToProposalResponseAsync(proposal);
        }

        public async Task<ProposalResponse> CounterOfferAsync(
            int userId,
            int proposalId,
            CounterOfferRequest request)
        {
            ValidateCounterOfferRequest(request);

            var proposal = await GetProposalByIdAsync(proposalId);
            var job = await GetJobByIdAsync(proposal.JobId);

            await EnsureClientOwnsJobAsync(userId, job);

            EnsureProposalNotFinalized(proposal);

            proposal.CounterPrice = request.CounterPrice;
            proposal.CounterTimelineDays = request.CounterTimelineDays;
            proposal.CounterMessage = request.CounterMessage.Trim();
            proposal.Status = StatusCounterOffer;

            await _context.SaveChangesAsync();

            var expert = await GetExpertProfileByIdAsync(proposal.ExpertId);

            await _notificationService.CreateNotificationAsync(
                expert.UserId,
                "Counter offer received",
                $"The client sent a counter offer for job: {job.Title}.",
                "PROPOSAL_COUNTER_OFFER");

            return await MapToProposalResponseAsync(proposal);
        }

        public async Task<ProposalResponse> ProcessProposalStatusAsync(
            int userId,
            int proposalId,
            string decision)
        {
            if (string.IsNullOrWhiteSpace(decision))
            {
                throw new InvalidOperationException("Decision is required.");
            }

            var normalizedDecision = decision.Trim().ToUpperInvariant();

            if (normalizedDecision != "ACCEPT" && normalizedDecision != "REJECT")
            {
                throw new InvalidOperationException("Decision must be ACCEPT or REJECT.");
            }

            var proposal = await GetProposalByIdAsync(proposalId);
            var job = await GetJobByIdAsync(proposal.JobId);

            await EnsureClientOwnsJobAsync(userId, job);

            EnsureProposalNotFinalized(proposal);

            if (normalizedDecision == "REJECT")
            {
                proposal.Status = StatusRejected;

                await _context.SaveChangesAsync();

                var rejectedExpert = await GetExpertProfileByIdAsync(proposal.ExpertId);

                await _notificationService.CreateNotificationAsync(
                    rejectedExpert.UserId,
                    "Proposal rejected",
                    $"Your proposal for job '{job.Title}' was rejected by the client.",
                    "PROPOSAL_REJECTED");

                return await MapToProposalResponseAsync(proposal);
            }

            proposal.Status = StatusAccepted;

            var contractExists = await _context.ProjectContracts
                .AnyAsync(x => x.ProposalId == proposalId);

            if (!contractExists)
            {
                var clientProfile = await GetClientProfileByIdAsync(job.ClientProfileId);

                var finalPrice = proposal.CounterPrice ?? proposal.ProposedPrice;
                var finalTimelineDays =
                    proposal.CounterTimelineDays ?? proposal.ProposedTimelineDays;

                var platformFeeRate = ResolvePlatformFeeRate(clientProfile);
                var platformFeeAmount = finalPrice * platformFeeRate / 100m;
                var totalClientPayment = finalPrice + platformFeeAmount;

                var contract = new ProjectContract
                {
                    ProposalId = proposal.ProposalId,
                    ClientId = job.ClientProfileId,
                    ExpertId = proposal.ExpertId,

                    ProjectScope = proposal.WorkingApproach,
                    FinalPrice = finalPrice,
                    PlatformFeeRate = platformFeeRate,
                    PlatformFeeAmount = platformFeeAmount,
                    TotalClientPayment = totalClientPayment,
                    FinalTimelineDays = finalTimelineDays,

                    Deliverables = proposal.ExpectedOutputs,
                    AcceptanceCriteria = "To be defined before contract confirmation.",
                    RevisionLimit = 2,
                    PaymentTerms = "Milestone based escrow simulation",

                    ContractSource = ContractSourceProposal,
                    ChatSummary = null,
                    ClientConfirmed = false,
                    ExpertConfirmed = false,
                    Status = ContractStatusDraft,
                    CreatedAt = DateTime.UtcNow
                };

                _context.ProjectContracts.Add(contract);
            }

            await _context.SaveChangesAsync();

            var expert = await GetExpertProfileByIdAsync(proposal.ExpertId);

            await _notificationService.CreateNotificationAsync(
                expert.UserId,
                "Proposal accepted",
                $"Your proposal for job '{job.Title}' was accepted. A contract draft is ready for confirmation.",
                "PROPOSAL_ACCEPTED");

            return await MapToProposalResponseAsync(proposal);
        }

        public async Task<ProposalResponse> WithdrawProposalAsync(
            int userId,
            int proposalId)
        {
            var proposal = await GetProposalByIdAsync(proposalId);

            await EnsureExpertOwnsProposalAsync(userId, proposal);

            if (proposal.Status == StatusAccepted)
            {
                throw new InvalidOperationException("Accepted proposal cannot be withdrawn.");
            }

            if (proposal.Status == StatusRejected)
            {
                throw new InvalidOperationException("Rejected proposal cannot be withdrawn.");
            }

            if (proposal.Status == StatusWithdrawn)
            {
                throw new InvalidOperationException("Proposal already withdrawn.");
            }

            var job = await GetJobByIdAsync(proposal.JobId);
            var clientProfile = await GetClientProfileByIdAsync(job.ClientProfileId);

            proposal.Status = StatusWithdrawn;

            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                clientProfile.UserId,
                "Proposal withdrawn",
                $"An expert withdrew their proposal for your job: {job.Title}.",
                "PROPOSAL_WITHDRAWN");

            return await MapToProposalResponseAsync(proposal);
        }

        private static void ValidateSubmitProposalRequest(SubmitProposalRequest request)
        {
            if (request == null)
            {
                throw new InvalidOperationException("Proposal request is required.");
            }

            if (request.JobId <= 0)
            {
                throw new InvalidOperationException("JobId is required.");
            }

            if (string.IsNullOrWhiteSpace(request.CoverLetter))
            {
                throw new InvalidOperationException("Cover letter is required.");
            }

            if (request.ProposedPrice <= 0)
            {
                throw new InvalidOperationException("Proposed price must be greater than 0.");
            }

            if (request.ProposedTimelineDays <= 0)
            {
                throw new InvalidOperationException("Proposed timeline must be greater than 0 days.");
            }

            if (string.IsNullOrWhiteSpace(request.ExpectedOutputs))
            {
                throw new InvalidOperationException("Expected outputs are required.");
            }

            if (string.IsNullOrWhiteSpace(request.WorkingApproach))
            {
                throw new InvalidOperationException("Working approach is required.");
            }
        }

        private static void ValidateCounterOfferRequest(CounterOfferRequest request)
        {
            if (request == null)
            {
                throw new InvalidOperationException("Counter offer request is required.");
            }

            if (request.CounterPrice <= 0)
            {
                throw new InvalidOperationException("Counter price must be greater than 0.");
            }

            if (request.CounterTimelineDays <= 0)
            {
                throw new InvalidOperationException("Counter timeline must be greater than 0 days.");
            }

            if (string.IsNullOrWhiteSpace(request.CounterMessage))
            {
                throw new InvalidOperationException("Counter message is required.");
            }
        }

        private static void EnsureProposalNotFinalized(Proposal proposal)
        {
            if (proposal.Status == StatusAccepted)
            {
                throw new InvalidOperationException("Proposal already accepted.");
            }

            if (proposal.Status == StatusRejected)
            {
                throw new InvalidOperationException("Proposal already rejected.");
            }

            if (proposal.Status == StatusWithdrawn)
            {
                throw new InvalidOperationException("Proposal already withdrawn.");
            }
        }

        private static decimal ResolvePlatformFeeRate(ClientProfile clientProfile)
        {
            if (clientProfile.PlatformFeeRate > 0)
            {
                return clientProfile.PlatformFeeRate;
            }

            return string.Equals(clientProfile.ClientType, "BUSINESS", StringComparison.OrdinalIgnoreCase)
                ? 10m
                : 5m;
        }

        private async Task<Proposal> GetProposalByIdAsync(int proposalId)
        {
            var proposal = await _context.Proposals
                .FirstOrDefaultAsync(x => x.ProposalId == proposalId);

            if (proposal == null)
            {
                throw new InvalidOperationException("Proposal not found.");
            }

            return proposal;
        }

        private async Task<JobPosting> GetJobByIdAsync(int jobId)
        {
            var job = await _context.JobPostings
                .FirstOrDefaultAsync(x => x.JobPostingId == jobId);

            if (job == null)
            {
                throw new InvalidOperationException("Job posting not found.");
            }

            return job;
        }

        private async Task<ClientProfile> GetClientProfileByIdAsync(int clientProfileId)
        {
            var clientProfile = await _context.ClientProfiles
                .FirstOrDefaultAsync(x => x.ClientProfileId == clientProfileId);

            if (clientProfile == null)
            {
                throw new InvalidOperationException("Client profile not found.");
            }

            return clientProfile;
        }

        private async Task<ExpertProfile> GetExpertProfileByIdAsync(int expertProfileId)
        {
            var expertProfile = await _context.ExpertProfiles
                .FirstOrDefaultAsync(x => x.ExpertProfileId == expertProfileId);

            if (expertProfile == null)
            {
                throw new InvalidOperationException("Expert profile not found.");
            }

            return expertProfile;
        }

        private async Task EnsureClientOwnsJobAsync(
            int userId,
            JobPosting job)
        {
            var clientProfile = await GetClientProfileByIdAsync(job.ClientProfileId);

            if (clientProfile.UserId != userId)
            {
                throw new UnauthorizedAccessException("Only the job owner can perform this action.");
            }
        }

        private async Task EnsureExpertOwnsProposalAsync(
            int userId,
            Proposal proposal)
        {
            var expertProfile = await GetExpertProfileByIdAsync(proposal.ExpertId);

            if (expertProfile.UserId != userId)
            {
                throw new UnauthorizedAccessException("Only the proposal owner can perform this action.");
            }
        }

        private async Task<bool> CanAccessProposalAsync(
            int userId,
            Proposal proposal)
        {
            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId);

            if (user == null)
            {
                return false;
            }

            if (string.Equals(user.Role, "ADMIN", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            var job = await GetJobByIdAsync(proposal.JobId);
            var clientProfile = await GetClientProfileByIdAsync(job.ClientProfileId);

            if (clientProfile.UserId == userId)
            {
                return true;
            }

            var expertProfile = await GetExpertProfileByIdAsync(proposal.ExpertId);

            return expertProfile.UserId == userId;
        }

        private async Task<ProposalResponse> MapToProposalResponseAsync(Proposal proposal)
        {
            var job = await _context.JobPostings
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.JobPostingId == proposal.JobId);

            if (job == null)
            {
                throw new InvalidOperationException("Job posting not found.");
            }

            var clientProfile = await _context.ClientProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ClientProfileId == job.ClientProfileId);

            if (clientProfile == null)
            {
                throw new InvalidOperationException("Client profile not found.");
            }

            var clientUser = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == clientProfile.UserId);

            if (clientUser == null)
            {
                throw new InvalidOperationException("Client user not found.");
            }

            var expertProfile = await _context.ExpertProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ExpertProfileId == proposal.ExpertId);

            if (expertProfile == null)
            {
                throw new InvalidOperationException("Expert profile not found.");
            }

            var expertUser = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == expertProfile.UserId);

            if (expertUser == null)
            {
                throw new InvalidOperationException("Expert user not found.");
            }

            var contractId = await _context.ProjectContracts
                .AsNoTracking()
                .Where(x => x.ProposalId == proposal.ProposalId)
                .Select(x => (int?)x.ContractId)
                .FirstOrDefaultAsync();

            return new ProposalResponse
            {
                ProposalId = proposal.ProposalId,
                JobId = proposal.JobId,
                JobTitle = job.Title,

                ClientProfileId = clientProfile.ClientProfileId,
                ClientUserId = clientProfile.UserId,
                ClientName = clientUser.FullName,

                ExpertProfileId = expertProfile.ExpertProfileId,
                ExpertUserId = expertProfile.UserId,
                ExpertName = expertUser.FullName,

                CoverLetter = proposal.CoverLetter,
                ProposedPrice = proposal.ProposedPrice,
                ProposedTimelineDays = proposal.ProposedTimelineDays,
                ExpectedOutputs = proposal.ExpectedOutputs,
                WorkingApproach = proposal.WorkingApproach,
                PreliminaryMilestonePlan = proposal.PreliminaryMilestonePlan,

                CounterPrice = proposal.CounterPrice,
                CounterTimelineDays = proposal.CounterTimelineDays,
                CounterMessage = proposal.CounterMessage,

                Status = proposal.Status,
                ContractId = contractId,
                CreatedAt = proposal.CreatedAt
            };
        }
    }
}