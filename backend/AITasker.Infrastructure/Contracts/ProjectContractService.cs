using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
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
        private const string ContractSourceProposal = "PROPOSAL";

        private const string JobStatusOpen = "OPEN";

        private const string ProjectStatusPendingEscrow = "PENDING_ESCROW";
        private const string ProjectStatusCancelled = "CANCELLED";

        private readonly AITaskerDbContext _context;
        private readonly INotificationService _notificationService;

        public ProjectContractService(
            AITaskerDbContext context,
            INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<ProjectContractResponse> CreateContractFromProposalAsync(
            int userId,
            int proposalId)
        {
            var proposal = await GetProposalByIdAsync(proposalId);
            var job = await GetJobByIdAsync(proposal.JobId);
            var clientProfile = await GetClientProfileByIdAsync(job.ClientProfileId);
            var expertProfile = await GetExpertProfileByIdAsync(proposal.ExpertId);

            EnsureUserBelongsToProposal(userId, clientProfile, expertProfile);

            if (!string.Equals(proposal.Status, ProposalStatusAccepted, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Only ACCEPTED proposals can create contract draft.");
            }

            var existingContract = await _context.ProjectContracts
                .FirstOrDefaultAsync(x => x.ProposalId == proposal.ProposalId);

            if (existingContract != null)
            {
                return await MapToContractResponseAsync(existingContract);
            }

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
                2,
                "Milestone based escrow simulation.",
                ContractSourceProposal,
                null);

            _context.ProjectContracts.Add(contract);
            await _context.SaveChangesAsync();

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
            ValidateCreateRequest(request);

            var proposal = await GetProposalByIdAsync(request.ProposalId);
            var job = await GetJobByIdAsync(proposal.JobId);
            var clientProfile = await GetClientProfileByIdAsync(job.ClientProfileId);
            var expertProfile = await GetExpertProfileByIdAsync(proposal.ExpertId);

            EnsureUserBelongsToProposal(userId, clientProfile, expertProfile);

            if (!string.Equals(proposal.Status, ProposalStatusAccepted, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Only ACCEPTED proposals can create contract draft.");
            }

            var existingContract = await _context.ProjectContracts
                .FirstOrDefaultAsync(x => x.ProposalId == request.ProposalId);

            if (existingContract != null)
            {
                throw new InvalidOperationException("Contract already exists for this proposal.");
            }

            var contract = BuildContract(
                proposal,
                job,
                clientProfile,
                request.ProjectScope.Trim(),
                request.FinalPrice,
                request.FinalTimelineDays,
                request.Deliverables.Trim(),
                request.AcceptanceCriteria.Trim(),
                request.RevisionLimit,
                request.PaymentTerms.Trim(),
                ContractSourceProposal,
                string.IsNullOrWhiteSpace(request.PaymentTerms)
                    ? null
                    : "Contract draft created from accepted proposal and editable contract template.");

            _context.ProjectContracts.Add(contract);
            await _context.SaveChangesAsync();

            await NotifyContractDraftCreatedAsync(
                userId,
                contract,
                job,
                clientProfile,
                expertProfile);

            return await MapToContractResponseAsync(contract);
        }

        public async Task<ProjectContractResponse> UpdateContractDraftAsync(
            int userId,
            int contractId,
            UpdateContractDraftRequest request)
        {
            ValidateUpdateDraftRequest(request);

            var contract = await GetContractByIdInternalAsync(contractId);

            if (!string.Equals(contract.Status, ContractStatusDraft, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Only DRAFT contracts can be updated.");
            }

            var proposal = await GetProposalByIdAsync(contract.ProposalId);
            var job = await GetJobByIdAsync(proposal.JobId);
            var clientProfile = await GetClientProfileByIdAsync(contract.ClientId);
            var expertProfile = await GetExpertProfileByIdAsync(contract.ExpertId);

            EnsureUserBelongsToProposal(userId, clientProfile, expertProfile);

            var oldProjectScope = contract.ProjectScope;
            var oldFinalPrice = contract.FinalPrice;
            var oldFinalTimelineDays = contract.FinalTimelineDays;
            var oldDeliverables = contract.Deliverables;
            var oldAcceptanceCriteria = contract.AcceptanceCriteria;
            var oldRevisionLimit = contract.RevisionLimit;
            var oldPaymentTerms = contract.PaymentTerms;
            var oldChatSummary = contract.ChatSummary;

            var platformFeeRate = ResolvePlatformFeeRate(clientProfile);
            var platformFeeAmount = request.FinalPrice * platformFeeRate / 100m;
            var totalClientPayment = request.FinalPrice + platformFeeAmount;

            contract.ProjectScope = request.ProjectScope.Trim();
            contract.FinalPrice = request.FinalPrice;
            contract.PlatformFeeRate = platformFeeRate;
            contract.PlatformFeeAmount = platformFeeAmount;
            contract.TotalClientPayment = totalClientPayment;
            contract.FinalTimelineDays = request.FinalTimelineDays;
            contract.Deliverables = request.Deliverables.Trim();
            contract.AcceptanceCriteria = request.AcceptanceCriteria.Trim();
            contract.RevisionLimit = request.RevisionLimit;
            contract.PaymentTerms = request.PaymentTerms.Trim();
            contract.ChatSummary = string.IsNullOrWhiteSpace(request.ChatSummary)
                ? null
                : request.ChatSummary.Trim();

            var changed =
                oldProjectScope != contract.ProjectScope ||
                oldFinalPrice != contract.FinalPrice ||
                oldFinalTimelineDays != contract.FinalTimelineDays ||
                oldDeliverables != contract.Deliverables ||
                oldAcceptanceCriteria != contract.AcceptanceCriteria ||
                oldRevisionLimit != contract.RevisionLimit ||
                oldPaymentTerms != contract.PaymentTerms ||
                oldChatSummary != contract.ChatSummary;

            if (changed)
            {
                contract.ClientConfirmed = false;
                contract.ExpertConfirmed = false;
                contract.ConfirmedAt = null;

                if (userId == clientProfile.UserId)
                {
                    await _notificationService.CreateNotificationAsync(
                        expertProfile.UserId,
                        "Contract draft updated",
                        $"The client updated the contract draft for job: {job.Title}. Please review and confirm again.",
                        "CONTRACT_DRAFT_UPDATED");
                }
                else if (userId == expertProfile.UserId)
                {
                    await _notificationService.CreateNotificationAsync(
                        clientProfile.UserId,
                        "Contract draft updated",
                        $"The expert updated the contract draft for job: {job.Title}. Please review and confirm again.",
                        "CONTRACT_DRAFT_UPDATED");
                }
            }

            await _context.SaveChangesAsync();

            return await MapToContractResponseAsync(contract);
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

            if (!string.Equals(contract.Status, ContractStatusDraft, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Only DRAFT contracts can be confirmed.");
            }

            var proposal = await GetProposalByIdAsync(contract.ProposalId);
            var job = await GetJobByIdAsync(proposal.JobId);
            var clientProfile = await GetClientProfileByIdAsync(contract.ClientId);
            var expertProfile = await GetExpertProfileByIdAsync(contract.ExpertId);

            var userIsClient = clientProfile.UserId == userId;
            var userIsExpert = expertProfile.UserId == userId;

            if (!userIsClient && !userIsExpert)
            {
                throw new UnauthorizedAccessException("Only the contract Client or Expert can confirm this contract.");
            }

            if (userIsClient)
            {
                if (!contract.ClientConfirmed)
                {
                    contract.ClientConfirmed = true;

                    await _notificationService.CreateNotificationAsync(
                        expertProfile.UserId,
                        "Contract confirmed by Client",
                        $"The client confirmed the contract for job: {job.Title}. Please review and confirm.",
                        "CONTRACT_CONFIRMED_BY_CLIENT");
                }
            }

            if (userIsExpert)
            {
                if (!contract.ExpertConfirmed)
                {
                    contract.ExpertConfirmed = true;

                    await _notificationService.CreateNotificationAsync(
                        clientProfile.UserId,
                        "Contract confirmed by Expert",
                        $"The expert confirmed the contract for job: {job.Title}. Please review and confirm.",
                        "CONTRACT_CONFIRMED_BY_EXPERT");
                }
            }

            if (contract.ClientConfirmed && contract.ExpertConfirmed)
            {
                await EnsureContractMilestoneDraftsReadyAsync(contract);

                contract.Status = ContractStatusConfirmed;
                contract.ConfirmedAt = DateTime.UtcNow;

                var project = await EnsurePendingEscrowProjectExistsAsync(
                    contract,
                    job);

                await EnsureProjectMilestonesCreatedFromDraftsAsync(
                    contract,
                    project);

                await _notificationService.CreateNotificationAsync(
                    clientProfile.UserId,
                    "Contract fully confirmed",
                    $"The contract for job '{job.Title}' is fully confirmed. Please confirm escrow to start the project.",
                    "CONTRACT_CONFIRMED");

                await _notificationService.CreateNotificationAsync(
                    expertProfile.UserId,
                    "Contract fully confirmed",
                    $"The contract for job '{job.Title}' is fully confirmed. Waiting for Client escrow confirmation.",
                    "CONTRACT_CONFIRMED");

                await _notificationService.CreateNotificationAsync(
                    clientProfile.UserId,
                    "Escrow request created",
                    $"Please lock {contract.TotalClientPayment} in simulated escrow for project: {project.Title}.",
                    "ESCROW_REQUEST_CREATED");
            }

            await _context.SaveChangesAsync();

            return await MapToContractResponseAsync(contract);
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
                    "CONTRACT_CANCELLED");
            }
            else
            {
                await _notificationService.CreateNotificationAsync(
                    clientProfile.UserId,
                    "Contract cancelled by Expert",
                    $"The expert cancelled the contract for job '{job.Title}'. Reason: {reason}",
                    "CONTRACT_CANCELLED");
            }

            return await MapToContractResponseAsync(contract);
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
            int revisionLimit,
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
                RevisionLimit = revisionLimit,
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
            JobPosting job)
        {
            var existingProject = await _context.Projects
                .FirstOrDefaultAsync(x => x.ContractId == contract.ContractId);

            if (existingProject != null)
            {
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
                CreatedAt = DateTime.UtcNow
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

            if (request.RevisionLimit < 0)
            {
                throw new InvalidOperationException("Revision limit cannot be negative.");
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

            if (request.RevisionLimit < 0)
            {
                throw new InvalidOperationException("Revision limit cannot be negative.");
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
                    "CONTRACT_DRAFT_CREATED");

                return;
            }

            if (actorUserId == expertProfile.UserId)
            {
                await _notificationService.CreateNotificationAsync(
                    clientProfile.UserId,
                    "Contract draft created",
                    $"A contract draft was created for job: {job.Title}. Please review it.",
                    "CONTRACT_DRAFT_CREATED");
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
                RevisionLimit = contract.RevisionLimit,
                PaymentTerms = contract.PaymentTerms,

                ContractSource = contract.ContractSource,
                ChatSummary = contract.ChatSummary,
                ClientConfirmed = contract.ClientConfirmed,
                ExpertConfirmed = contract.ExpertConfirmed,
                Status = contract.Status,

                ProjectId = project?.ProjectId,
                ProjectStatus = project?.Status,

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

            return drafts
                .Select(MapContractMilestoneDraftResponse)
                .ToList();
        }

        public async Task<IReadOnlyList<ContractMilestoneDraftResponse>> ReplaceContractMilestoneDraftsAsync(
            int userId,
            int contractId,
            ReplaceContractMilestoneDraftsRequest request)
        {
            var contract = await GetContractByIdInternalAsync(contractId);

            if (!string.Equals(contract.Status, ContractStatusDraft, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Only DRAFT contracts can update milestone drafts.");
            }

            var proposal = await GetProposalByIdAsync(contract.ProposalId);
            var job = await GetJobByIdAsync(proposal.JobId);
            var clientProfile = await GetClientProfileByIdAsync(contract.ClientId);
            var expertProfile = await GetExpertProfileByIdAsync(contract.ExpertId);

            EnsureUserBelongsToProposal(userId, clientProfile, expertProfile);

            ValidateReplaceMilestoneDraftsRequest(request, contract.FinalPrice, contract.FinalTimelineDays);

            var oldDrafts = await _context.ContractMilestoneDrafts
                .Where(x => x.ContractId == contractId)
                .ToListAsync();

            _context.ContractMilestoneDrafts.RemoveRange(oldDrafts);

            var newDrafts = request.Milestones
                .OrderBy(x => x.OrderIndex)
                .Select(x => new ContractMilestoneDraft
                {
                    ContractId = contractId,
                    Title = x.Title.Trim(),
                    Description = x.Description.Trim(),
                    ExpectedDeliverable = x.ExpectedDeliverable.Trim(),
                    AcceptanceCriteria = x.AcceptanceCriteria.Trim(),
                    Amount = x.Amount,
                    OrderIndex = x.OrderIndex,
                    DeadlineOffsetDays = x.DeadlineOffsetDays,
                    RevisionLimit = x.RevisionLimit,
                    CreatedAt = DateTime.UtcNow
                })
                .ToList();

            _context.ContractMilestoneDrafts.AddRange(newDrafts);

            contract.ClientConfirmed = false;
            contract.ExpertConfirmed = false;
            contract.ConfirmedAt = null;

            if (userId == clientProfile.UserId)
            {
                await _notificationService.CreateNotificationAsync(
                    expertProfile.UserId,
                    "Contract milestone draft updated",
                    $"The client updated milestone drafts for job: {job.Title}. Please review and confirm again.",
                    "CONTRACT_MILESTONE_DRAFT_UPDATED");
            }
            else if (userId == expertProfile.UserId)
            {
                await _notificationService.CreateNotificationAsync(
                    clientProfile.UserId,
                    "Contract milestone draft updated",
                    $"The expert updated milestone drafts for job: {job.Title}. Please review and confirm again.",
                    "CONTRACT_MILESTONE_DRAFT_UPDATED");
            }

            await _context.SaveChangesAsync();

            return newDrafts
                .OrderBy(x => x.OrderIndex)
                .Select(MapContractMilestoneDraftResponse)
                .ToList();
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

            if (request.Milestones.Count > 20)
            {
                throw new InvalidOperationException("A contract cannot have more than 20 milestone drafts.");
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

                if (milestone.RevisionLimit < 0)
                {
                    throw new InvalidOperationException("Milestone revision limit cannot be negative.");
                }
            }

            var totalMilestoneAmount = request.Milestones.Sum(x => x.Amount);

            if (totalMilestoneAmount != contractFinalPrice)
            {
                throw new InvalidOperationException("Total milestone amount must equal contract final price.");
            }
        }

        private static ContractMilestoneDraftResponse MapContractMilestoneDraftResponse(
            ContractMilestoneDraft draft)
        {
            return new ContractMilestoneDraftResponse
            {
                ContractMilestoneDraftId = draft.ContractMilestoneDraftId,
                ContractId = draft.ContractId,
                Title = draft.Title,
                Description = draft.Description,
                ExpectedDeliverable = draft.ExpectedDeliverable,
                AcceptanceCriteria = draft.AcceptanceCriteria,
                Amount = draft.Amount,
                OrderIndex = draft.OrderIndex,
                DeadlineOffsetDays = draft.DeadlineOffsetDays,
                RevisionLimit = draft.RevisionLimit,
                CreatedAt = draft.CreatedAt
            };
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

            var baseDate = DateTime.UtcNow;

            var milestones = drafts.Select(draft => new Milestone
            {
                ProjectId = project.ProjectId,
                Title = draft.Title,
                Description = draft.Description,
                ExpectedDeliverable = draft.ExpectedDeliverable,
                AcceptanceCriteria = draft.AcceptanceCriteria,
                Amount = draft.Amount,
                OrderIndex = draft.OrderIndex,
                Deadline = baseDate.AddDays(draft.DeadlineOffsetDays),
                RevisionLimit = draft.RevisionLimit,
                RevisionUsed = 0,
                PaymentStatus = "PENDING",
                Status = "PENDING",
                CreatedAt = DateTime.UtcNow
            }).ToList();

            _context.Milestones.AddRange(milestones);
        }
    }
}