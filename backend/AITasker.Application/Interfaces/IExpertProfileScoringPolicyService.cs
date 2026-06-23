using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces;

public interface IExpertProfileScoringPolicyService
{
    Task<ExpertProfileScoringPolicyResponse> GetActivePolicyAsync();

    Task<ExpertProfileScoringPolicyResponse> UpdateActivePolicyAsync(
        int adminId,
        UpdateExpertProfileScoringPolicyRequest request
    );

    Task<ExpertProfileScoringPolicy> GetOrCreateActivePolicyEntityAsync();
}
