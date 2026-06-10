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

    Task<ClientProfileResponse?> GetMyProfileAsync(int userId);
}