using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces
{
    public interface IProjectContractService
    {
        Task<ProjectContractResponse> CreateContractFromProposalAsync(
            int userId,
            int proposalId);

        Task<ProjectContractResponse> CreateDraftContractAsync(
            int userId,
            CreateContractRequest request);

        Task<ProjectContractResponse> GetContractByIdAsync(
            int userId,
            int contractId);

        Task<ProjectContractResponse> GetContractByProposalIdAsync(
            int userId,
            int proposalId);

        Task<ProjectContractResponse> ConfirmContractAsync(
            int contractId,
            int userId);
    }
}