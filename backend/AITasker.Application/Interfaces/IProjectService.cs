using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces
{
    public interface IProjectService
    {
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

        Task<ProjectResponse> CompleteProjectCheckAsync(
            int currentUserId,
            int projectId);
    }
}
