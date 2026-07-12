using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IExpertDirectoryService
{
    Task<ExpertDirectoryPagedResponse> GetExpertsAsync(
        string? keyword,
        int? skillId,
        string? level,
        bool availableOnly,
        int page,
        int pageSize
    );

    Task<ExpertDirectoryDetailResponse?> GetExpertByIdAsync(int expertProfileId);
}
