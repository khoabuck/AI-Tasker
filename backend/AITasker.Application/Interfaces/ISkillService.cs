using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface ISkillService
{
    Task<List<SkillResponse>> GetSkillsAsync(string? keyword, string? category, bool activeOnly);

    Task<SkillResponse?> GetSkillByIdAsync(int id);

    Task<SkillResponse> CreateSkillAsync(CreateSkillRequest request);

    Task<SkillResponse?> UpdateSkillAsync(int id, UpdateSkillRequest request);

    Task<bool> DeactivateSkillAsync(int id);

    Task<bool> ActivateSkillAsync(int id);
}