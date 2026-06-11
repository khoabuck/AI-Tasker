using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IRecommendationService
{
    Task<List<ExpertRecommendationResponse>> GetRecommendedExpertsForJobAsync(
        int currentUserId,
        string? currentUserRole,
        int jobPostingId,
        int limit
    );
}