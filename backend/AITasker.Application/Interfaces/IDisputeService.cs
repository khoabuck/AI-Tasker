using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces
{
    public interface IDisputeService
    {
        Task<DisputeResponse> OpenDisputeAsync(
            int currentUserId,
            OpenDisputeRequest request);

        Task<IReadOnlyList<DisputeResponse>> GetMyDisputesAsync(
            int currentUserId);

        Task<DisputeResponse> GetDisputeByIdAsync(
            int currentUserId,
            int disputeId);

        Task<DisputeResponse> AddEvidenceAsync(
            int currentUserId,
            int disputeId,
            CreateDisputeEvidenceRequest request);

        Task<IReadOnlyList<DisputeResponse>> GetAdminDisputesAsync();

        Task<DisputeResponse> ResolveDisputeAsync(
            int adminUserId,
            int disputeId,
            ResolveDisputeRequest request);
    }
}