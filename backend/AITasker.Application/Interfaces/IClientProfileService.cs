using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IClientProfileService
{
    Task<ClientProfileResponse> CreateIndividualAsync(
        int userId,
        CreateIndividualClientProfileRequest request
    );

    Task<ClientProfileResponse> CreateBusinessAsync(
        int userId,
        CreateBusinessClientProfileRequest request
    );

    Task<ClientProfileResponse> ResubmitBusinessAsync(
        int userId,
        CreateBusinessClientProfileRequest request
    );

    Task<ClientProfileResponse> UpdateIndividualAsync(
        int userId,
        UpdateIndividualClientProfileRequest request
    );

    Task<ClientProfileResponse> UpdateBusinessAsync(
        int userId,
        UpdateBusinessClientProfileRequest request
    );

    Task<ClientProfileResponse?> GetMyProfileAsync(int userId);
}