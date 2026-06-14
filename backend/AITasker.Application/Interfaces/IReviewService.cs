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

        Task<IReadOnlyList<ReviewResponse>> GetExpertReviewsAsync(int expertId);
    }
}