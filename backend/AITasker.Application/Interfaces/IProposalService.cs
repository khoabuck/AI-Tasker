using System.Collections.Generic;
using System.Threading.Tasks;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces
{
    public interface IProposalService
    {
        Task<ProposalResponse> SubmitProposalAsync(
            int userId,
            SubmitProposalRequest request);

        Task<IReadOnlyList<ProposalResponse>> GetMyProposalsAsync(
            int userId);

        Task<ProposalCreditResponse> GetMyProposalCreditsAsync(
            int userId);

        Task<IReadOnlyList<ProposalResponse>> GetMyProposalDraftsAsync(
            int userId);

        Task<ProposalResponse> SaveProposalDraftAsync(
            int userId,
            SubmitProposalRequest request);

        Task<ProposalResponse> UpdateProposalDraftAsync(
            int userId,
            int proposalId,
            SubmitProposalRequest request);

        Task<ProposalResponse> SubmitProposalDraftAsync(
            int userId,
            int proposalId);

        Task DeleteProposalDraftAsync(
            int userId,
            int proposalId);

        Task<IReadOnlyList<ProposalResponse>> GetJobProposalsAsync(
            int userId,
            int jobId);

        Task<ProposalResponse> GetProposalByIdAsync(
            int userId,
            int proposalId);

        Task<IReadOnlyList<ProposalVersionResponse>> GetProposalVersionsAsync(
            int userId,
            int proposalId);

        Task<ProposalResponse> ResubmitProposalAsync(
            int userId,
            int proposalId,
            ResubmitProposalRequest request);

        Task<ProposalResponse> ProcessProposalStatusAsync(
            int userId,
            int proposalId,
            string decision);

        Task<ProposalWithdrawWarningResponse> GetWithdrawWarningAsync(
            int userId,
            int proposalId);

        Task<ProposalResponse> WithdrawProposalAsync(
            int userId,
            int proposalId);
    }
}