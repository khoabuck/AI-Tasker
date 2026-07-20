using System.Data;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Domain.Constants;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace AITasker.Infrastructure.Proposals
{
    public class ProposalService : IProposalService
    {
        private const string StatusDraft = "DRAFT";

        private const string StatusSubmitted = "SUBMITTED";
        private const string StatusAccepted = "ACCEPTED";
        private const string StatusRejected = "REJECTED";
        private const string StatusWithdrawn = "WITHDRAWN";

        public const string ProposalResubmitted = "PROPOSAL_RESUBMITTED";

        private const string ProposalCreditUsageFree = "FREE";
        private const string ProposalCreditUsagePaid = "PAID";

        private const string ContractStatusDraft = "DRAFT";
        private const string ContractStatusConfirmed = "CONFIRMED";
        private const string ContractSourceProposal = "PROPOSAL";

        private readonly AITaskerDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly IMarketplaceWorkflowPolicyService _workflowPolicyService;
        private MarketplaceWorkflowPolicyResponse? _cachedWorkflowPolicy;

        public ProposalService(
            AITaskerDbContext context,
            INotificationService notificationService,
            IMarketplaceWorkflowPolicyService workflowPolicyService)
        {
            _context = context;
            _notificationService = notificationService;
            _workflowPolicyService = workflowPolicyService;
        }

        public async Task<ProposalResponse> SubmitProposalAsync(
            int userId,
            SubmitProposalRequest request)
        {
            var policy = await GetWorkflowPolicyAsync();

            ValidateSubmitProposalRequest(request);

            ValidateProposalMilestonesRequest(
                request.Milestones,
                request.ProposedPrice,
                request.ProposedTimelineDays,
                policy.ProposalMilestoneLimit);

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

            await EnsureJobStillAcceptsProposalsAsync(job.JobPostingId);

            ValidateProposalPriceWithinJobBudget(request.ProposedPrice, job);

            var alreadySubmitted = await _context.Proposals.AnyAsync(x =>
                x.JobId == request.JobId &&
                x.ExpertId == expert.ExpertProfileId &&
                x.Status != StatusWithdrawn);

            if (alreadySubmitted)
            {
                throw new InvalidOperationException("You already have a draft or submitted proposal for this job.");
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

            var proposalCreditUsageType = ChargeProposalSubmitCredit(
                expert,
                policy);

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
                "PROPOSAL_SUBMITTED",
                relatedEntityType: "PROPOSAL",
                relatedEntityId: proposal.ProposalId,
                relatedJobId: job.JobPostingId,
                relatedProposalId: proposal.ProposalId);

            await NotifyProposalCreditUsedAsync(
                userId,
                proposalCreditUsageType,
                expert,
                proposal,
                job);

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
                .Where(x =>
                    x.ExpertId == expert.ExpertProfileId &&
                    x.Status != StatusDraft)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();

            var responses = new List<ProposalResponse>();

            foreach (var proposal in proposals)
            {
                responses.Add(await MapToProposalResponseAsync(proposal));
            }

            return responses;
        }

        public async Task<ProposalCreditResponse> GetMyProposalCreditsAsync(int userId)
        {
            var expert = await _context.ExpertProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId);

            if (expert == null)
            {
                throw new InvalidOperationException("Expert profile not found.");
            }

            var policy = await GetWorkflowPolicyAsync();

            return BuildProposalCreditResponse(expert, policy);
        }

        public async Task<IReadOnlyList<ProposalResponse>> GetMyProposalDraftsAsync(int userId)
        {
            var expert = await _context.ExpertProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId);

            if (expert == null)
            {
                throw new InvalidOperationException("Expert profile not found.");
            }

            var drafts = await _context.Proposals
                .AsNoTracking()
                .Where(x =>
                    x.ExpertId == expert.ExpertProfileId &&
                    x.Status == StatusDraft)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();

            var responses = new List<ProposalResponse>();

            foreach (var draft in drafts)
            {
                responses.Add(await MapToProposalResponseAsync(draft));
            }

            return responses;
        }

        public async Task<ProposalResponse> SaveProposalDraftAsync(
            int userId,
            SubmitProposalRequest request)
        {
            var policy = await GetWorkflowPolicyAsync();

            ValidateSubmitProposalRequest(request);

            ValidateProposalMilestonesRequest(
                request.Milestones,
                request.ProposedPrice,
                request.ProposedTimelineDays,
                policy.ProposalMilestoneLimit);

            var expert = await _context.ExpertProfiles
                .FirstOrDefaultAsync(x => x.UserId == userId);

            if (expert == null)
            {
                throw new InvalidOperationException("Expert profile not found.");
            }

            var currentDraftCount = await _context.Proposals.CountAsync(x =>
                x.ExpertId == expert.ExpertProfileId &&
                x.Status == StatusDraft);

            if (currentDraftCount >= policy.ProposalDraftLimit)
            {
                throw new InvalidOperationException(
                    $"You can only save up to {policy.ProposalDraftLimit} proposal drafts.");
            }

            var job = await _context.JobPostings
                .FirstOrDefaultAsync(x => x.JobPostingId == request.JobId);

            if (job == null)
            {
                throw new InvalidOperationException("Job posting not found.");
            }

            if (!string.Equals(job.Status, "OPEN", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Cannot save proposal draft because the job is not open.");
            }
            
            await EnsureJobStillAcceptsProposalsAsync(job.JobPostingId);

            ValidateProposalPriceWithinJobBudget(request.ProposedPrice, job);

            var alreadyExists = await _context.Proposals.AnyAsync(x =>
                x.JobId == request.JobId &&
                x.ExpertId == expert.ExpertProfileId &&
                x.Status != StatusWithdrawn);

            if (alreadyExists)
            {
                throw new InvalidOperationException("You already have a draft or submitted proposal for this job.");
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
                Status = StatusDraft,
                CreatedAt = DateTime.UtcNow
            };

            _context.Proposals.Add(proposal);

            var milestoneDrafts = BuildProposalMilestoneDrafts(
                proposal,
                request.Milestones);

            _context.ProposalMilestoneDrafts.AddRange(milestoneDrafts);

            await _context.SaveChangesAsync();

            return await MapToProposalResponseAsync(proposal);
        }

        public async Task<ProposalResponse> UpdateProposalDraftAsync(
            int userId,
            int proposalId,
            SubmitProposalRequest request)
        {
            var policy = await GetWorkflowPolicyAsync();

            ValidateSubmitProposalRequest(request);

            ValidateProposalMilestonesRequest(
                request.Milestones,
                request.ProposedPrice,
                request.ProposedTimelineDays,
                policy.ProposalMilestoneLimit);

            var proposal = await GetProposalByIdAsync(proposalId);

            await EnsureExpertOwnsProposalAsync(userId, proposal);

            if (proposal.Status != StatusDraft)
            {
                throw new InvalidOperationException("Only draft proposal can be updated.");
            }

            var job = await GetJobByIdAsync(proposal.JobId);

            if (!string.Equals(job.Status, "OPEN", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Cannot update proposal draft because the job is no longer open.");
            }

            await EnsureJobStillAcceptsProposalsAsync(
                job.JobPostingId,
                proposal.ProposalId);

            if (proposal.JobId != request.JobId)
            {
                throw new InvalidOperationException("Cannot change job of an existing proposal draft.");
            }

            ValidateProposalPriceWithinJobBudget(request.ProposedPrice, job);

            proposal.CoverLetter = request.CoverLetter.Trim();
            proposal.ProposedPrice = request.ProposedPrice;
            proposal.ProposedTimelineDays = request.ProposedTimelineDays;
            proposal.ExpectedOutputs = request.ExpectedOutputs.Trim();
            proposal.WorkingApproach = request.WorkingApproach.Trim();
            proposal.PreliminaryMilestonePlan = string.IsNullOrWhiteSpace(request.PreliminaryMilestonePlan)
                ? null
                : request.PreliminaryMilestonePlan.Trim();

            var oldMilestoneDrafts = await _context.ProposalMilestoneDrafts
                .Where(x => x.ProposalId == proposal.ProposalId)
                .ToListAsync();

            _context.ProposalMilestoneDrafts.RemoveRange(oldMilestoneDrafts);

            var newMilestoneDrafts = BuildProposalMilestoneDrafts(
                proposal,
                request.Milestones);

            _context.ProposalMilestoneDrafts.AddRange(newMilestoneDrafts);

            await _context.SaveChangesAsync();

            return await MapToProposalResponseAsync(proposal);
        }

        public async Task<ProposalResponse> SubmitProposalDraftAsync(
            int userId,
            int proposalId)
        {
            var proposal = await GetProposalByIdAsync(proposalId);

            await EnsureExpertOwnsProposalAsync(userId, proposal);

            if (proposal.Status != StatusDraft)
            {
                throw new InvalidOperationException("Only draft proposal can be submitted.");
            }

            var expert = await _context.ExpertProfiles
                .FirstOrDefaultAsync(x => x.ExpertProfileId == proposal.ExpertId);

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

            var job = await GetJobByIdAsync(proposal.JobId);

            if (!string.Equals(job.Status, "OPEN", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Cannot submit proposal draft because the job is no longer open.");
            }

            await EnsureJobStillAcceptsProposalsAsync(
                job.JobPostingId,
                proposal.ProposalId);

            ValidateProposalPriceWithinJobBudget(proposal.ProposedPrice, job);

            var milestoneDrafts = await _context.ProposalMilestoneDrafts
                .Where(x => x.ProposalId == proposal.ProposalId)
                .OrderBy(x => x.OrderIndex)
                .ToListAsync();

            var policy = await GetWorkflowPolicyAsync();

            ValidateSavedProposalDraftForSubmit(
                proposal,
                milestoneDrafts,
                policy.ProposalMilestoneLimit);

            proposal.Status = StatusSubmitted;
            proposal.StatusReason = null;

            var proposalCreditUsageType = ChargeProposalSubmitCredit(
                expert,
                policy);

            await _context.SaveChangesAsync();

            var clientProfile = await GetClientProfileByIdAsync(job.ClientProfileId);

            await _notificationService.CreateNotificationAsync(
                clientProfile.UserId,
                "New proposal received",
                $"An expert submitted a proposal for your job: {job.Title}.",
                "PROPOSAL_SUBMITTED",
                relatedEntityType: "PROPOSAL",
                relatedEntityId: proposal.ProposalId,
                relatedJobId: job.JobPostingId,
                relatedProposalId: proposal.ProposalId);

            await NotifyProposalCreditUsedAsync(
                userId,
                proposalCreditUsageType,
                expert,
                proposal,
                job);

            return await MapToProposalResponseAsync(proposal);
        }

        public async Task DeleteProposalDraftAsync(
            int userId,
            int proposalId)
        {
            var proposal = await GetProposalByIdAsync(proposalId);

            await EnsureExpertOwnsProposalAsync(userId, proposal);

            if (proposal.Status != StatusDraft)
            {
                throw new InvalidOperationException("Only draft proposal can be deleted.");
            }

            var milestoneDrafts = await _context.ProposalMilestoneDrafts
                .Where(x => x.ProposalId == proposal.ProposalId)
                .ToListAsync();

            _context.ProposalMilestoneDrafts.RemoveRange(milestoneDrafts);
            _context.Proposals.Remove(proposal);

            await _context.SaveChangesAsync();
        }

        public async Task<IReadOnlyList<ProposalResponse>> GetJobProposalsAsync(
            int userId,
            int jobId)
        {
            var job = await GetJobByIdAsync(jobId);

            await EnsureClientOwnsJobAsync(userId, job);

            var proposals = await _context.Proposals
                .AsNoTracking()
                .Where(x =>
                    x.JobId == jobId &&
                    x.Status != StatusDraft)
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

            if (proposal.Status == StatusDraft)
            {
                throw new InvalidOperationException("Draft proposal cannot be processed by client.");
            }

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
                proposal.StatusReason = ProposalStatusReasons.ClientRejected;
                await _context.SaveChangesAsync();

                var rejectedExpert = await GetExpertProfileByIdAsync(proposal.ExpertId);

                await _notificationService.CreateNotificationAsync(
                    rejectedExpert.UserId,
                    "Proposal rejected",
                    $"Your proposal for job '{job.Title}' was rejected by the client.",
                    "PROPOSAL_REJECTED",
                    relatedEntityType: "PROPOSAL",
                    relatedEntityId: proposal.ProposalId,
                    relatedJobId: job.JobPostingId,
                    relatedProposalId: proposal.ProposalId);

                return await MapToProposalResponseAsync(proposal);
            }

            await EnsureProposalBaseVersionExistsAsync(proposal);
            var sourceProposalVersionNumber = await GetLatestProposalVersionNumberAsync(proposal.ProposalId);

            proposal.Status = StatusAccepted;
            proposal.StatusReason = ProposalStatusReasons.ClientAccepted;
            job.UpdatedAt = DateTime.UtcNow;


            var competingProposals = await _context.Proposals
                .Where(x =>
                    x.JobId == job.JobPostingId &&
                    x.ProposalId != proposal.ProposalId &&
                    (
                        x.Status == StatusDraft ||
                        x.Status == StatusSubmitted
                    ))
                .ToListAsync();

            var competingProposalNotifications = new List<(int UserId, int ProposalId)>();

            foreach (var competingProposal in competingProposals)
            {
                competingProposal.Status = StatusRejected;
                competingProposal.StatusReason = ProposalStatusReasons.AutoNotSelected;

                var competingExpert = await GetExpertProfileByIdAsync(competingProposal.ExpertId);
                competingProposalNotifications.Add((
                    competingExpert.UserId,
                    competingProposal.ProposalId));
            }

            await _context.SaveChangesAsync();

            foreach (var notificationTarget in competingProposalNotifications)
            {
                await _notificationService.CreateNotificationAsync(
                    notificationTarget.UserId,
                    "Proposal not selected",
                    $"Your proposal for job '{job.Title}' was not selected because another proposal was accepted. It may be reopened if the resulting contract is cancelled before project start.",
                    NotificationTypes.ProposalRejected,
                    relatedEntityType: "PROPOSAL",
                    relatedEntityId: notificationTarget.ProposalId,
                    relatedJobId: job.JobPostingId,
                    relatedProposalId: notificationTarget.ProposalId);
            }

            var clientProfile = await GetClientProfileByIdAsync(job.ClientProfileId);
            var expert = await GetExpertProfileByIdAsync(proposal.ExpertId);

            await _notificationService.CreateNotificationAsync(
                clientProfile.UserId,
                "Proposal accepted",
                $"You accepted proposal version {sourceProposalVersionNumber} for job '{job.Title}'. You can now create the contract draft from this accepted proposal.",
                "PROPOSAL_ACCEPTED",
                relatedEntityType: "PROPOSAL",
                relatedEntityId: proposal.ProposalId,
                relatedJobId: job.JobPostingId,
                relatedProposalId: proposal.ProposalId);

            await _notificationService.CreateNotificationAsync(
                expert.UserId,
                "Proposal accepted",
                $"Your latest proposal version {sourceProposalVersionNumber} for job '{job.Title}' was accepted. Please wait for the client to create the contract draft.",
                "PROPOSAL_ACCEPTED",
                relatedEntityType: "PROPOSAL",
                relatedEntityId: proposal.ProposalId,
                relatedJobId: job.JobPostingId,
                relatedProposalId: proposal.ProposalId);

            return await MapToProposalResponseAsync(proposal);
        }

        public async Task<ProposalResponse> DeclineAcceptedDealAsync(
            int userId,
            int proposalId,
            DeclineAcceptedProposalDealRequest request)
        {
            var proposal = await GetProposalByIdAsync(proposalId);
            var job = await GetJobByIdAsync(proposal.JobId);
            var clientProfile = await GetClientProfileByIdAsync(job.ClientProfileId);
            var expertProfile = await GetExpertProfileByIdAsync(proposal.ExpertId);

            var userIsClient = clientProfile.UserId == userId;
            var userIsExpert = expertProfile.UserId == userId;

            if (!userIsClient && !userIsExpert)
            {
                throw new UnauthorizedAccessException("Only the selected Client or Expert can decline this accepted deal.");
            }

            if (!string.Equals(proposal.Status, StatusAccepted, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Only ACCEPTED proposals can be declined through the accepted deal flow.");
            }

            if (await HasActiveContractForProposalAsync(proposal.ProposalId))
            {
                throw new InvalidOperationException("This accepted proposal already has an active contract. Decline the deal from the contract endpoint instead.");
            }

            var reason = string.IsNullOrWhiteSpace(request?.Reason)
                ? "No reason provided."
                : request.Reason.Trim();

            proposal.Status = StatusRejected;
            proposal.StatusReason = ProposalStatusReasons.ContractCancelled;

            job.Status = "OPEN";
            job.UpdatedAt = DateTime.UtcNow;

            var autoRejectedProposals = await _context.Proposals
                .Where(x =>
                    x.JobId == job.JobPostingId &&
                    x.ProposalId != proposal.ProposalId &&
                    x.Status == StatusRejected &&
                    x.StatusReason == ProposalStatusReasons.AutoNotSelected)
                .ToListAsync();

            foreach (var autoRejectedProposal in autoRejectedProposals)
            {
                autoRejectedProposal.Status = StatusSubmitted;
                autoRejectedProposal.StatusReason = null;
            }

            await _context.SaveChangesAsync();

            if (userIsClient)
            {
                await _notificationService.CreateNotificationAsync(
                    expertProfile.UserId,
                    "Accepted deal declined by Client",
                    $"The client declined the accepted deal for job '{job.Title}' before creating a contract. Reason: {reason}",
                    NotificationTypes.ProposalRejected,
                    relatedEntityType: "PROPOSAL",
                    relatedEntityId: proposal.ProposalId,
                    relatedJobId: job.JobPostingId,
                    relatedProposalId: proposal.ProposalId);
            }
            else
            {
                await _notificationService.CreateNotificationAsync(
                    clientProfile.UserId,
                    "Accepted deal declined by Expert",
                    $"The expert declined the accepted deal for job '{job.Title}' before creating a contract. Reason: {reason}",
                    NotificationTypes.ProposalRejected,
                    relatedEntityType: "PROPOSAL",
                    relatedEntityId: proposal.ProposalId,
                    relatedJobId: job.JobPostingId,
                    relatedProposalId: proposal.ProposalId);
            }

            return await MapToProposalResponseAsync(proposal);
        }

        public async Task<ProposalWithdrawWarningResponse> GetWithdrawWarningAsync(
            int userId,
            int proposalId)
        {
            var proposal = await GetProposalByIdAsync(proposalId);

            await EnsureExpertOwnsProposalAsync(userId, proposal);

            if (proposal.Status == StatusDraft)
            {
                throw new InvalidOperationException("Draft proposal can be deleted without losing proposal credit.");
            }

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

            return new ProposalWithdrawWarningResponse
            {
                ProposalId = proposal.ProposalId,
                CanWithdraw = true,
                WillLoseProposalCredit = true,
                Message = "If you withdraw this proposal, the proposal submission credit used for this proposal will not be refunded."
            };
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

            if (proposal.Status == StatusDraft)
            {
                throw new InvalidOperationException("Draft proposal cannot be withdrawn. Delete the draft instead");
            }

            var job = await GetJobByIdAsync(proposal.JobId);
            var clientProfile = await GetClientProfileByIdAsync(job.ClientProfileId);

            proposal.Status = StatusWithdrawn;
            proposal.StatusReason = ProposalStatusReasons.ExpertWithdrawn;

            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                clientProfile.UserId,
                "Proposal withdrawn",
                $"An expert withdrew their proposal for your job: {job.Title}.",
                "PROPOSAL_WITHDRAWN",
                relatedEntityType: "PROPOSAL",
                relatedEntityId: proposal.ProposalId,
                relatedJobId: job.JobPostingId,
                relatedProposalId: proposal.ProposalId);

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

        private async Task EnsureJobStillAcceptsProposalsAsync(
            int jobId,
            int? currentProposalId = null)
        {
            var hasAcceptedProposal = await _context.Proposals.AnyAsync(x =>
                x.JobId == jobId &&
                x.Status == StatusAccepted &&
                (!currentProposalId.HasValue || x.ProposalId != currentProposalId.Value));

            if (hasAcceptedProposal)
            {
                throw new InvalidOperationException(
                    "This job already has an accepted proposal and no longer accepts new proposals.");
            }
        }

        private static string ChargeProposalSubmitCredit(
            ExpertProfile expert,
            MarketplaceWorkflowPolicyResponse policy)
        {
            var freeSubmitRemaining = Math.Max(
                policy.FreeProposalSubmitCount - expert.FreeProposalSubmitUsedCount,
                0);

            if (freeSubmitRemaining > 0)
            {
                expert.FreeProposalSubmitUsedCount += 1;
                return ProposalCreditUsageFree;
            }

            if (expert.ProposalSubmitCredits <= 0)
            {
                throw new InvalidOperationException(
                    "You need ProposalSubmitCredit to submit a new proposal. Please buy a proposal credit package.");
            }

            expert.ProposalSubmitCredits -= 1;
            return ProposalCreditUsagePaid;
        }

        private static ProposalCreditResponse BuildProposalCreditResponse(
            ExpertProfile expert,
            MarketplaceWorkflowPolicyResponse policy)
        {
            var freeSubmitTotal = Math.Max(policy.FreeProposalSubmitCount, 0);
            var usedCount = Math.Clamp(expert.FreeProposalSubmitUsedCount, 0, freeSubmitTotal);
            var freeSubmitRemaining = Math.Max(freeSubmitTotal - usedCount, 0);

            var canSubmit = freeSubmitRemaining > 0 || expert.ProposalSubmitCredits > 0;

            return new ProposalCreditResponse
            {
                FreeSubmitTotal = freeSubmitTotal,
                FreeSubmitUsedCount = usedCount,
                FreeSubmitRemaining = freeSubmitRemaining,
                AvailableProposalSubmitCredits = expert.ProposalSubmitCredits,
                CanSubmitNewProposal = canSubmit,
                Reason = canSubmit
                    ? freeSubmitRemaining > 0
                        ? $"You have {freeSubmitRemaining} free proposal submissions remaining."
                        : "Proposal submit credit is available."
                    : "You need ProposalSubmitCredit to submit a new proposal. Please buy a proposal credit package."
            };
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

            var expertProfile = await GetExpertProfileByIdAsync(proposal.ExpertId);

            if (proposal.Status == StatusDraft)
            {
                return expertProfile.UserId == userId;
            }

            var job = await GetJobByIdAsync(proposal.JobId);
            var clientProfile = await GetClientProfileByIdAsync(job.ClientProfileId);

            if (clientProfile.UserId == userId)
            {
                return true;
            }

            return expertProfile.UserId == userId;
        }

        private async Task<ProposalResponse> MapToProposalResponseAsync(Proposal proposal)
        {
            var policy = await GetWorkflowPolicyAsync();

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

            var resubmitsInWindow = CountResubmitsInPolicyWindow(versions, policy, DateTime.UtcNow);
            int? remainingResubmits = policy.ProposalResubmitLimit <= 0
                ? null
                : Math.Max(policy.ProposalResubmitLimit - resubmitsInWindow, 0);

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
                ClientAvatarUrl = clientUser.AvatarUrl,

                ExpertProfileId = expertProfile.ExpertProfileId,
                ExpertUserId = expertProfile.UserId,
                ExpertName = expertUser.FullName,
                ExpertAvatarUrl = expertUser.AvatarUrl,

                CoverLetter = proposal.CoverLetter,
                ProposedPrice = proposal.ProposedPrice,
                ProposedTimelineDays = proposal.ProposedTimelineDays,
                ExpectedOutputs = proposal.ExpectedOutputs,
                WorkingApproach = proposal.WorkingApproach,
                PreliminaryMilestonePlan = proposal.PreliminaryMilestonePlan,
                Milestones = MapProposalMilestoneDraftResponses(milestoneDrafts),

                Status = proposal.Status,
                StatusReason = proposal.StatusReason,
                ContractId = contractId,

                LatestVersionNumber = latestVersionNumber,
                TotalVersions = totalVersions,
                LastResubmittedAt = lastResubmittedAt,
                ResubmitLimit = policy.ProposalResubmitLimit,
                ResubmitWindowHours = policy.ProposalResubmitWindowHours,
                RemainingResubmitsInWindow = remainingResubmits,
                LatestVersion = latestVersion,

                CreatedAt = proposal.CreatedAt,

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
            var policy = await GetWorkflowPolicyAsync();

            ValidateResubmitProposalRequestLocal(
                request,
                policy.ResubmitNoteMaxLength);

            ValidateProposalMilestonesRequest(
                request.Milestones,
                request.ProposedPrice,
                request.ProposedTimelineDays,
                policy.ProposalMilestoneLimit);

            var proposal = await LoadProposalForVersionAsync(proposalId);

            await EnsureExpertOwnsProposalForVersionAsync(userId, proposal);

            if (proposal.Status == StatusAccepted &&
                await HasActiveContractForProposalAsync(proposal.ProposalId))
            {
                throw new InvalidOperationException("Accepted proposal cannot be resubmitted while an active contract draft or confirmed contract exists. Cancel the current draft first.");
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

            await EnsureJobStillAcceptsProposalsAsync(
                job.JobPostingId,
                proposal.ProposalId);

            ValidateProposalPriceWithinJobBudget(request.ProposedPrice, job);

            ProposalVersion newVersion;

            await using (var dbTransaction = await _context.Database.BeginTransactionAsync(
                IsolationLevel.Serializable))
            {
                try
                {
                    await _context.Entry(proposal).ReloadAsync();

                    var keepAcceptedAfterResubmit = proposal.Status == StatusAccepted;

                    if (keepAcceptedAfterResubmit &&
                        await HasActiveContractForProposalAsync(proposal.ProposalId))
                    {
                        throw new InvalidOperationException("Accepted proposal cannot be resubmitted while an active contract draft or confirmed contract exists. Cancel the current draft first.");
                    }

                    if (proposal.Status == StatusRejected ||
                        proposal.Status == StatusWithdrawn)
                    {
                        throw new InvalidOperationException("Proposal state changed and it can no longer be resubmitted.");
                    }

                    await EnsureProposalBaseVersionExistsAsync(proposal);
                    await EnsureResubmitAllowedAsync(proposal.ProposalId, policy);

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
                    proposal.Status = keepAcceptedAfterResubmit ? StatusAccepted : StatusSubmitted;
                    proposal.StatusReason = keepAcceptedAfterResubmit
                        ? ProposalStatusReasons.ClientAccepted
                        : null;

                    newVersion = new ProposalVersion
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
                    await dbTransaction.CommitAsync();
                }
                catch
                {
                    await dbTransaction.RollbackAsync();
                    throw;
                }
            }

            var clientProfile = await _context.ClientProfiles
                .FirstOrDefaultAsync(x => x.ClientProfileId == job.ClientProfileId);

            if (clientProfile != null)
            {
                await _notificationService.CreateNotificationAsync(
                    clientProfile.UserId,
                    "Proposal resubmitted",
                    $"The expert resubmitted proposal version {newVersion.VersionNumber} for job: {job.Title}.",
                    "PROPOSAL_RESUBMITTED",
                    relatedEntityType: "PROPOSAL",
                    relatedEntityId: proposal.ProposalId,
                    relatedJobId: job.JobPostingId,
                    relatedProposalId: proposal.ProposalId);
            }

            return await MapToProposalResponseAsync(proposal);
        }

        private async Task<bool> HasActiveContractForProposalAsync(int proposalId)
        {
            return await _context.ProjectContracts
                .AnyAsync(x =>
                    x.ProposalId == proposalId &&
                    (
                        x.Status == ContractStatusDraft ||
                        x.Status == ContractStatusConfirmed
                    ));
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
            var ownsTransaction = _context.Database.CurrentTransaction == null;
            var dbTransaction = ownsTransaction
                ? await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable)
                : null;

            try
            {
                var exists = await _context.ProposalVersions
                    .AnyAsync(x => x.ProposalId == proposal.ProposalId);

                if (exists)
                {
                    if (dbTransaction != null)
                    {
                        await dbTransaction.CommitAsync();
                    }

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

                if (dbTransaction != null)
                {
                    await dbTransaction.CommitAsync();
                }
            }
            catch
            {
                if (dbTransaction != null)
                {
                    await dbTransaction.RollbackAsync();
                }

                throw;
            }
            finally
            {
                if (dbTransaction != null)
                {
                    await dbTransaction.DisposeAsync();
                }
            }
        }

        private static void ValidateResubmitProposalRequestLocal(
            ResubmitProposalRequest request,
            int resubmitNoteMaxLength)
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
                request.ResubmitNote.Trim().Length > resubmitNoteMaxLength)
            {
                throw new InvalidOperationException($"Resubmit note cannot exceed {resubmitNoteMaxLength} characters.");
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
            int proposedTimelineDays,
            int proposalMilestoneLimit)
        {
            if (milestones == null || milestones.Count == 0)
            {
                throw new InvalidOperationException("At least one proposal milestone is required.");
            }

            if (milestones.Count > proposalMilestoneLimit)
            {
                throw new InvalidOperationException($"A proposal cannot have more than {proposalMilestoneLimit} milestones.");
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

        private static void ValidateSavedProposalDraftForSubmit(
            Proposal proposal,
            IReadOnlyList<ProposalMilestoneDraft> milestones,
            int proposalMilestoneLimit)
        {
            if (string.IsNullOrWhiteSpace(proposal.CoverLetter))
            {
                throw new InvalidOperationException("Cover letter is required.");
            }

            if (proposal.ProposedPrice <= 0)
            {
                throw new InvalidOperationException("Proposed price must be greater than 0.");
            }

            if (proposal.ProposedTimelineDays <= 0)
            {
                throw new InvalidOperationException("Proposed timeline must be greater than 0 days.");
            }

            if (string.IsNullOrWhiteSpace(proposal.ExpectedOutputs))
            {
                throw new InvalidOperationException("Expected outputs are required.");
            }

            if (string.IsNullOrWhiteSpace(proposal.WorkingApproach))
            {
                throw new InvalidOperationException("Working approach is required.");
            }

            if (milestones.Count == 0)
            {
                throw new InvalidOperationException("At least one proposal milestone is required.");
            }

            if (milestones.Count > proposalMilestoneLimit)
            {
                throw new InvalidOperationException($"A proposal cannot have more than {proposalMilestoneLimit} milestones.");
            }

            var totalAmount = milestones.Sum(x => x.Amount);

            if (totalAmount != proposal.ProposedPrice)
            {
                throw new InvalidOperationException("Total milestone amount must equal proposed price.");
            }

            // DeadlineOffsetDays is cumulative, so the largest offset represents the full timeline.
            var totalDurationDays = milestones.Max(x => x.DeadlineOffsetDays);

            if (totalDurationDays > proposal.ProposedTimelineDays)
            {
                throw new InvalidOperationException("Total milestone duration cannot exceed proposed timeline.");
            }
        }

        private async Task NotifyProposalCreditUsedAsync(
            int userId,
            string proposalCreditUsageType,
            ExpertProfile expert,
            Proposal proposal,
            JobPosting job)
        {
            try
            {
                var isFreeUsage = proposalCreditUsageType == ProposalCreditUsageFree;

                await _notificationService.CreateNotificationAsync(
                    userId,
                    isFreeUsage
                        ? "Free proposal submission used"
                        : "ProposalSubmitCredit used",
                    isFreeUsage
                        ? $"A free proposal submission has been used for job '{job.Title}'. Free submissions used: {expert.FreeProposalSubmitUsedCount}."
                        : $"1 ProposalSubmitCredit has been used for job '{job.Title}'. Remaining proposal credits: {expert.ProposalSubmitCredits}.",
                    NotificationTypes.ProposalCreditUsed,
                    relatedEntityType: "PROPOSAL",
                    relatedEntityId: proposal.ProposalId,
                    relatedJobId: job.JobPostingId,
                    relatedProposalId: proposal.ProposalId);

                var policy = await GetWorkflowPolicyAsync();
                var warningMessage = BuildProposalCreditWarningMessage(
                    expert.ProposalSubmitCredits,
                    policy.ProposalCreditLowWarningThreshold);

                if (!string.IsNullOrWhiteSpace(warningMessage))
                {
                    await _notificationService.CreateNotificationAsync(
                        userId,
                        "Proposal credit warning",
                        warningMessage,
                        NotificationTypes.ProposalCreditLow,
                        relatedEntityType: "PROPOSAL_CREDIT",
                        relatedEntityId: expert.ExpertProfileId,
                        relatedProposalId: proposal.ProposalId);
                }
            }
            catch
            {
            }
        }

        private async Task<MarketplaceWorkflowPolicyResponse> GetWorkflowPolicyAsync()
        {
            _cachedWorkflowPolicy ??= await _workflowPolicyService.GetActivePolicyAsync();
            return _cachedWorkflowPolicy;
        }

        private async Task EnsureResubmitAllowedAsync(
            int proposalId,
            MarketplaceWorkflowPolicyResponse policy)
        {
            if (policy.ProposalResubmitLimit <= 0)
            {
                return;
            }

            var query = _context.ProposalVersions
                .AsNoTracking()
                .Where(x => x.ProposalId == proposalId && x.VersionNumber > 1);

            if (policy.ProposalResubmitWindowHours > 0)
            {
                var windowStartUtc = DateTime.UtcNow.AddHours(-policy.ProposalResubmitWindowHours);
                query = query.Where(x => x.CreatedAt >= windowStartUtc);
            }

            var usedResubmits = await query.CountAsync();

            if (usedResubmits >= policy.ProposalResubmitLimit)
            {
                var scope = policy.ProposalResubmitWindowHours > 0
                    ? $"within {policy.ProposalResubmitWindowHours} hours"
                    : "for this proposal";

                throw new InvalidOperationException(
                    $"Proposal resubmit limit reached. Maximum allowed is {policy.ProposalResubmitLimit} {scope}.");
            }
        }

        private static int CountResubmitsInPolicyWindow(
            IReadOnlyCollection<ProposalVersion> versions,
            MarketplaceWorkflowPolicyResponse policy,
            DateTime nowUtc)
        {
            var resubmits = versions.Where(x => x.VersionNumber > 1);

            if (policy.ProposalResubmitWindowHours > 0)
            {
                var windowStartUtc = nowUtc.AddHours(-policy.ProposalResubmitWindowHours);
                resubmits = resubmits.Where(x => x.CreatedAt >= windowStartUtc);
            }

            return resubmits.Count();
        }

        private static string? BuildProposalCreditWarningMessage(
            int proposalSubmitCredits,
            int warningThreshold)
        {
            if (proposalSubmitCredits > warningThreshold)
            {
                return null;
            }

            if (proposalSubmitCredits <= 0)
            {
                return "You have used up all your proposal submissions. Please purchase additional proposal credit to continue submitting proposals.";
            }

            return $"You only have {proposalSubmitCredits} proposal submissions left. Please consider purchasing additional proposal credit.";
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
                    amount = x.Amount,
                    orderIndex = x.OrderIndex,
                    deadlineOffsetDays = x.DeadlineOffsetDays
                })
                .ToList();

            return JsonSerializer.Serialize(normalizedMilestones);
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