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

        Task<ProjectContractResponse> CancelContractAsync(
            int userId,
            int contractId,
            CancelContractRequest request);

        Task<IReadOnlyList<ContractMilestoneDraftResponse>> GetContractMilestoneDraftsAsync(
            int userId,
            int contractId);
    }
}