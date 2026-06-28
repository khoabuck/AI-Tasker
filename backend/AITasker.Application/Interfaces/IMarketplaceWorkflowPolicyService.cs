using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IMarketplaceWorkflowPolicyService
{
    Task<MarketplaceWorkflowPolicyResponse> GetActivePolicyAsync();

    Task<MarketplaceWorkflowPolicyResponse> UpdateActivePolicyAsync(
        int adminId,
        UpdateMarketplaceWorkflowPolicyRequest request);
}