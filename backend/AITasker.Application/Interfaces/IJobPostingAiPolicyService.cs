using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces;

public interface IJobPostingAiPolicyService
{
    Task<JobPostingAiPolicyResponse> GetActivePolicyAsync();

    Task<JobPostingAiPolicyResponse> UpdateActivePolicyAsync(
        int adminId,
        UpdateJobPostingAiPolicyRequest request
    );

    Task<JobPostingAiPolicy> GetOrCreateActivePolicyEntityAsync();
}