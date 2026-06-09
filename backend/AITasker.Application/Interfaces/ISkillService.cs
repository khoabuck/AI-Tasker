using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface ISkillService
{
    Task<List<SkillResponse>> GetActiveAsync(string? category, string? search);

    Task<SkillResponse> CreateAsync(CreateSkillRequest request);

    Task<SkillResponse> UpdateAsync(int skillId, UpdateSkillRequest request);
}
