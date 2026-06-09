using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IJobService
{
    Task<AiJobSuggestionResult> AiSuggestAsync(int userId, AiJobSuggestionRequest request);

    Task<JobResponse> CreateAsync(int userId, CreateJobRequest request);

    Task<JobResponse> UpdateDraftAsync(int userId, int jobId, UpdateJobRequest request);

    Task<JobResponse> SubmitAsync(int userId, int jobId);

    Task<JobResponse> CancelAsync(int userId, int jobId);

    Task<PagedResult<JobResponse>> BrowseAsync(JobFilterRequest filter);

    Task<JobResponse> GetByIdAsync(int jobId);

    Task<List<JobResponse>> GetMyJobsAsync(int userId);
}
