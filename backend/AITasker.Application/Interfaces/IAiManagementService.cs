using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces;

public interface IAiManagementService
{
    Task<AiSettingsResponse> GetSettingsAsync();

    Task<AiSettingsResponse> UpdateSettingsAsync(
        int adminId,
        UpdateAiSettingsRequest request
    );

    Task<AiSettings> GetOrCreateActiveSettingsEntityAsync();

    Task<IReadOnlyList<string>> GetAllowedModelsAsync();

    Task<AiUsageSummaryResponse> GetUsageSummaryAsync(int days = 30);

    Task<IReadOnlyList<AiUsageByFeatureResponse>> GetUsageByFeatureAsync(int days = 30);

    Task<IReadOnlyList<AiUsageLogResponse>> GetUsageLogsAsync(int take = 100, int days = 30);
}
