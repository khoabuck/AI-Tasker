using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IExpertProfileService
{
    Task<ExpertProfileResponse> CreateAsync(
        int userId,
        CreateExpertProfileRequest request
    );

    Task<ExpertProfileResponse> ResubmitAsync(
        int userId,
        CreateExpertProfileRequest request
    );

    Task<ExpertProfileResponse> UpdateAsync(
        int userId,
        UpdateExpertProfileRequest request
    );

    Task<ExpertProfileResponse> GetMeAsync(int userId);

    Task<ExpertProfileResponse> UpdateWorkPreferencesAsync(
        int userId,
        UpdateExpertWorkPreferencesRequest request
    );
}