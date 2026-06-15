using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces
{
    public interface IReviewService
    {
        Task<ReviewResponse> CreateProjectReviewAsync(
            int projectId,
            int currentUserId,
            CreateReviewRequest request);

        Task<ReviewResponse> GetProjectReviewAsync(
            int currentUserId,
            int projectId);

        Task<IReadOnlyList<ReviewResponse>> GetExpertReviewsAsync(
            int expertProfileId);

        Task<IReadOnlyList<ReviewResponse>> GetMyReviewsAsync(
            int currentUserId);
    }
}