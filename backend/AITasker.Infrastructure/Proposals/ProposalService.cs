using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace AITasker.Infrastructure.Proposals
{
    public class ProposalService : IProposalService
    {
        private const string StatusSubmitted = "SUBMITTED";
        private const string StatusAccepted = "ACCEPTED";
        private const string StatusRejected = "REJECTED";
        private const string StatusWithdrawn = "WITHDRAWN";

        private const string JobStatusActive = "ACTIVE";

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

            ValidateProposalMilestonesRequest(
                request.Milestones,
                request.ProposedPrice,
                request.ProposedTimelineDays);

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

            ValidateProposalPriceWithinJobBudget(request.ProposedPrice, job);

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

            var milestoneDrafts = BuildProposalMilestoneDrafts(
                proposal,
                request.Milestones);

            _context.ProposalMilestoneDrafts.AddRange(milestoneDrafts);

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

            var jobAlreadyHasAcceptedProposal = await _context.Proposals.AnyAsync(x =>
                x.JobId == job.JobPostingId &&
                x.ProposalId != proposal.ProposalId &&
                x.Status == StatusAccepted);

            if (normalizedDecision == "ACCEPT" && jobAlreadyHasAcceptedProposal)
            {
                throw new InvalidOperationException("This job already has an accepted proposal.");
            }

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

            await EnsureProposalBaseVersionExistsAsync(proposal);
            var sourceProposalVersionNumber = await GetLatestProposalVersionNumberAsync(proposal.ProposalId);

            proposal.Status = StatusAccepted;
            job.Status = JobStatusActive;
            job.UpdatedAt = DateTime.UtcNow;

            var competingProposals = await _context.Proposals
                .Where(x =>
                    x.JobId == job.JobPostingId &&
                    x.ProposalId != proposal.ProposalId &&
                    x.Status == StatusSubmitted)
                .ToListAsync();

            foreach (var competingProposal in competingProposals)
            {
                competingProposal.Status = StatusRejected;
            }

            await _context.SaveChangesAsync();

            var clientProfile = await GetClientProfileByIdAsync(job.ClientProfileId);
            var expert = await GetExpertProfileByIdAsync(proposal.ExpertId);

            await _notificationService.CreateNotificationAsync(
                clientProfile.UserId,
                "Proposal accepted",
                $"You accepted proposal version {sourceProposalVersionNumber} for job '{job.Title}'. You can now create the contract draft from this accepted proposal.",
                "PROPOSAL_ACCEPTED");

            await _notificationService.CreateNotificationAsync(
                expert.UserId,
                "Proposal accepted",
                $"Your latest proposal version {sourceProposalVersionNumber} for job '{job.Title}' was accepted. Please wait for the client to create the contract draft.",
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

            var versions = await _context.ProposalVersions
                .AsNoTracking()
                .Where(x => x.ProposalId == proposal.ProposalId)
                .OrderByDescending(x => x.VersionNumber)
                .ToListAsync();

            var totalVersions = versions.Count == 0
                ? 1
                : versions.Count;

            var latestVersionNumber = versions.Count == 0
                ? 1
                : versions[0].VersionNumber;

            var latestVersion = versions.Count == 0
                ? null
                : await MapProposalVersionResponseAsync(versions[0]);

            var lastResubmittedAt = versions
                .Where(x => x.VersionNumber > 1)
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => (DateTime?)x.CreatedAt)
                .FirstOrDefault();

            var milestoneDrafts = await _context.ProposalMilestoneDrafts
                .AsNoTracking()
                .Where(x => x.ProposalId == proposal.ProposalId)
                .OrderBy(x => x.OrderIndex)
                .ToListAsync();

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
                Milestones = MapProposalMilestoneDraftResponses(milestoneDrafts),

                Status = proposal.Status,
                ContractId = contractId,

                LatestVersionNumber = latestVersionNumber,
                TotalVersions = totalVersions,
                LastResubmittedAt = lastResubmittedAt,
                ResubmitLimit = 0,
                ResubmitWindowHours = 0,
                RemainingResubmitsInWindow = int.MaxValue,
                LatestVersion = latestVersion,

                CreatedAt = proposal.CreatedAt
            };
        }

        public async Task<IReadOnlyList<ProposalVersionResponse>> GetProposalVersionsAsync(
            int userId,
            int proposalId)
        {
            var proposal = await LoadProposalForVersionAsync(proposalId);

            var canAccess = await CanAccessProposalVersionAsync(userId, proposal);

            if (!canAccess)
            {
                throw new UnauthorizedAccessException("You do not have permission to view proposal versions.");
            }

            await EnsureProposalBaseVersionExistsAsync(proposal);

            var versions = await _context.ProposalVersions
                .AsNoTracking()
                .Where(x => x.ProposalId == proposalId)
                .OrderByDescending(x => x.VersionNumber)
                .ToListAsync();

            var result = new List<ProposalVersionResponse>();

            foreach (var version in versions)
            {
                result.Add(await MapProposalVersionResponseAsync(version));
            }

            return result;
        }

        public async Task<ProposalResponse> ResubmitProposalAsync(
            int userId,
            int proposalId,
            ResubmitProposalRequest request)
        {
            ValidateResubmitProposalRequestLocal(request);

            ValidateProposalMilestonesRequest(
                request.Milestones,
                request.ProposedPrice,
                request.ProposedTimelineDays);

            var proposal = await LoadProposalForVersionAsync(proposalId);

            await EnsureExpertOwnsProposalForVersionAsync(userId, proposal);

            if (proposal.Status == StatusAccepted)
            {
                throw new InvalidOperationException("Accepted proposal cannot be resubmitted.");
            }

            if (proposal.Status == StatusRejected)
            {
                throw new InvalidOperationException("Rejected proposal cannot be resubmitted.");
            }

            if (proposal.Status == StatusWithdrawn)
            {
                throw new InvalidOperationException("Withdrawn proposal cannot be resubmitted.");
            }

            var job = await _context.JobPostings
                .FirstOrDefaultAsync(x => x.JobPostingId == proposal.JobId);

            if (job == null)
            {
                throw new InvalidOperationException("Job posting not found.");
            }

            if (!string.Equals(job.Status, "OPEN", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Cannot resubmit proposal because the job is no longer open.");
            }

            ValidateProposalPriceWithinJobBudget(request.ProposedPrice, job);

            await EnsureProposalBaseVersionExistsAsync(proposal);

            var latestVersionNumber = await _context.ProposalVersions
                .Where(x => x.ProposalId == proposal.ProposalId)
                .MaxAsync(x => x.VersionNumber);

            proposal.CoverLetter = request.CoverLetter.Trim();
            proposal.ProposedPrice = request.ProposedPrice;
            proposal.ProposedTimelineDays = request.ProposedTimelineDays;
            proposal.ExpectedOutputs = request.ExpectedOutputs.Trim();
            proposal.WorkingApproach = request.WorkingApproach.Trim();
            proposal.PreliminaryMilestonePlan = string.IsNullOrWhiteSpace(request.PreliminaryMilestonePlan)
                ? null
                : request.PreliminaryMilestonePlan.Trim();

            proposal.Status = StatusSubmitted;

            var newVersion = new ProposalVersion
            {
                ProposalId = proposal.ProposalId,
                VersionNumber = latestVersionNumber + 1,
                CoverLetter = proposal.CoverLetter,
                ProposedPrice = proposal.ProposedPrice,
                ProposedTimelineDays = proposal.ProposedTimelineDays,
                ExpectedOutputs = proposal.ExpectedOutputs,
                WorkingApproach = proposal.WorkingApproach,
                PreliminaryMilestonePlan = proposal.PreliminaryMilestonePlan,
                MilestonePlanJson = SerializeProposalMilestoneDraftRequests(request.Milestones),
                ResubmitNote = string.IsNullOrWhiteSpace(request.ResubmitNote)
                    ? "Proposal resubmitted after negotiation."
                    : request.ResubmitNote.Trim(),
                CreatedByUserId = userId,
                CreatedAt = DateTime.UtcNow
            };

            _context.ProposalVersions.Add(newVersion);

            var oldMilestoneDrafts = await _context.ProposalMilestoneDrafts
                .Where(x => x.ProposalId == proposal.ProposalId)
                .ToListAsync();

            _context.ProposalMilestoneDrafts.RemoveRange(oldMilestoneDrafts);

            var newMilestoneDrafts = BuildProposalMilestoneDrafts(
                proposal,
                request.Milestones);

            _context.ProposalMilestoneDrafts.AddRange(newMilestoneDrafts);

            await _context.SaveChangesAsync();

            var clientProfile = await _context.ClientProfiles
                .FirstOrDefaultAsync(x => x.ClientProfileId == job.ClientProfileId);

            if (clientProfile != null)
            {
                await _notificationService.CreateNotificationAsync(
                    clientProfile.UserId,
                    "Proposal resubmitted",
                    $"The expert resubmitted proposal version {newVersion.VersionNumber} for job: {job.Title}.",
                    "PROPOSAL_RESUBMITTED");
            }

            return await MapToProposalResponseAsync(proposal);
        }

        private async Task<Proposal> LoadProposalForVersionAsync(int proposalId)
        {
            var proposal = await _context.Proposals
                .FirstOrDefaultAsync(x => x.ProposalId == proposalId);

            if (proposal == null)
            {
                throw new InvalidOperationException("Proposal not found.");
            }

            return proposal;
        }

        private async Task<bool> CanAccessProposalVersionAsync(
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

            var job = await _context.JobPostings
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.JobPostingId == proposal.JobId);

            if (job == null)
            {
                return false;
            }

            var clientProfile = await _context.ClientProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ClientProfileId == job.ClientProfileId);

            if (clientProfile != null && clientProfile.UserId == userId)
            {
                return true;
            }

            var expertProfile = await _context.ExpertProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ExpertProfileId == proposal.ExpertId);

            return expertProfile != null && expertProfile.UserId == userId;
        }

        private async Task EnsureExpertOwnsProposalForVersionAsync(
            int userId,
            Proposal proposal)
        {
            var expertProfile = await _context.ExpertProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ExpertProfileId == proposal.ExpertId);

            if (expertProfile == null)
            {
                throw new InvalidOperationException("Expert profile not found.");
            }

            if (expertProfile.UserId != userId)
            {
                throw new UnauthorizedAccessException("Only the proposal owner can resubmit this proposal.");
            }
        }

        private async Task EnsureProposalBaseVersionExistsAsync(Proposal proposal)
        {
            var exists = await _context.ProposalVersions
                .AnyAsync(x => x.ProposalId == proposal.ProposalId);

            if (exists)
            {
                return;
            }

            var expertProfile = await _context.ExpertProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ExpertProfileId == proposal.ExpertId);

            if (expertProfile == null)
            {
                throw new InvalidOperationException("Expert profile not found.");
            }

            var currentMilestoneDrafts = await _context.ProposalMilestoneDrafts
                .AsNoTracking()
                .Where(x => x.ProposalId == proposal.ProposalId)
                .OrderBy(x => x.OrderIndex)
                .ToListAsync();

            var baseVersion = new ProposalVersion
            {
                ProposalId = proposal.ProposalId,
                VersionNumber = 1,
                CoverLetter = proposal.CoverLetter,
                ProposedPrice = proposal.ProposedPrice,
                ProposedTimelineDays = proposal.ProposedTimelineDays,
                ExpectedOutputs = proposal.ExpectedOutputs,
                WorkingApproach = proposal.WorkingApproach,
                PreliminaryMilestonePlan = proposal.PreliminaryMilestonePlan,
                MilestonePlanJson = SerializeProposalMilestoneDraftEntities(currentMilestoneDrafts),
                ResubmitNote = "Initial proposal version generated from existing proposal.",
                CreatedByUserId = expertProfile.UserId,
                CreatedAt = proposal.CreatedAt == default
                    ? DateTime.UtcNow
                    : proposal.CreatedAt
            };

            _context.ProposalVersions.Add(baseVersion);

            await _context.SaveChangesAsync();
        }

        private static void ValidateResubmitProposalRequestLocal(ResubmitProposalRequest request)
        {
            if (request == null)
            {
                throw new InvalidOperationException("Resubmit proposal request is required.");
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

            if (!string.IsNullOrWhiteSpace(request.ResubmitNote) &&
                request.ResubmitNote.Trim().Length > 1000)
            {
                throw new InvalidOperationException("Resubmit note cannot exceed 1000 characters.");
            }
        }

        private async Task<ProposalVersionResponse> MapProposalVersionResponseAsync(
            ProposalVersion version)
        {
            var createdBy = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == version.CreatedByUserId);

            return new ProposalVersionResponse
            {
                ProposalVersionId = version.ProposalVersionId,
                ProposalId = version.ProposalId,
                VersionNumber = version.VersionNumber,
                CoverLetter = version.CoverLetter,
                ProposedPrice = version.ProposedPrice,
                ProposedTimelineDays = version.ProposedTimelineDays,
                ExpectedOutputs = version.ExpectedOutputs,
                WorkingApproach = version.WorkingApproach,
                PreliminaryMilestonePlan = version.PreliminaryMilestonePlan,
                MilestonePlanJson = version.MilestonePlanJson,
                ResubmitNote = version.ResubmitNote,
                CreatedByUserId = version.CreatedByUserId,
                CreatedByName = createdBy?.FullName ?? string.Empty,
                CreatedAt = version.CreatedAt
            };
        }

        private async Task<int> GetLatestProposalVersionNumberAsync(int proposalId)
        {
            var latestVersionNumber = await _context.ProposalVersions
                .Where(x => x.ProposalId == proposalId)
                .Select(x => (int?)x.VersionNumber)
                .MaxAsync();

            return latestVersionNumber ?? 1;
        }

        private static void ValidateProposalMilestonesRequest(
            List<ProposalMilestoneDraftItemRequest> milestones,
            decimal proposedPrice,
            int proposedTimelineDays)
        {
            if (milestones == null || milestones.Count == 0)
            {
                throw new InvalidOperationException("At least one proposal milestone is required.");
            }

            if (milestones.Count > 10)
            {
                throw new InvalidOperationException("A proposal cannot have more than 10 milestones.");
            }

            foreach (var milestone in milestones)
            {
                if (string.IsNullOrWhiteSpace(milestone.Title))
                {
                    throw new InvalidOperationException("Milestone title is required.");
                }

                if (milestone.Amount <= 0)
                {
                    throw new InvalidOperationException("Milestone amount must be greater than 0.");
                }

                if (milestone.DurationDays <= 0)
                {
                    throw new InvalidOperationException("Milestone duration days must be greater than 0.");
                }
            }

            var totalMilestoneAmount = milestones.Sum(x => x.Amount);

            if (totalMilestoneAmount != proposedPrice)
            {
                throw new InvalidOperationException("Total milestone amount must equal proposed price.");
            }

            var totalDurationDays = milestones.Sum(x => x.DurationDays);

            if (totalDurationDays > proposedTimelineDays)
            {
                throw new InvalidOperationException("Total milestone duration days cannot exceed proposed timeline days.");
            }
        }

        private static List<ProposalMilestoneDraft> BuildProposalMilestoneDrafts(
            Proposal proposal,
            List<ProposalMilestoneDraftItemRequest> milestones)
        {
            var result = new List<ProposalMilestoneDraft>();
            var deadlineOffsetDays = 0;
            var orderIndex = 1;

            foreach (var milestone in milestones)
            {
                deadlineOffsetDays += milestone.DurationDays;

                result.Add(new ProposalMilestoneDraft
                {
                    Proposal = proposal,
                    Title = milestone.Title.Trim(),
                    Description = string.Empty,
                    ExpectedDeliverable = string.Empty,
                    AcceptanceCriteria = string.Empty,
                    Amount = milestone.Amount,
                    OrderIndex = orderIndex,
                    DeadlineOffsetDays = deadlineOffsetDays,
                    CreatedAt = DateTime.UtcNow
                });

                orderIndex++;
            }

            return result;
        }

        private static List<ProposalMilestoneDraftResponse> MapProposalMilestoneDraftResponses(
            List<ProposalMilestoneDraft> drafts)
        {
            var result = new List<ProposalMilestoneDraftResponse>();
            var previousDeadlineOffsetDays = 0;

            foreach (var draft in drafts.OrderBy(x => x.OrderIndex))
            {
                var durationDays = draft.DeadlineOffsetDays - previousDeadlineOffsetDays;

                result.Add(new ProposalMilestoneDraftResponse
                {
                    ProposalMilestoneDraftId = draft.ProposalMilestoneDraftId,
                    ProposalId = draft.ProposalId,
                    Title = draft.Title,
                    Amount = draft.Amount,
                    DurationDays = durationDays <= 0 ? draft.DeadlineOffsetDays : durationDays,
                    CreatedAt = draft.CreatedAt
                });

                previousDeadlineOffsetDays = draft.DeadlineOffsetDays;
            }

            return result;
        }

        private static string SerializeProposalMilestoneDraftRequests(
            List<ProposalMilestoneDraftItemRequest> milestones)
        {
            var deadlineOffsetDays = 0;
            var orderIndex = 1;
            var normalizedMilestones = new List<object>();

            foreach (var milestone in milestones)
            {
                deadlineOffsetDays += milestone.DurationDays;

                normalizedMilestones.Add(new
                {
                    title = milestone.Title.Trim(),
                    amount = milestone.Amount,
                    durationDays = milestone.DurationDays,
                    orderIndex,
                    deadlineOffsetDays
                });

                orderIndex++;
            }

            return JsonSerializer.Serialize(normalizedMilestones);
        }

        private static string SerializeProposalMilestoneDraftEntities(
            List<ProposalMilestoneDraft> milestones)
        {
            var normalizedMilestones = milestones
                .OrderBy(x => x.OrderIndex)
                .Select(x => new
                {
                    title = x.Title,
                    description = x.Description,
                    expectedDeliverable = x.ExpectedDeliverable,
                    acceptanceCriteria = x.AcceptanceCriteria,
                    amount = x.Amount,
                    orderIndex = x.OrderIndex,
                    deadlineOffsetDays = x.DeadlineOffsetDays
                })
                .ToList();

            return JsonSerializer.Serialize(normalizedMilestones);
        }

        private async Task CopyLatestProposalMilestonesToContractDraftAsync(
            int proposalId,
            int contractId)
        {
            var proposalMilestones = await _context.ProposalMilestoneDrafts
                .AsNoTracking()
                .Where(x => x.ProposalId == proposalId)
                .OrderBy(x => x.OrderIndex)
                .ToListAsync();

            if (proposalMilestones.Count == 0)
            {
                throw new InvalidOperationException("Proposal must have milestone drafts before creating contract.");
            }

            var existingContractMilestones = await _context.ContractMilestoneDrafts
                .Where(x => x.ContractId == contractId)
                .ToListAsync();

            if (existingContractMilestones.Count > 0)
            {
                _context.ContractMilestoneDrafts.RemoveRange(existingContractMilestones);
            }

            var contractMilestones = proposalMilestones
                .Select(x => new ContractMilestoneDraft
                {
                    ContractId = contractId,
                    Title = x.Title,
                    Description = x.Description,
                    ExpectedDeliverable = x.ExpectedDeliverable,
                    AcceptanceCriteria = x.AcceptanceCriteria,
                    Amount = x.Amount,
                    OrderIndex = x.OrderIndex,
                    DeadlineOffsetDays = x.DeadlineOffsetDays,
                    CreatedAt = DateTime.UtcNow
                })
                .ToList();

            _context.ContractMilestoneDrafts.AddRange(contractMilestones);

            await _context.SaveChangesAsync();
        }

        private static void ValidateProposalPriceWithinJobBudget(decimal proposedPrice, JobPosting job)
        {
            if (proposedPrice < job.BudgetMin || proposedPrice > job.BudgetMax)
            {
                throw new InvalidOperationException(
                    $"Proposed price must be between job budget range {job.BudgetMin:N0} and {job.BudgetMax:N0}.");
            }
        }
    }
}