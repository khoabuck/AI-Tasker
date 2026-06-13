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

    Task<ExpertProfileResponse> UpdateBasicAsync(
        int userId,
        UpdateExpertBasicProfileRequest request
    );

    Task<ExpertVerificationUpdateResponse> UpdateVerificationAsync(
        int userId,
        UpdateExpertVerificationProfileRequest request
    );

    Task<ExpertProfileResponse> GetMeAsync(int userId);
}