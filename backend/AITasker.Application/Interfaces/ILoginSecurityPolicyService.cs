using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces;

public interface ILoginSecurityPolicyService
{
    Task<LoginSecurityPolicyResponse> GetActivePolicyAsync();

    Task<LoginSecurityPolicyResponse> UpdateActivePolicyAsync(
        int adminId,
        UpdateLoginSecurityPolicyRequest request
    );

    Task<LoginSecurityPolicy> GetOrCreateActivePolicyEntityAsync();
}
