using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Projects
{
    public class ProjectService : IProjectService
    {
        private const string ProjectStatusActive = "ACTIVE";
        private const string ProjectStatusDisputed = "DISPUTED";
        private const string ProjectStatusCancelled = "CANCELLED";
        private const string ContractStatusCancelled = "CANCELLED";
        private const string JobStatusActive = "ACTIVE";
        private const string JobStatusCancelled = "CANCELLED";
        private const string DisputeStatusOpen = "OPEN";
        private const string DisputeStatusResolved = "RESOLVED";
        private const string ResolutionReleaseToExpert = "RELEASE_TO_EXPERT";
        private const string EscrowStatusLocked = "LOCKED";
        private const string EscrowStatusFrozen = "FROZEN";
        private const string EscrowStatusRefunded = "REFUNDED";
        private const string MilestoneStatusCancelled = "CANCELLED";
        private const string PaymentStatusRefunded = "REFUNDED";
        private const string TransactionStatusSuccess = "SUCCESS";
        private const string TxRefund = "REFUND";

        private readonly AITaskerDbContext _context;
        private readonly IProjectCompletionService _projectCompletionService;
        private readonly IWalletService _walletService;
        private readonly IExpertEarningEscrowService _expertEarningEscrowService;
        private readonly INotificationService _notificationService;

        public ProjectService(
            AITaskerDbContext context,
            IProjectCompletionService projectCompletionService,
            IWalletService walletService,
            IExpertEarningEscrowService expertEarningEscrowService,
            INotificationService notificationService)
        {
            _context = context;
            _projectCompletionService = projectCompletionService;
            _walletService = walletService;
            _expertEarningEscrowService = expertEarningEscrowService;
            _notificationService = notificationService;
        }

        public async Task<IReadOnlyList<ProjectResponse>> GetMyProjectsAsync(
            int currentUserId)
        {
            var user = await GetUserByIdAsync(currentUserId);

            List<Project> projects;

            if (string.Equals(user.Role, "ADMIN", StringComparison.OrdinalIgnoreCase))
            {
                projects = await _context.Projects
                    .AsNoTracking()
                    .OrderByDescending(x => x.CreatedAt)
                    .ToListAsync();
            }
            else
            {
                projects = await (
                    from project in _context.Projects.AsNoTracking()
                    join contract in _context.ProjectContracts.AsNoTracking()
                        on project.ContractId equals contract.ContractId
                    join clientProfile in _context.ClientProfiles.AsNoTracking()
                        on contract.ClientId equals clientProfile.ClientProfileId
                    join expertProfile in _context.ExpertProfiles.AsNoTracking()
                        on contract.ExpertId equals expertProfile.ExpertProfileId
                    where clientProfile.UserId == currentUserId ||
                          expertProfile.UserId == currentUserId
                    orderby project.CreatedAt descending
                    select project
                ).ToListAsync();
            }

            var responses = new List<ProjectResponse>();

            foreach (var project in projects)
            {
                responses.Add(await MapToProjectResponseAsync(project));
            }

            return responses;
        }

        public async Task<ProjectResponse> GetProjectByIdAsync(
            int currentUserId,
            int projectId)
        {
            var project = await GetProjectByIdInternalAsync(projectId);

            var canAccess = await CanAccessProjectAsync(currentUserId, project);

            if (!canAccess)
            {
                throw new UnauthorizedAccessException("You do not have permission to view this project.");
            }

            return await MapToProjectResponseAsync(project);
        }

        public async Task<IReadOnlyList<MilestoneResponse>> GetProjectMilestonesAsync(
            int currentUserId,
            int projectId)
        {
            var project = await GetProjectByIdInternalAsync(projectId);

            var canAccess = await CanAccessProjectAsync(currentUserId, project);

            if (!canAccess)
            {
                throw new UnauthorizedAccessException("You do not have permission to view this project's milestones.");
            }

            var milestones = await _context.Milestones
                .AsNoTracking()
                .Where(x => x.ProjectId == projectId)
                .OrderBy(x => x.OrderIndex)
                .ThenBy(x => x.MilestoneId)
                .ToListAsync();

            return milestones
                .Select(x => MapToMilestoneResponse(x, project))
                .ToList();
        }

        public async Task<MilestoneResponse> GetMilestoneByIdAsync(
            int currentUserId,
            int milestoneId)
        {
            var milestone = await GetMilestoneByIdInternalAsync(milestoneId);
            var project = await GetProjectByIdInternalAsync(milestone.ProjectId);

            var canAccess = await CanAccessProjectAsync(currentUserId, project);

            if (!canAccess)
            {
                throw new UnauthorizedAccessException("You do not have permission to view this milestone.");
            }

            return MapToMilestoneResponse(milestone, project);
        }

        public async Task<ProjectResponse> CompleteProjectCheckAsync(
            int currentUserId,
            int projectId)
        {
            var project = await GetProjectByIdInternalAsync(projectId);

            var canAccess = await CanAccessProjectAsync(currentUserId, project);

            if (!canAccess)
            {
                throw new UnauthorizedAccessException("You do not have permission to complete this project.");
            }

            await _projectCompletionService.TryCompleteProjectAsync(
                project.ProjectId,
                throwIfNotReady: true);

            return await MapToProjectResponseAsync(project);
        }

        public async Task<ProjectResponse> ContinueAfterDisputeAsync(
            int currentUserId,
            int projectId)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();
            var transactionCompleted = false;

            try
            {
                var project = await GetProjectByIdInternalAsync(projectId);
                var contract = await GetContractByIdAsync(project.ContractId);
                var clientProfile = await GetClientProfileByIdAsync(contract.ClientId);

                if (clientProfile.UserId != currentUserId)
                {
                    throw new UnauthorizedAccessException("Only the project Client can continue after dispute resolution.");
                }

                if (!string.Equals(project.Status, ProjectStatusDisputed, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException("Project must be waiting after a resolved dispute before it can continue.");
                }

                if (await _context.Disputes.AnyAsync(x =>
                    x.ProjectId == projectId &&
                    x.Status == DisputeStatusOpen))
                {
                    throw new InvalidOperationException("Resolve all open disputes before continuing the project.");
                }

                var dispute = await GetPendingPostResolutionDecisionAsync(projectId);

                var remainingLockedEscrowExists = await _context.Escrows.AnyAsync(x =>
                    x.ProjectId == projectId &&
                    (x.Status == EscrowStatusLocked || x.Status == EscrowStatusFrozen));

                if (!remainingLockedEscrowExists)
                {
                    throw new InvalidOperationException(
                        "No remaining locked project escrow is available. End the contract instead.");
                }

                var now = DateTime.UtcNow;
                dispute.PostResolutionDecision = "CONTINUE";
                dispute.PostResolutionDecisionAt = now;
                dispute.PostResolutionDecisionByUserId = currentUserId;
                project.Status = ProjectStatusActive;
                project.EndDate = null;

                var proposal = await GetProposalByIdAsync(contract.ProposalId);
                var job = await GetJobByIdAsync(proposal.JobId);
                job.Status = JobStatusActive;
                job.UpdatedAt = now;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                transactionCompleted = true;

                var expertProfile = await GetExpertProfileByIdAsync(contract.ExpertId);

                await _notificationService.CreateNotificationAsync(
                    expertProfile.UserId,
                    "Project continued",
                    $"The client chose to continue project '{project.Title}'. The remaining project escrow stays locked and work may continue.",
                    "PROJECT_CONTINUED_AFTER_DISPUTE",
                    relatedEntityType: "PROJECT",
                    relatedEntityId: project.ProjectId,
                    relatedProjectId: project.ProjectId,
                    relatedDisputeId: dispute.DisputeId);

                return await MapToProjectResponseAsync(project);
            }
            catch
            {
                if (!transactionCompleted)
                {
                    await transaction.RollbackAsync();
                }

                throw;
            }
        }

        public async Task<ProjectResponse> EndAfterDisputeAsync(
            int currentUserId,
            int projectId)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();
            var transactionCompleted = false;

            try
            {
                var project = await GetProjectByIdInternalAsync(projectId);
                var contract = await GetContractByIdAsync(project.ContractId);
                var clientProfile = await GetClientProfileByIdAsync(contract.ClientId);
                var expertProfile = await GetExpertProfileByIdAsync(contract.ExpertId);

                if (clientProfile.UserId != currentUserId)
                {
                    throw new UnauthorizedAccessException("Only the project Client can end the contract after dispute resolution.");
                }

                if (!string.Equals(project.Status, ProjectStatusDisputed, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException("Project must be waiting after a resolved dispute before it can be ended here.");
                }

                if (await _context.Disputes.AnyAsync(x =>
                    x.ProjectId == projectId &&
                    x.Status == DisputeStatusOpen))
                {
                    throw new InvalidOperationException("Resolve all open disputes before ending the project.");
                }

                var dispute = await GetPendingPostResolutionDecisionAsync(projectId);
                var now = DateTime.UtcNow;

                var clientWallet = await _walletService.GetWalletByUserIdAsync(clientProfile.UserId);
                var remainingEscrows = await _context.Escrows
                    .Where(x =>
                        x.ProjectId == projectId &&
                        (x.Status == EscrowStatusLocked || x.Status == EscrowStatusFrozen))
                    .ToListAsync();
                var refundAmount = remainingEscrows.Sum(x => x.Amount);

                if (refundAmount > 0)
                {
                    if (clientWallet.LockedBalance < refundAmount)
                    {
                        throw new InvalidOperationException("Client locked balance is insufficient to refund remaining milestone escrow.");
                    }

                    clientWallet.LockedBalance -= refundAmount;
                    clientWallet.AvailableBalance += refundAmount;
                    clientWallet.UpdatedAt = now;
                }

                foreach (var escrow in remainingEscrows)
                {
                    escrow.Status = EscrowStatusRefunded;
                    escrow.UpdatedAt = now;

                    if (escrow.MilestoneId.HasValue)
                    {
                        var milestone = await GetMilestoneByIdInternalAsync(escrow.MilestoneId.Value);
                        milestone.Status = MilestoneStatusCancelled;
                        milestone.PaymentStatus = PaymentStatusRefunded;
                    }

                    _context.Transactions.Add(new Transaction
                    {
                        UserId = clientProfile.UserId,
                        ProjectId = projectId,
                        MilestoneId = escrow.MilestoneId,
                        EscrowId = escrow.EscrowId,
                        Amount = escrow.Amount,
                        Type = TxRefund,
                        Status = TransactionStatusSuccess,
                        Description = $"[End After Dispute] Refunded unused milestone escrow for Project ID {projectId}",
                        ReferenceId = escrow.MilestoneId.HasValue
                            ? $"MILESTONE_{escrow.MilestoneId.Value}"
                            : $"PROJECT_{projectId}",
                        CreatedAt = now
                    });
                }

                await _expertEarningEscrowService.ReleaseProjectPendingEarningsAsync(
                    project,
                    expertProfile);

                dispute.PostResolutionDecision = "END";
                dispute.PostResolutionDecisionAt = now;
                dispute.PostResolutionDecisionByUserId = currentUserId;
                project.Status = ProjectStatusCancelled;
                project.EndDate = now;
                contract.Status = ContractStatusCancelled;
                contract.CancelledReason = "CLIENT_END_AFTER_DISPUTE";

                var proposal = await GetProposalByIdAsync(contract.ProposalId);
                var job = await GetJobByIdAsync(proposal.JobId);
                job.Status = JobStatusCancelled;
                job.UpdatedAt = now;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                transactionCompleted = true;

                await _notificationService.CreateNotificationAsync(
                    expertProfile.UserId,
                    "Contract ended",
                    $"The client ended project '{project.Title}' after dispute resolution. Future milestones were cancelled and unused escrow was refunded.",
                    "PROJECT_ENDED_AFTER_DISPUTE",
                    relatedEntityType: "PROJECT",
                    relatedEntityId: project.ProjectId,
                    relatedProjectId: project.ProjectId,
                    relatedDisputeId: dispute.DisputeId);

                return await MapToProjectResponseAsync(project);
            }
            catch
            {
                if (!transactionCompleted)
                {
                    await transaction.RollbackAsync();
                }

                throw;
            }
        }

        private async Task<Dispute> GetPendingPostResolutionDecisionAsync(int projectId)
        {
            var dispute = await _context.Disputes
                .Where(x =>
                    x.ProjectId == projectId &&
                    x.Status == DisputeStatusResolved &&
                    x.ResolutionType == ResolutionReleaseToExpert &&
                    x.PostResolutionDecision == null)
                .OrderByDescending(x => x.ResolvedAt)
                .ThenByDescending(x => x.DisputeId)
                .FirstOrDefaultAsync();

            if (dispute == null)
            {
                throw new InvalidOperationException("No resolved RELEASE_TO_EXPERT dispute is waiting for the Client's decision.");
            }

            return dispute;
        }

        private async Task<bool> CanAccessProjectAsync(
            int currentUserId,
            Project project)
        {
            var user = await GetUserByIdAsync(currentUserId);

            if (string.Equals(user.Role, "ADMIN", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            var contract = await GetContractByIdAsync(project.ContractId);
            var clientProfile = await GetClientProfileByIdAsync(contract.ClientId);
            var expertProfile = await GetExpertProfileByIdAsync(contract.ExpertId);

            return clientProfile.UserId == currentUserId ||
                   expertProfile.UserId == currentUserId;
        }

        private async Task<User> GetUserByIdAsync(int userId)
        {
            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId);

            if (user == null)
            {
                throw new InvalidOperationException("User not found.");
            }

            return user;
        }

        private async Task<Project> GetProjectByIdInternalAsync(int projectId)
        {
            var project = await _context.Projects
                .FirstOrDefaultAsync(x => x.ProjectId == projectId);

            if (project == null)
            {
                throw new InvalidOperationException("Project not found.");
            }

            return project;
        }

        private async Task<Milestone> GetMilestoneByIdInternalAsync(int milestoneId)
        {
            var milestone = await _context.Milestones
                .FirstOrDefaultAsync(x => x.MilestoneId == milestoneId);

            if (milestone == null)
            {
                throw new InvalidOperationException("Milestone not found.");
            }

            return milestone;
        }

        private async Task<ProjectContract> GetContractByIdAsync(int contractId)
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

        private async Task<ProjectResponse> MapToProjectResponseAsync(Project project)
        {
            var contract = await GetContractByIdAsync(project.ContractId);
            var proposal = await GetProposalByIdAsync(contract.ProposalId);
            var job = await GetJobByIdAsync(proposal.JobId);

            var clientProfile = await GetClientProfileByIdAsync(contract.ClientId);
            var expertProfile = await GetExpertProfileByIdAsync(contract.ExpertId);

            var clientUser = await GetUserByIdAsync(clientProfile.UserId);
            var expertUser = await GetUserByIdAsync(expertProfile.UserId);

            var milestones = await _context.Milestones
                .AsNoTracking()
                .Where(x => x.ProjectId == project.ProjectId)
                .OrderBy(x => x.OrderIndex)
                .ThenBy(x => x.MilestoneId)
                .ToListAsync();

            var milestoneResponses = milestones
                .Select(x => MapToMilestoneResponse(x, project))
                .ToList();

            var milestoneTotalAmount = milestones.Sum(x => x.Amount);

            return new ProjectResponse
            {
                ProjectId = project.ProjectId,
                ContractId = project.ContractId,
                ProposalId = proposal.ProposalId,
                JobId = job.JobPostingId,
                JobTitle = job.Title,

                ClientProfileId = clientProfile.ClientProfileId,
                ClientUserId = clientProfile.UserId,
                ClientName = clientUser.FullName,
                ClientAvatarUrl = clientUser.AvatarUrl,

                ExpertProfileId = expertProfile.ExpertProfileId,
                ExpertUserId = expertProfile.UserId,
                ExpertName = expertUser.FullName,
                ExpertAvatarUrl = expertUser.AvatarUrl,

                Title = project.Title,
                Description = project.Description,
                TotalBudget = project.TotalBudget,
                MilestoneTotalAmount = milestoneTotalAmount,
                RemainingMilestoneAmount = project.TotalBudget - milestoneTotalAmount,
                Status = project.Status,
                ContractStatus = contract.Status,
                StartDate = project.StartDate,
                EndDate = project.EndDate,
                EscrowLockedAt = project.EscrowLockedAt,
                RequiresPostDisputeDecision = await _context.Disputes
                    .AsNoTracking()
                    .AnyAsync(x =>
                        x.ProjectId == project.ProjectId &&
                        x.Status == DisputeStatusResolved &&
                        x.ResolutionType == ResolutionReleaseToExpert &&
                        x.PostResolutionDecision == null),
                LatestResolvedDisputeId = await _context.Disputes
                    .AsNoTracking()
                    .Where(x =>
                        x.ProjectId == project.ProjectId &&
                        x.Status == DisputeStatusResolved)
                    .OrderByDescending(x => x.ResolvedAt)
                    .ThenByDescending(x => x.DisputeId)
                    .Select(x => (int?)x.DisputeId)
                    .FirstOrDefaultAsync(),
                CreatedAt = project.CreatedAt,
                Milestones = milestoneResponses
            };
        }

        private static MilestoneResponse MapToMilestoneResponse(
            Milestone milestone,
            Project project)
        {
            return new MilestoneResponse
            {
                MilestoneId = milestone.MilestoneId,
                ProjectId = milestone.ProjectId,
                ProjectTitle = project.Title,
                Title = milestone.Title,
                Amount = milestone.Amount,
                OrderIndex = milestone.OrderIndex,
                DurationDays = milestone.DurationDays,
                Deadline = milestone.Deadline,
                RevisionUsed = milestone.RevisionUsed,
                PaymentStatus = milestone.PaymentStatus,
                Status = milestone.Status,
                CreatedAt = milestone.CreatedAt
            };
        }


    }
}