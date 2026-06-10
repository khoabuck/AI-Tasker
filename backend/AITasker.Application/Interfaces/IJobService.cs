using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IJobService
{
    Task<JobResponse> CreateDraftAsync(int userId, CreateJobRequest request);

    Task<JobResponse> SubmitJobAsync(int userId, CreateJobRequest request);

    Task<JobResponse?> SubmitDraftAsync(int userId, int jobPostingId);

    Task<List<JobResponse>> GetOpenJobsAsync(string? keyword, int? skillId);

    Task<List<JobResponse>> GetMyJobsAsync(int userId);

    Task<JobResponse?> GetJobByIdAsync(int jobPostingId, int? userId, string? role);

    Task<JobResponse?> UpdateJobAsync(
        int userId,
        int jobPostingId,
        UpdateJobRequest request
    );

    Task<bool> CancelJobAsync(int userId, int jobPostingId);
}