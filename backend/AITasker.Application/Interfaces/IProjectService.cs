using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces
{
    public interface IProjectService
    {
        Task<ProjectResponse> CreateProjectFromContractAsync(
            int currentUserId,
            int contractId);

        Task<ProjectResponse> InitializeProjectWithMilestonesAsync(
            int currentUserId,
            int contractId,
            List<CreateMilestoneRequest> milestones);

        Task<IReadOnlyList<ProjectResponse>> GetMyProjectsAsync(
            int currentUserId);

        Task<ProjectResponse> GetProjectByIdAsync(
            int currentUserId,
            int projectId);

        Task<IReadOnlyList<MilestoneResponse>> GetProjectMilestonesAsync(
            int currentUserId,
            int projectId);

        Task<MilestoneResponse> GetMilestoneByIdAsync(
            int currentUserId,
            int milestoneId);

        Task<MilestoneResponse> CreateMilestoneAsync(
            int currentUserId,
            int projectId,
            CreateMilestoneRequest request);

        Task<MilestoneResponse> UpdateMilestoneAsync(
            int currentUserId,
            int milestoneId,
            UpdateMilestoneRequest request);

        Task<ProjectResponse> CompleteProjectCheckAsync(
            int currentUserId,
            int projectId);
    }
}