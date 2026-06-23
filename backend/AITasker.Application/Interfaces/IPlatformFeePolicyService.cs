using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces;

public interface IPlatformFeePolicyService
{
    Task<PlatformFeePolicyResponse> GetActivePolicyAsync();

    Task<PlatformFeePolicyResponse> UpdateActivePolicyAsync(
        int adminId,
        UpdatePlatformFeePolicyRequest request
    );

    Task<decimal> GetFeeRateForClientTypeAsync(string clientType);

    Task<PlatformFeePolicy> GetOrCreateActivePolicyEntityAsync();
}
