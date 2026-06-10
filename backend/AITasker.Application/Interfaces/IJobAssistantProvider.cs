using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IJobAssistantProvider
{
    Task<JobAiAnalysisResult> AnalyzeAsync(
        JobAssistantRequest request,
        List<string> availableSkills
    );
}