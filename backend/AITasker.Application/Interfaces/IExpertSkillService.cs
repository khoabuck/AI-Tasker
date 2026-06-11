using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IExpertSkillService
{
    Task<List<ExpertSkillResponse>> GetMySkillsAsync(int userId);

    Task<List<ExpertSkillResponse>> UpdateMySkillsAsync(
        int userId,
        UpdateExpertSkillsRequest request
    );

    Task<List<ExpertSkillResponse>> GetExpertSkillsAsync(int expertProfileId);

    Task<List<ExpertSkillResponse>> SyncFromProfileSkillsAsync(
        int expertProfileId,
        string? skillsText,
        int defaultYearsOfExperience
    );
}