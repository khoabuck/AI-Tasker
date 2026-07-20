using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces
{
    public interface IProjectContractService
    {
        Task<ProjectContractResponse> CreateContractFromProposalAsync(
            int userId,
            int proposalId);

        Task<ProjectContractResponse> GetContractByIdAsync(
            int userId,
            int contractId);

        Task<ProjectContractResponse> GetContractByProposalIdAsync(
            int userId,
            int proposalId);

        Task<ProjectContractResponse> ConfirmContractAsync(
            int contractId,
            int userId);

        Task<ProjectContractResponse> CancelContractDraftAsync(
            int userId,
            int contractId,
            CancelContractDraftRequest request);

        Task<ProjectContractResponse> DeclineDealAsync(
            int userId,
            int contractId,
            DeclineContractDealRequest request);

        Task<IReadOnlyList<ContractMilestoneDraftResponse>> GetContractMilestoneDraftsAsync(
            int userId,
            int contractId);
    }
}
