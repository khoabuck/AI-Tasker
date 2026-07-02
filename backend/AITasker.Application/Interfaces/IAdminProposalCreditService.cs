using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IAdminProposalCreditService
{
    Task<List<AdminProposalCreditResponse>> GetExpertCreditsAsync(
        string? search,
        string? profileReviewStatus,
        bool? availableForWork);

    Task<AdminProposalCreditResponse?> GetExpertCreditByIdAsync(
        int expertProfileId);

    Task<AdminProposalCreditResponse?> AdjustCreditsAsync(
        int adminId,
        int expertProfileId,
        AdminAdjustProposalCreditsRequest request);
}