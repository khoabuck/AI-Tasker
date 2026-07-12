using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Projects
{
    public class ProjectService : IProjectService
    {
        private readonly AITaskerDbContext _context;
        private readonly IProjectCompletionService _projectCompletionService;

        public ProjectService(
            AITaskerDbContext context,
            IProjectCompletionService projectCompletionService)
        {
            _context = context;
            _projectCompletionService = projectCompletionService;
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