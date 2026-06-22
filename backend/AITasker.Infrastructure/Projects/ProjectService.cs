using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Projects
{
    public class ProjectService : IProjectService
    {
        private const string JobStatusCompleted = "COMPLETED";

        private const string ContractStatusConfirmed = "CONFIRMED";

        private const string ProjectStatusPendingEscrow = "PENDING_ESCROW";
        private const string ProjectStatusActive = "ACTIVE";
        private const string ProjectStatusCompleted = "COMPLETED";

        private const string MilestoneStatusPending = "PENDING";
        private const string MilestoneStatusApproved = "APPROVED";
        private const string MilestoneStatusResolved = "RESOLVED";
        private const string MilestoneStatusDisputeResolved = "DISPUTE_RESOLVED";
        private const string MilestoneStatusReleased = "RELEASED";
        private const string MilestoneStatusRefunded = "REFUNDED";

        private const string PaymentStatusPending = "PENDING";

        private readonly AITaskerDbContext _context;
        private readonly INotificationService _notificationService;

        public ProjectService(
            AITaskerDbContext context,
            INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<ProjectResponse> CreateProjectFromContractAsync(
            int currentUserId,
            int contractId)
        {
            var contract = await GetContractByIdAsync(contractId);
            var proposal = await GetProposalByIdAsync(contract.ProposalId);
            var job = await GetJobByIdAsync(proposal.JobId);
            var clientProfile = await GetClientProfileByIdAsync(contract.ClientId);
            var expertProfile = await GetExpertProfileByIdAsync(contract.ExpertId);

            EnsureUserBelongsToProjectContext(
                currentUserId,
                clientProfile,
                expertProfile);

            if (!string.Equals(contract.Status, ContractStatusConfirmed, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Project can only be created from a confirmed contract.");
            }

            var existingProject = await _context.Projects
                .FirstOrDefaultAsync(x => x.ContractId == contractId);

            if (existingProject != null)
            {
                return await MapToProjectResponseAsync(existingProject);
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
            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                clientProfile.UserId,
                "Project created",
                $"Project '{project.Title}' was created and is waiting for escrow confirmation.",
                "PROJECT_CREATED");

            await _notificationService.CreateNotificationAsync(
                expertProfile.UserId,
                "Project created",
                $"Project '{project.Title}' was created and is waiting for Client escrow confirmation.",
                "PROJECT_CREATED");

            return await MapToProjectResponseAsync(project);
        }

        public async Task<ProjectResponse> InitializeProjectWithMilestonesAsync(
            int currentUserId,
            int contractId,
            List<CreateMilestoneRequest> milestones)
        {
            if (milestones == null || !milestones.Any())
            {
                throw new InvalidOperationException("At least one milestone is required.");
            }

            var contract = await GetContractByIdAsync(contractId);
            var proposal = await GetProposalByIdAsync(contract.ProposalId);
            var job = await GetJobByIdAsync(proposal.JobId);
            var clientProfile = await GetClientProfileByIdAsync(contract.ClientId);
            var expertProfile = await GetExpertProfileByIdAsync(contract.ExpertId);

            if (clientProfile.UserId != currentUserId)
            {
                throw new UnauthorizedAccessException("Only the contract Client can initialize project milestones.");
            }

            if (!string.Equals(contract.Status, ContractStatusConfirmed, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Project milestones can only be initialized after contract confirmation.");
            }

            ValidateMilestoneRequests(milestones);

            var totalAmount = milestones.Sum(x => x.Amount);

            if (totalAmount != contract.FinalPrice)
            {
                throw new InvalidOperationException(
                    $"Milestone total amount ({totalAmount}) must equal contract final price ({contract.FinalPrice}).");
            }

            using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var project = await _context.Projects
                    .FirstOrDefaultAsync(x => x.ContractId == contractId);

                if (project == null)
                {
                    project = new Project
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
                    await _context.SaveChangesAsync();
                }

                EnsureProjectCanEditMilestones(project);

                var existingMilestones = await _context.Milestones
                    .Where(x => x.ProjectId == project.ProjectId)
                    .ToListAsync();

                if (existingMilestones.Any())
                {
                    throw new InvalidOperationException("Project already has milestones.");
                }

                foreach (var request in milestones.OrderBy(x => x.OrderIndex))
                {
                    var milestone = BuildMilestone(project.ProjectId, request);
                    _context.Milestones.Add(milestone);
                }

                await _context.SaveChangesAsync();
                await dbTransaction.CommitAsync();

                await _notificationService.CreateNotificationAsync(
                    expertProfile.UserId,
                    "Project milestones initialized",
                    $"Milestones for project '{project.Title}' were initialized by the Client.",
                    "PROJECT_MILESTONES_INITIALIZED");

                return await MapToProjectResponseAsync(project);
            }
            catch
            {
                await dbTransaction.RollbackAsync();
                throw;
            }
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

        public async Task<MilestoneResponse> CreateMilestoneAsync(
            int currentUserId,
            int projectId,
            CreateMilestoneRequest request)
        {
            ValidateMilestoneRequest(request);

            var project = await GetProjectByIdInternalAsync(projectId);
            var contract = await GetContractByIdAsync(project.ContractId);
            var clientProfile = await GetClientProfileByIdAsync(contract.ClientId);
            var expertProfile = await GetExpertProfileByIdAsync(contract.ExpertId);

            if (clientProfile.UserId != currentUserId)
            {
                throw new UnauthorizedAccessException("Only the project Client can create milestones.");
            }

            EnsureProjectCanEditMilestones(project);

            var orderIndexExists = await _context.Milestones.AnyAsync(x =>
                x.ProjectId == projectId &&
                x.OrderIndex == request.OrderIndex);

            if (orderIndexExists)
            {
                throw new InvalidOperationException("Milestone order index already exists in this project.");
            }

            var currentTotal = await _context.Milestones
                .Where(x => x.ProjectId == projectId)
                .SumAsync(x => x.Amount);

            if (currentTotal + request.Amount > contract.FinalPrice)
            {
                throw new InvalidOperationException(
                    $"Milestone total amount cannot exceed contract final price ({contract.FinalPrice}).");
            }

            var milestone = BuildMilestone(projectId, request);

            _context.Milestones.Add(milestone);
            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                expertProfile.UserId,
                "New milestone created",
                $"A new milestone '{milestone.Title}' was added to project '{project.Title}'.",
                "MILESTONE_CREATED");

            return MapToMilestoneResponse(milestone, project);
        }

        public async Task<MilestoneResponse> UpdateMilestoneAsync(
            int currentUserId,
            int milestoneId,
            UpdateMilestoneRequest request)
        {
            ValidateUpdateMilestoneRequest(request);

            var milestone = await GetMilestoneByIdInternalAsync(milestoneId);
            var project = await GetProjectByIdInternalAsync(milestone.ProjectId);
            var contract = await GetContractByIdAsync(project.ContractId);
            var clientProfile = await GetClientProfileByIdAsync(contract.ClientId);
            var expertProfile = await GetExpertProfileByIdAsync(contract.ExpertId);

            if (clientProfile.UserId != currentUserId)
            {
                throw new UnauthorizedAccessException("Only the project Client can update milestones.");
            }

            EnsureProjectCanEditMilestones(project);

            var orderIndexExists = await _context.Milestones.AnyAsync(x =>
                x.ProjectId == project.ProjectId &&
                x.OrderIndex == request.OrderIndex &&
                x.MilestoneId != milestoneId);

            if (orderIndexExists)
            {
                throw new InvalidOperationException("Milestone order index already exists in this project.");
            }

            var totalWithoutCurrent = await _context.Milestones
                .Where(x =>
                    x.ProjectId == project.ProjectId &&
                    x.MilestoneId != milestoneId)
                .SumAsync(x => x.Amount);

            if (totalWithoutCurrent + request.Amount > contract.FinalPrice)
            {
                throw new InvalidOperationException(
                    $"Milestone total amount cannot exceed contract final price ({contract.FinalPrice}).");
            }

            milestone.Title = request.Title.Trim();
            milestone.Description = request.Description.Trim();
            milestone.ExpectedDeliverable = request.ExpectedDeliverable.Trim();
            milestone.AcceptanceCriteria = request.AcceptanceCriteria.Trim();
            milestone.Amount = request.Amount;
            milestone.OrderIndex = request.OrderIndex;
            milestone.Deadline = request.Deadline;
            milestone.RevisionLimit = request.RevisionLimit;

            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                expertProfile.UserId,
                "Milestone updated",
                $"Milestone '{milestone.Title}' was updated in project '{project.Title}'.",
                "MILESTONE_UPDATED");

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
                throw new UnauthorizedAccessException("You do not have permission to complete-check this project.");
            }

            var contract = await GetContractByIdAsync(project.ContractId);
            var clientProfile = await GetClientProfileByIdAsync(contract.ClientId);
            var expertProfile = await GetExpertProfileByIdAsync(contract.ExpertId);

            var milestones = await _context.Milestones
                .Where(x => x.ProjectId == projectId)
                .ToListAsync();

            if (!milestones.Any())
            {
                throw new InvalidOperationException("Project cannot be completed because it has no milestones.");
            }

            var allFinished = milestones.All(IsMilestoneFinished);

            if (!allFinished)
            {
                throw new InvalidOperationException("Project still has unfinished milestones.");
            }

            if (!string.Equals(project.Status, ProjectStatusCompleted, StringComparison.OrdinalIgnoreCase))
            {
                project.Status = ProjectStatusCompleted;
                project.EndDate = DateTime.UtcNow;

                await UpdateJobStatusByProjectAsync(
                    project,
                    JobStatusCompleted);

                await _context.SaveChangesAsync();

                await _notificationService.CreateNotificationAsync(
                    clientProfile.UserId,
                    "Project completed",
                    $"Project '{project.Title}' has been completed.",
                    "PROJECT_COMPLETED");

                await _notificationService.CreateNotificationAsync(
                    expertProfile.UserId,
                    "Project completed",
                    $"Project '{project.Title}' has been completed.",
                    "PROJECT_COMPLETED");
            }

            return await MapToProjectResponseAsync(project);
        }

        private static Milestone BuildMilestone(
            int projectId,
            CreateMilestoneRequest request)
        {
            return new Milestone
            {
                ProjectId = projectId,
                Title = request.Title.Trim(),
                Description = request.Description.Trim(),
                ExpectedDeliverable = request.ExpectedDeliverable.Trim(),
                AcceptanceCriteria = request.AcceptanceCriteria.Trim(),
                Amount = request.Amount,
                OrderIndex = request.OrderIndex,
                Deadline = request.Deadline,
                RevisionLimit = request.RevisionLimit,
                RevisionUsed = 0,
                PaymentStatus = PaymentStatusPending,
                Status = MilestoneStatusPending,
                CreatedAt = DateTime.UtcNow
            };
        }

        private static void ValidateMilestoneRequests(
            List<CreateMilestoneRequest> requests)
        {
            foreach (var request in requests)
            {
                ValidateMilestoneRequest(request);
            }

            var duplicateOrderIndexes = requests
                .GroupBy(x => x.OrderIndex)
                .Where(x => x.Count() > 1)
                .Select(x => x.Key)
                .ToList();

            if (duplicateOrderIndexes.Any())
            {
                throw new InvalidOperationException("Milestone order index must be unique within the project.");
            }
        }

        private static void ValidateMilestoneRequest(CreateMilestoneRequest request)
        {
            if (request == null)
            {
                throw new InvalidOperationException("Milestone request is required.");
            }

            if (string.IsNullOrWhiteSpace(request.Title))
            {
                throw new InvalidOperationException("Milestone title is required.");
            }

            if (string.IsNullOrWhiteSpace(request.Description))
            {
                throw new InvalidOperationException("Milestone description is required.");
            }

            if (string.IsNullOrWhiteSpace(request.ExpectedDeliverable))
            {
                throw new InvalidOperationException("Expected deliverable is required.");
            }

            if (string.IsNullOrWhiteSpace(request.AcceptanceCriteria))
            {
                throw new InvalidOperationException("Acceptance criteria is required.");
            }

            if (request.Amount <= 0)
            {
                throw new InvalidOperationException("Milestone amount must be greater than 0.");
            }

            if (request.OrderIndex <= 0)
            {
                throw new InvalidOperationException("Milestone order index must be greater than 0.");
            }

            if (request.Deadline <= DateTime.UtcNow)
            {
                throw new InvalidOperationException("Milestone deadline must be in the future.");
            }

            if (request.RevisionLimit < 0)
            {
                throw new InvalidOperationException("Revision limit cannot be negative.");
            }
        }

        private static void ValidateUpdateMilestoneRequest(UpdateMilestoneRequest request)
        {
            if (request == null)
            {
                throw new InvalidOperationException("Milestone update request is required.");
            }

            ValidateMilestoneRequest(new CreateMilestoneRequest
            {
                Title = request.Title,
                Description = request.Description,
                ExpectedDeliverable = request.ExpectedDeliverable,
                AcceptanceCriteria = request.AcceptanceCriteria,
                Amount = request.Amount,
                OrderIndex = request.OrderIndex,
                Deadline = request.Deadline,
                RevisionLimit = request.RevisionLimit
            });
        }

        private static void EnsureProjectCanEditMilestones(Project project)
        {
            if (!string.Equals(project.Status, ProjectStatusPendingEscrow, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Milestones can only be created or updated before escrow is locked.");
            }
        }

        private static bool IsMilestoneFinished(Milestone milestone)
        {
            var status = milestone.Status?.Trim().ToUpperInvariant();

            return status == MilestoneStatusApproved ||
                   status == MilestoneStatusResolved ||
                   status == MilestoneStatusDisputeResolved ||
                   status == MilestoneStatusReleased ||
                   status == MilestoneStatusRefunded;
        }

        private static void EnsureUserBelongsToProjectContext(
            int currentUserId,
            ClientProfile clientProfile,
            ExpertProfile expertProfile)
        {
            if (clientProfile.UserId == currentUserId)
            {
                return;
            }

            if (expertProfile.UserId == currentUserId)
            {
                return;
            }

            throw new UnauthorizedAccessException("You do not belong to this project context.");
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

                ExpertProfileId = expertProfile.ExpertProfileId,
                ExpertUserId = expertProfile.UserId,
                ExpertName = expertUser.FullName,

                Title = project.Title,
                Description = project.Description,
                TotalBudget = project.TotalBudget,
                MilestoneTotalAmount = milestoneTotalAmount,
                RemainingMilestoneAmount = project.TotalBudget - milestoneTotalAmount,
                Status = project.Status,
                ContractStatus = contract.Status,
                StartDate = project.StartDate,
                EndDate = project.EndDate,
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
                Description = milestone.Description,
                ExpectedDeliverable = milestone.ExpectedDeliverable,
                AcceptanceCriteria = milestone.AcceptanceCriteria,
                Amount = milestone.Amount,
                OrderIndex = milestone.OrderIndex,
                Deadline = milestone.Deadline,
                RevisionLimit = milestone.RevisionLimit,
                RevisionUsed = milestone.RevisionUsed,
                PaymentStatus = milestone.PaymentStatus,
                Status = milestone.Status,
                CreatedAt = milestone.CreatedAt
            };
        }

        private async Task UpdateJobStatusByProjectAsync(
            Project project,
            string jobStatus)
        {
            var contract = await _context.ProjectContracts
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ContractId == project.ContractId);

            if (contract == null)
            {
                return;
            }

            var proposal = await _context.Proposals
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ProposalId == contract.ProposalId);

            if (proposal == null)
            {
                return;
            }

            var job = await _context.JobPostings
                .FirstOrDefaultAsync(x => x.JobPostingId == proposal.JobId);

            if (job == null)
            {
                return;
            }

            job.Status = jobStatus;
            job.UpdatedAt = DateTime.UtcNow;
        }
    }
}