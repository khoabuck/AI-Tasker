using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IAdminJobService
{
    Task<List<AdminJobResponse>> GetJobsAsync(
        string? search,
        string? status,
        int? clientProfileId);

    Task<AdminJobResponse?> GetJobByIdAsync(int jobPostingId);

    Task<IReadOnlyList<ProposalResponse>?> GetJobProposalsAsync(int jobPostingId);

    Task<AdminJobResponse?> CancelJobAsync(
        int adminId,
        int jobPostingId,
        AdminCancelJobRequest request);
}
