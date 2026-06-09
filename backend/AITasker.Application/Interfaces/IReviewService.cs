using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IReviewService
{
    Task<ReviewResponse> CreateAsync(int userId, int projectId, CreateReviewRequest request);

    Task<PagedResult<ReviewResponse>> GetExpertReviewsAsync(int expertProfileId, int page, int pageSize);

    Task<List<ReviewResponse>> GetMyReceivedAsync(int userId);

    Task<ReviewResponse> HideAsync(int reviewId);
}
