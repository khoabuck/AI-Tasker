using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IAIUsageCostService
{
    Task RecordFromOpenAICompatibleResponseAsync(
        RecordAIUsageRequest request,
        CancellationToken cancellationToken = default);

    Task<AICostOverviewResponse> GetCostOverviewAsync(
        DateTime? from = null,
        DateTime? to = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AiUsageLogResponse>> GetUsageLogsAsync(
        DateTime? from = null,
        DateTime? to = null,
        string? provider = null,
        string? moduleName = null,
        int take = 100,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AIModelPricingPolicyResponse>> GetPricingPoliciesAsync(
        string? provider = null,
        string? modelName = null,
        bool? isActive = null,
        CancellationToken cancellationToken = default);

    Task<AIModelPricingPolicyResponse> UpsertPricingPolicyAsync(
        UpsertAIModelPricingPolicyRequest request,
        int? adminUserId = null,
        CancellationToken cancellationToken = default);

    Task DeactivatePricingPolicyAsync(
        int policyId,
        int? adminUserId = null,
        string? reason = null,
        CancellationToken cancellationToken = default);
}
