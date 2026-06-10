using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IJobAssistantService
{
    Task<JobAssistantResponse> AnalyzeJobAsync(JobAssistantRequest request);
}