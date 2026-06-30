using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Domain.Constants;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Contracts
{
    public class ProjectContractService : IProjectContractService
    {
        private const string ProposalStatusAccepted = "ACCEPTED";
        private const string ProposalStatusRejected = "REJECTED";
        private const string ProposalStatusWithdrawn = "WITHDRAWN";

        private const string ContractStatusDraft = "DRAFT";
        private const string ContractStatusConfirmed = "CONFIRMED";
        private const string ContractStatusCancelled = "CANCELLED";

        private const string JobStatusOpen = "OPEN";
        private const string JobStatusActive = "ACTIVE";
        private const string ContractSourceProposal = "PROPOSAL";

        private const string ProjectStatusPendingEscrow = "PENDING_ESCROW";
        private const string ProjectStatusCancelled = "CANCELLED";

        private readonly AITaskerDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly IMarketplaceWorkflowPolicyService _workflowPolicyService;

        public ProjectContractService(
            AITaskerDbContext context,
            INotificationService notificationService,
            IMarketplaceWorkflowPolicyService workflowPolicyService)
        {
            _context = context;
            _notificationService = notificationService;
            _workflowPolicyService = workflowPolicyService;
        }

        public async Task<ProjectContractResponse> CreateContractFromProposalAsync(
            int userId,
            int proposalId)
        {
            var proposal = await GetProposalByIdAsync(proposalId);
            var job = await GetJobByIdAsync(proposal.JobId);
            var clientProfile = await GetClientProfileByIdAsync(job.ClientProfileId);
            var expertProfile = await GetExpertProfileByIdAsync(proposal.ExpertId);

            if (clientProfile.UserId != userId)
            {
                throw new UnauthorizedAccessException("Only the Client who owns the job can create a contract from an accepted proposal.");
            }

            if (!string.Equals(proposal.Status, ProposalStatusAccepted, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Only ACCEPTED proposals can create contract draft.");
            }

            ValidateProposalPriceWithinJobBudget(proposal.ProposedPrice, job);

            var existingContract = await _context.ProjectContracts
                .FirstOrDefaultAsync(x => x.ProposalId == proposal.ProposalId);

            if (existingContract != null)
            {
                var hasMilestoneDrafts = await _context.ContractMilestoneDrafts
                    .AnyAsync(x => x.ContractId == existingContract.ContractId);

                if (!hasMilestoneDrafts)
                {
                    await CopyLatestProposalMilestonesToContractDraftAsync(
                        proposal.ProposalId,
                        existingContract.ContractId);
                }

                return await MapToContractResponseAsync(existingContract);
            }

            await EnsureProposalBaseVersionExistsAsync(proposal);
            var sourceProposalVersionNumber = await GetLatestProposalVersionNumberAsync(proposal.ProposalId);

            var finalPrice = proposal.ProposedPrice;
            var finalTimelineDays = proposal.ProposedTimelineDays;



            var contract = BuildContract(
                proposal,
                job,
                clientProfile,
                proposal.WorkingApproach,
                finalPrice,
                finalTimelineDays,
                proposal.ExpectedOutputs,
                "Acceptance criteria must be confirmed by Client and Expert before project starts.",
                "Milestone-based escrow payment managed through AITasker escrow.",
                ContractSourceProposal,
                null);

            contract.SourceProposalVersionNumber = sourceProposalVersionNumber;

            _context.ProjectContracts.Add(contract);
            await _context.SaveChangesAsync();

            await CopyLatestProposalMilestonesToContractDraftAsync(
                proposal.ProposalId,
                contract.ContractId);

            await NotifyContractDraftCreatedAsync(
                userId,
                contract,
                job,
                clientProfile,
                expertProfile);

            return await MapToContractResponseAsync(contract);
        }

        public async Task<ProjectContractResponse> CreateDraftContractAsync(
            int userId,
            CreateContractRequest request)
        {
            await Task.CompletedTask;

            throw new InvalidOperationException(
                "Manual contract creation is disabled. A contract can only be generated from an accepted proposal.");
        }

        public async Task<ProjectContractResponse> UpdateContractDraftAsync(
            int userId,
            int contractId,
            UpdateContractDraftRequest request)
        {
            await Task.CompletedTask;

            throw new InvalidOperationException(
                "Contract editing is disabled. The generated contract can only be signed or cancelled.");
        }

        public async Task<ProjectContractResponse> GetContractByIdAsync(
            int userId,
            int contractId)
        {
            var contract = await GetContractByIdInternalAsync(contractId);

            var canAccess = await CanAccessContractAsync(userId, contract);

            if (!canAccess)
            {
                throw new UnauthorizedAccessException("You do not have permission to view this contract.");
            }

            return await MapToContractResponseAsync(contract);
        }

        public async Task<ProjectContractResponse> GetContractByProposalIdAsync(
            int userId,
            int proposalId)
        {
            var contract = await _context.ProjectContracts
                .FirstOrDefaultAsync(x => x.ProposalId == proposalId);

            if (contract == null)
            {
                throw new InvalidOperationException("Contract not found for this proposal.");
            }

            var canAccess = await CanAccessContractAsync(userId, contract);

            if (!canAccess)
            {
                throw new UnauthorizedAccessException("You do not have permission to view this contract.");
            }

            return await MapToContractResponseAsync(contract);
        }

        public async Task<ProjectContractResponse> ConfirmContractAsync(
            int contractId,
            int userId)
        {
            var contract = await GetContractByIdInternalAsync(contractId);

            if (string.Equals(contract.Status, ContractStatusCancelled, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Cancelled contracts cannot be signed.");
            }

            if (string.Equals(contract.Status, ContractStatusConfirmed, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Contract is already fully confirmed.");
            }

            if (!string.Equals(contract.Status, ContractStatusDraft, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Only DRAFT contracts can be signed.");
            }

            var proposal = await GetProposalByIdAsync(contract.ProposalId);
            var job = await GetJobByIdAsync(proposal.JobId);
            var clientProfile = await GetClientProfileByIdAsync(contract.ClientId);
            var expertProfile = await GetExpertProfileByIdAsync(contract.ExpertId);

            var userIsClient = clientProfile.UserId == userId;
            var userIsExpert = expertProfile.UserId == userId;

            if (!userIsClient && !userIsExpert)
            {
                throw new UnauthorizedAccessException("Only the contract Client or Expert can sign this contract.");
            }

            if (userIsClient)
            {
                if (contract.ClientConfirmed)
                {
                    throw new InvalidOperationException("Client has already signed this contract.");
                }

                if (contract.ExpertConfirmed)
                {
                    throw new InvalidOperationException("Invalid contract state: Expert cannot sign before Client.");
                }

                await EnsureContractMilestoneDraftsReadyAsync(contract);

                await EnsureClientWalletCanCoverContractAsync(
                    clientProfile.UserId,
                    contract);

                contract.ClientConfirmed = true;

                await _notificationService.CreateNotificationAsync(
                    expertProfile.UserId,
                    "Contract signed by Client",
                    $"The client signed the contract for job: {job.Title}. Please review and sign to create the project.",
                    "CONTRACT_SIGNED_BY_CLIENT",
                    relatedEntityType: "CONTRACT",
                    relatedEntityId: contract.ContractId,
                    relatedJobId: job.JobPostingId,
                    relatedProposalId: contract.ProposalId,
                    relatedContractId: contract.ContractId);

                await _context.SaveChangesAsync();

                return await MapToContractResponseAsync(contract);
            }

            if (userIsExpert)
            {
                if (!contract.ClientConfirmed)
                {
                    throw new InvalidOperationException("Client must sign the contract before Expert can sign.");
                }

                if (contract.ExpertConfirmed)
                {
                    throw new InvalidOperationException("Expert has already signed this contract.");
                }

                var workflowPolicy = await _workflowPolicyService.GetActivePolicyAsync();

                await EnsureExpertCanAcceptNewProjectAsync(
                    contract.ExpertId,
                    workflowPolicy.ExpertMaxActiveProjects);

                await EnsureContractMilestoneDraftsReadyAsync(contract);

                contract.ExpertConfirmed = true;
                contract.Status = ContractStatusConfirmed;
                contract.ConfirmedAt = DateTime.UtcNow;

                job.Status = JobStatusActive;
                job.UpdatedAt = DateTime.UtcNow;

                var project = await EnsurePendingEscrowProjectExistsAsync(
                    contract,
                    job,
                    workflowPolicy.EscrowLockWindowHours);

                await EnsureProjectMilestonesCreatedFromDraftsAsync(
                    contract,
                    project);

                await _context.SaveChangesAsync();

                await _notificationService.CreateNotificationAsync(
                    clientProfile.UserId,
                    "Contract fully confirmed",
                    $"The contract for job '{job.Title}' is fully confirmed. Please lock escrow within {workflowPolicy.EscrowLockWindowHours} hours to start the project.",
                    "CONTRACT_CONFIRMED_PENDING_ESCROW",
                    relatedEntityType: "CONTRACT",
                    relatedEntityId: contract.ContractId,
                    relatedJobId: job.JobPostingId,
                    relatedProposalId: contract.ProposalId,
                    relatedContractId: contract.ContractId,
                    relatedProjectId: project.ProjectId);

                await _notificationService.CreateNotificationAsync(
                    expertProfile.UserId,
                    "Contract fully confirmed",
                    $"The contract for job '{job.Title}' is fully confirmed. Waiting for Client to lock escrow before work starts.",
                    "CONTRACT_CONFIRMED_PENDING_ESCROW",
                    relatedEntityType: "CONTRACT",
                    relatedEntityId: contract.ContractId,
                    relatedJobId: job.JobPostingId,
                    relatedProposalId: contract.ProposalId,
                    relatedContractId: contract.ContractId,
                    relatedProjectId: project.ProjectId);

                return await MapToContractResponseAsync(contract);
            }

            throw new UnauthorizedAccessException("You do not have permission to sign this contract.");
        }

        public async Task<ProjectContractResponse> CancelContractAsync(
            int userId,
            int contractId,
            CancelContractRequest request)
        {
            var contract = await GetContractByIdInternalAsync(contractId);
            var proposal = await GetProposalByIdAsync(contract.ProposalId);
            var job = await GetJobByIdAsync(proposal.JobId);
            var clientProfile = await GetClientProfileByIdAsync(contract.ClientId);
            var expertProfile = await GetExpertProfileByIdAsync(contract.ExpertId);

            var userIsClient = clientProfile.UserId == userId;
            var userIsExpert = expertProfile.UserId == userId;

            if (!userIsClient && !userIsExpert)
            {
                throw new UnauthorizedAccessException("Only the contract Client or Expert can cancel this contract.");
            }

            if (string.Equals(contract.Status, ContractStatusCancelled, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Contract is already cancelled.");
            }

            var project = await _context.Projects
                .FirstOrDefaultAsync(x => x.ContractId == contract.ContractId);

            if (project != null &&
                !string.Equals(project.Status, ProjectStatusPendingEscrow, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Cannot cancel contract after the project has started. Please use dispute or project cancellation flow.");
            }

            contract.Status = ContractStatusCancelled;
            contract.ClientConfirmed = false;
            contract.ExpertConfirmed = false;
            contract.ConfirmedAt = null;

            if (userIsClient)
            {
                proposal.Status = ProposalStatusRejected;
            }
            else
            {
                proposal.Status = ProposalStatusWithdrawn;
            }

            job.Status = JobStatusOpen;
            job.UpdatedAt = DateTime.UtcNow;

            if (project != null)
            {
                project.Status = ProjectStatusCancelled;
                project.EndDate = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            var reason = request == null || string.IsNullOrWhiteSpace(request.Reason)
                ? "No reason provided."
                : request.Reason.Trim();

            if (userIsClient)
            {
                await _notificationService.CreateNotificationAsync(
                    expertProfile.UserId,
                    "Contract cancelled by Client",
                    $"The client cancelled the contract for job '{job.Title}'. Reason: {reason}",
                    NotificationTypes.ContractCancelled,
                    relatedEntityType: "CONTRACT",
                    relatedEntityId: contract.ContractId,
                    relatedJobId: job.JobPostingId,
                    relatedProposalId: contract.ProposalId,
                    relatedContractId: contract.ContractId);
            }
            else
            {
                await _notificationService.CreateNotificationAsync(
                    clientProfile.UserId,
                    "Contract cancelled by Expert",
                    $"The expert cancelled the contract for job '{job.Title}'. Reason: {reason}",
                    NotificationTypes.ContractCancelled,
                    relatedEntityType: "CONTRACT",
                    relatedEntityId: contract.ContractId,
                    relatedJobId: job.JobPostingId,
                    relatedProposalId: contract.ProposalId,
                    relatedContractId: contract.ContractId);
            }

            return await MapToContractResponseAsync(contract);
        }

        private static void ValidateProposalPriceWithinJobBudget(decimal proposedPrice, JobPosting job)
        {
            if (proposedPrice < job.BudgetMin || proposedPrice > job.BudgetMax)
            {
                throw new InvalidOperationException(
                    $"Accepted proposal price must be between job budget range {job.BudgetMin:N0} and {job.BudgetMax:N0}.");
            }
        }

        private ProjectContract BuildContract(
            Proposal proposal,
            JobPosting job,
            ClientProfile clientProfile,
            string projectScope,
            decimal finalPrice,
            int finalTimelineDays,
            string deliverables,
            string acceptanceCriteria,
            string paymentTerms,
            string contractSource,
            string? chatSummary)
        {
            if (finalPrice <= 0)
            {
                throw new InvalidOperationException("Final price must be greater than 0.");
            }

            if (finalTimelineDays <= 0)
            {
                throw new InvalidOperationException("Final timeline must be greater than 0 days.");
            }

            var platformFeeRate = ResolvePlatformFeeRate(clientProfile);
            var platformFeeAmount = finalPrice * platformFeeRate / 100m;
            var totalClientPayment = finalPrice + platformFeeAmount;

            return new ProjectContract
            {
                ProposalId = proposal.ProposalId,
                ClientId = job.ClientProfileId,
                ExpertId = proposal.ExpertId,

                ProjectScope = projectScope,
                FinalPrice = finalPrice,
                PlatformFeeRate = platformFeeRate,
                PlatformFeeAmount = platformFeeAmount,
                TotalClientPayment = totalClientPayment,
                FinalTimelineDays = finalTimelineDays,

                Deliverables = deliverables,
                AcceptanceCriteria = acceptanceCriteria,
                PaymentTerms = paymentTerms,

                ContractSource = contractSource,
                ChatSummary = chatSummary,
                ClientConfirmed = false,
                ExpertConfirmed = false,
                Status = ContractStatusDraft,
                CreatedAt = DateTime.UtcNow
            };
        }

        private async Task<Project> EnsurePendingEscrowProjectExistsAsync(
            ProjectContract contract,
            JobPosting job,
            int escrowLockWindowHours)
        {
            var existingProject = await _context.Projects
                .FirstOrDefaultAsync(x => x.ContractId == contract.ContractId);

            var now = DateTime.UtcNow;
            var escrowDeadline = (contract.ConfirmedAt ?? now).AddHours(escrowLockWindowHours);

            if (existingProject != null)
            {
                if (existingProject.EscrowLockDeadlineAt == null)
                {
                    existingProject.EscrowLockDeadlineAt = escrowDeadline;
                }

                return existingProject;
            }

            var project = new Project
            {
                ContractId = contract.ContractId,
                Title = job.Title,
                Description = contract.ProjectScope,
                TotalBudget = contract.FinalPrice,
                Status = ProjectStatusPendingEscrow,
                StartDate = null,
                EndDate = null,
                EscrowLockDeadlineAt = escrowDeadline,
                EscrowLockedAt = null,
                EscrowExpiredAt = null,
                CreatedAt = now
            };

            _context.Projects.Add(project);

            return project;
        }

        private static void ValidateUpdateDraftRequest(UpdateContractDraftRequest request)
        {
            if (request == null)
            {
                throw new InvalidOperationException("Update contract draft request is required.");
            }

            if (string.IsNullOrWhiteSpace(request.ProjectScope))
            {
                throw new InvalidOperationException("Project scope is required.");
            }

            if (request.FinalPrice <= 0)
            {
                throw new InvalidOperationException("Final price must be greater than 0.");
            }

            if (request.FinalTimelineDays <= 0)
            {
                throw new InvalidOperationException("Timeline must be greater than 0 days.");
            }

            if (string.IsNullOrWhiteSpace(request.Deliverables))
            {
                throw new InvalidOperationException("Deliverables are required.");
            }

            if (string.IsNullOrWhiteSpace(request.AcceptanceCriteria))
            {
                throw new InvalidOperationException("Acceptance criteria are required.");
            }

            if (string.IsNullOrWhiteSpace(request.PaymentTerms))
            {
                throw new InvalidOperationException("Payment terms are required.");
            }

            if (!string.IsNullOrWhiteSpace(request.ChatSummary) &&
                request.ChatSummary.Trim().Length > 4000)
            {
                throw new InvalidOperationException("Chat summary cannot exceed 4000 characters.");
            }
        }

        private static void ValidateCreateRequest(CreateContractRequest request)
        {
            if (request == null)
            {
                throw new InvalidOperationException("Contract request is required.");
            }

            if (request.ProposalId <= 0)
            {
                throw new InvalidOperationException("ProposalId is required.");
            }

            if (string.IsNullOrWhiteSpace(request.ProjectScope))
            {
                throw new InvalidOperationException("Project scope is required.");
            }

            if (request.FinalPrice <= 0)
            {
                throw new InvalidOperationException("Final price must be greater than 0.");
            }

            if (request.FinalTimelineDays <= 0)
            {
                throw new InvalidOperationException("Timeline must be greater than 0 days.");
            }

            if (string.IsNullOrWhiteSpace(request.Deliverables))
            {
                throw new InvalidOperationException("Deliverables are required.");
            }

            if (string.IsNullOrWhiteSpace(request.AcceptanceCriteria))
            {
                throw new InvalidOperationException("Acceptance criteria are required.");
            }

            if (string.IsNullOrWhiteSpace(request.PaymentTerms))
            {
                throw new InvalidOperationException("Payment terms are required.");
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

        private static void EnsureUserBelongsToProposal(
            int userId,
            ClientProfile clientProfile,
            ExpertProfile expertProfile)
        {
            if (clientProfile.UserId == userId)
            {
                return;
            }

            if (expertProfile.UserId == userId)
            {
                return;
            }

            throw new UnauthorizedAccessException("Only the proposal Client or Expert can perform this action.");
        }

        private async Task<bool> CanAccessContractAsync(
            int userId,
            ProjectContract contract)
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

            var clientProfile = await GetClientProfileByIdAsync(contract.ClientId);

            if (clientProfile.UserId == userId)
            {
                return true;
            }

            var expertProfile = await GetExpertProfileByIdAsync(contract.ExpertId);

            return expertProfile.UserId == userId;
        }

        private async Task NotifyContractDraftCreatedAsync(
            int actorUserId,
            ProjectContract contract,
            JobPosting job,
            ClientProfile clientProfile,
            ExpertProfile expertProfile)
        {
            if (actorUserId == clientProfile.UserId)
            {
                await _notificationService.CreateNotificationAsync(
                    expertProfile.UserId,
                    "Contract draft created",
                    $"A contract draft was created for job: {job.Title}. Please review it.",
                    "CONTRACT_DRAFT_CREATED",
                    relatedEntityType: "CONTRACT",
                    relatedEntityId: contract.ContractId,
                    relatedJobId: job.JobPostingId,
                    relatedProposalId: contract.ProposalId,
                    relatedContractId: contract.ContractId);

                return;
            }

            if (actorUserId == expertProfile.UserId)
            {
                await _notificationService.CreateNotificationAsync(
                    clientProfile.UserId,
                    "Contract draft created",
                    $"A contract draft was created for job: {job.Title}. Please review it.",
                    "CONTRACT_DRAFT_CREATED",
                    relatedEntityType: "CONTRACT",
                    relatedEntityId: contract.ContractId,
                    relatedJobId: job.JobPostingId,
                    relatedProposalId: contract.ProposalId,
                    relatedContractId: contract.ContractId);
            }
        }

        private async Task<ProjectContract> GetContractByIdInternalAsync(int contractId)
        {
            var contract = await _context.ProjectContracts
                .FirstOrDefaultAsync(x => x.ContractId == contractId);

            if (contract == null)
            {
                throw new InvalidOperationException("Contract not found.");
            }

            return contract;
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

        private async Task<ProjectContractResponse> MapToContractResponseAsync(ProjectContract contract)
        {
            var proposal = await _context.Proposals
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ProposalId == contract.ProposalId);

            if (proposal == null)
            {
                throw new InvalidOperationException("Proposal not found.");
            }

            var job = await _context.JobPostings
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.JobPostingId == proposal.JobId);

            if (job == null)
            {
                throw new InvalidOperationException("Job posting not found.");
            }

            var clientProfile = await _context.ClientProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ClientProfileId == contract.ClientId);

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
                .FirstOrDefaultAsync(x => x.ExpertProfileId == contract.ExpertId);

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

            var project = await _context.Projects
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ContractId == contract.ContractId);

            return new ProjectContractResponse
            {
                ContractId = contract.ContractId,
                ProposalId = contract.ProposalId,
                SourceProposalVersionNumber = contract.SourceProposalVersionNumber,
                JobId = job.JobPostingId,
                JobTitle = job.Title,

                ClientProfileId = clientProfile.ClientProfileId,
                ClientUserId = clientProfile.UserId,
                ClientName = clientUser.FullName,

                ExpertProfileId = expertProfile.ExpertProfileId,
                ExpertUserId = expertProfile.UserId,
                ExpertName = expertUser.FullName,

                ProjectScope = contract.ProjectScope,
                FinalPrice = contract.FinalPrice,
                PlatformFeeRate = contract.PlatformFeeRate,
                PlatformFeeAmount = contract.PlatformFeeAmount,
                TotalClientPayment = contract.TotalClientPayment,
                ExpertReceivableAmount = contract.FinalPrice,
                FinalTimelineDays = contract.FinalTimelineDays,
                Deliverables = contract.Deliverables,
                AcceptanceCriteria = contract.AcceptanceCriteria,
                PaymentTerms = contract.PaymentTerms,

                ContractSource = contract.ContractSource,
                ChatSummary = contract.ChatSummary,
                ClientConfirmed = contract.ClientConfirmed,
                ExpertConfirmed = contract.ExpertConfirmed,
                Status = contract.Status,

                ProjectId = project?.ProjectId,
                ProjectStatus = project?.Status,
                ProjectEscrowLockDeadlineAt = project?.EscrowLockDeadlineAt,
                ProjectEscrowLockedAt = project?.EscrowLockedAt,
                ProjectEscrowExpiredAt = project?.EscrowExpiredAt,

                CreatedAt = contract.CreatedAt,
                ConfirmedAt = contract.ConfirmedAt
            };
        }

        public async Task<IReadOnlyList<ContractMilestoneDraftResponse>> GetContractMilestoneDraftsAsync(
            int userId,
            int contractId)
        {
            var contract = await GetContractByIdInternalAsync(contractId);

            var canAccess = await CanAccessContractAsync(userId, contract);

            if (!canAccess)
            {
                throw new UnauthorizedAccessException("You do not have permission to view this contract milestone draft.");
            }

            var drafts = await _context.ContractMilestoneDrafts
                .AsNoTracking()
                .Where(x => x.ContractId == contractId)
                .OrderBy(x => x.OrderIndex)
                .ToListAsync();

            return MapContractMilestoneDraftResponses(drafts);
        }

        public async Task<IReadOnlyList<ContractMilestoneDraftResponse>> ReplaceContractMilestoneDraftsAsync(
            int userId,
            int contractId,
            ReplaceContractMilestoneDraftsRequest request)
        {
            await Task.CompletedTask;

            throw new InvalidOperationException(
                "Contract milestone editing is disabled. Milestones are generated from the accepted proposal.");
        }

        private static void ValidateReplaceMilestoneDraftsRequest(
            ReplaceContractMilestoneDraftsRequest request,
            decimal contractFinalPrice,
            int contractFinalTimelineDays)
        {
            if (request == null)
            {
                throw new InvalidOperationException("Milestone draft request is required.");
            }

            if (request.Milestones == null || request.Milestones.Count == 0)
            {
                throw new InvalidOperationException("At least one milestone draft is required.");
            }

            if (request.Milestones.Count > 10)
            {
                throw new InvalidOperationException("A contract cannot have more than 10 milestone drafts.");
            }

            var orderIndexes = request.Milestones
                .Select(x => x.OrderIndex)
                .ToList();

            if (orderIndexes.Any(x => x <= 0))
            {
                throw new InvalidOperationException("Milestone order index must be greater than 0.");
            }

            if (orderIndexes.Distinct().Count() != orderIndexes.Count)
            {
                throw new InvalidOperationException("Milestone order indexes must be unique.");
            }

            var expectedOrderIndexes = Enumerable.Range(1, request.Milestones.Count).ToList();

            if (!orderIndexes.OrderBy(x => x).SequenceEqual(expectedOrderIndexes))
            {
                throw new InvalidOperationException("Milestone order indexes must be sequential starting from 1.");
            }

            foreach (var milestone in request.Milestones)
            {
                if (string.IsNullOrWhiteSpace(milestone.Title))
                {
                    throw new InvalidOperationException("Milestone title is required.");
                }

                if (string.IsNullOrWhiteSpace(milestone.Description))
                {
                    throw new InvalidOperationException("Milestone description is required.");
                }

                if (string.IsNullOrWhiteSpace(milestone.ExpectedDeliverable))
                {
                    throw new InvalidOperationException("Milestone expected deliverable is required.");
                }

                if (string.IsNullOrWhiteSpace(milestone.AcceptanceCriteria))
                {
                    throw new InvalidOperationException("Milestone acceptance criteria is required.");
                }

                if (milestone.Amount <= 0)
                {
                    throw new InvalidOperationException("Milestone amount must be greater than 0.");
                }

                if (milestone.DeadlineOffsetDays <= 0)
                {
                    throw new InvalidOperationException("Milestone deadline offset days must be greater than 0.");
                }

                if (milestone.DeadlineOffsetDays > contractFinalTimelineDays)
                {
                    throw new InvalidOperationException("Milestone deadline cannot exceed contract final timeline days.");
                }
            }

            var totalMilestoneAmount = request.Milestones.Sum(x => x.Amount);

            if (totalMilestoneAmount != contractFinalPrice)
            {
                throw new InvalidOperationException("Total milestone amount must equal contract final price.");
            }
        }

        private static List<ContractMilestoneDraftResponse> MapContractMilestoneDraftResponses(
            List<ContractMilestoneDraft> drafts)
        {
            var result = new List<ContractMilestoneDraftResponse>();
            var previousDeadlineOffsetDays = 0;

            foreach (var draft in drafts.OrderBy(x => x.OrderIndex))
            {
                var durationDays = draft.DeadlineOffsetDays - previousDeadlineOffsetDays;

                result.Add(new ContractMilestoneDraftResponse
                {
                    ContractMilestoneDraftId = draft.ContractMilestoneDraftId,
                    ContractId = draft.ContractId,
                    Title = draft.Title,
                    Amount = draft.Amount,
                    DurationDays = durationDays <= 0 ? draft.DeadlineOffsetDays : durationDays,
                    CreatedAt = draft.CreatedAt
                });

                previousDeadlineOffsetDays = draft.DeadlineOffsetDays;
            }

            return result;
        }

        private async Task EnsureContractMilestoneDraftsReadyAsync(ProjectContract contract)
        {
            var drafts = await _context.ContractMilestoneDrafts
                .AsNoTracking()
                .Where(x => x.ContractId == contract.ContractId)
                .OrderBy(x => x.OrderIndex)
                .ToListAsync();

            if (drafts.Count == 0)
            {
                throw new InvalidOperationException("Contract must have at least one milestone draft before final confirmation.");
            }

            var totalAmount = drafts.Sum(x => x.Amount);

            if (totalAmount != contract.FinalPrice)
            {
                throw new InvalidOperationException("Total milestone draft amount must equal contract final price before confirmation.");
            }

            var orderIndexes = drafts.Select(x => x.OrderIndex).ToList();
            var expectedOrderIndexes = Enumerable.Range(1, drafts.Count).ToList();

            if (!orderIndexes.SequenceEqual(expectedOrderIndexes))
            {
                throw new InvalidOperationException("Milestone draft order indexes must be sequential before confirmation.");
            }

            if (drafts.Any(x => x.DeadlineOffsetDays > contract.FinalTimelineDays))
            {
                throw new InvalidOperationException("Milestone draft deadline cannot exceed contract final timeline days.");
            }
        }

        private async Task EnsureProjectMilestonesCreatedFromDraftsAsync(
            ProjectContract contract,
            Project project)
        {
            if (project.ProjectId == 0)
            {
                await _context.SaveChangesAsync();
            }

            var hasExistingMilestones = await _context.Milestones
                .AnyAsync(x => x.ProjectId == project.ProjectId);

            if (hasExistingMilestones)
            {
                return;
            }

            var drafts = await _context.ContractMilestoneDrafts
                .AsNoTracking()
                .Where(x => x.ContractId == contract.ContractId)
                .OrderBy(x => x.OrderIndex)
                .ToListAsync();

            var now = DateTime.UtcNow;
            var previousDeadlineOffsetDays = 0;
            var milestones = new List<Milestone>();

            foreach (var draft in drafts)
            {
                var durationDays = draft.DeadlineOffsetDays - previousDeadlineOffsetDays;

                if (durationDays <= 0)
                {
                    durationDays = Math.Max(1, draft.DeadlineOffsetDays);
                }

                milestones.Add(new Milestone
                {
                    ProjectId = project.ProjectId,
                    Title = draft.Title,
                    Description = draft.Description,
                    ExpectedDeliverable = draft.ExpectedDeliverable,
                    AcceptanceCriteria = draft.AcceptanceCriteria,
                    Amount = draft.Amount,
                    OrderIndex = draft.OrderIndex,
                    DurationDays = durationDays,
                    Deadline = now.AddDays(draft.DeadlineOffsetDays),
                    RevisionUsed = 0,
                    PaymentStatus = "PENDING",
                    Status = "PENDING",
                    CreatedAt = now
                });

                previousDeadlineOffsetDays = draft.DeadlineOffsetDays;
            }

            _context.Milestones.AddRange(milestones);
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
                ResubmitNote = "Initial proposal version generated before contract creation.",
                CreatedByUserId = expertProfile.UserId,
                CreatedAt = proposal.CreatedAt == default
                    ? DateTime.UtcNow
                    : proposal.CreatedAt
            };

            _context.ProposalVersions.Add(baseVersion);

            await _context.SaveChangesAsync();
        }

        private async Task<int> GetLatestProposalVersionNumberAsync(int proposalId)
        {
            var latestVersionNumber = await _context.ProposalVersions
                .Where(x => x.ProposalId == proposalId)
                .Select(x => (int?)x.VersionNumber)
                .MaxAsync();

            return latestVersionNumber ?? 1;
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
                    ExpectedDeliverable = string.Empty,
                    AcceptanceCriteria = string.Empty,
                    Amount = x.Amount,
                    OrderIndex = x.OrderIndex,
                    DeadlineOffsetDays = x.DeadlineOffsetDays,
                    CreatedAt = DateTime.UtcNow
                })
                .ToList();

            _context.ContractMilestoneDrafts.AddRange(contractMilestones);

            await _context.SaveChangesAsync();
        }

        private async Task EnsureContractMilestoneDraftsCopiedFromProposalAsync(
            int proposalId,
            int contractId)
        {
            var hasContractMilestoneDrafts = await _context.ContractMilestoneDrafts
                .AnyAsync(x => x.ContractId == contractId);

            if (hasContractMilestoneDrafts)
            {
                return;
            }

            await CopyLatestProposalMilestonesToContractDraftAsync(
                proposalId,
                contractId);
        }

        private async Task EnsureExpertCanAcceptNewProjectAsync(
            int expertId,
            int expertMaxActiveProjects)
        {
            var activeProjectCount = await _context.Projects
                .CountAsync(project =>
                    project.Contract != null &&
                    project.Contract.ExpertId == expertId &&
                    (
                        project.Status == ProjectStatusPendingEscrow ||
                        project.Status == "ACTIVE" ||
                        project.Status == "DISPUTED"
                    ));

            if (activeProjectCount >= expertMaxActiveProjects)
            {
                throw new InvalidOperationException(
                    $"Expert has reached the maximum limit of {expertMaxActiveProjects} active projects.");
            }
        }

        private async Task EnsureClientWalletCanCoverContractAsync(
            int clientUserId,
            ProjectContract contract)
        {
            var wallet = await _context.Wallets
                .AsNoTracking()
                .FirstOrDefaultAsync(w => w.UserId == clientUserId);

            var availableBalance = wallet?.AvailableBalance ?? 0m;

            if (availableBalance < contract.TotalClientPayment)
            {
                throw new InvalidOperationException(
                    $"Client wallet balance is not enough to sign this contract. Required: {contract.TotalClientPayment:N0} VND, Available: {availableBalance:N0} VND. Please deposit more before signing.");
            }
        }
    }
}