using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IExpertSkillService
{
    Task<List<ExpertSkillResponse>> GetMySkillsAsync(int userId);

    Task<List<ExpertSkillResponse>> SetMySkillsAsync(int userId, SetExpertSkillsRequest request);
}
