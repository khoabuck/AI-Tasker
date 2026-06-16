using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IRecommendationService
{
    Task<PromptExpertRecommendationResponse> GetRecommendedExpertsFromPromptAsync(
        int currentUserId,
        string? currentUserRole,
        PromptExpertRecommendationRequest request
    );

    Task<List<ExpertRecommendationResponse>> GetRecommendedExpertsForJobAsync(
        int currentUserId,
        string? currentUserRole,
        int jobPostingId,
        int limit
    );

    Task<List<JobRecommendationResponse>> GetRecommendedJobsForMeAsync(
        int expertUserId,
        int limit
    );
}