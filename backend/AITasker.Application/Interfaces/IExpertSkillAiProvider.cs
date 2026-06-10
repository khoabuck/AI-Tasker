using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IExpertSkillAiProvider
{
    Task<ExpertSkillAiAnalysisResult> AnalyzeAsync(
        ExpertSkillAiProfileInput input,
        List<string> availableSkills
    );
}