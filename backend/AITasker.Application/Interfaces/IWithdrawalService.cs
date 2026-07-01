using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces
{
    public interface IWithdrawalService
    {
        Task<WithdrawalResponse> CreateWithdrawalRequestAsync(
            int userId,
            CreateWithdrawalRequest request);

        Task<IReadOnlyList<WithdrawalResponse>> GetMyWithdrawalRequestsAsync(int userId);

        Task<IReadOnlyList<WithdrawalResponse>> GetAllWithdrawalRequestsAsync(string? status);

        Task<WithdrawalResponse> ApproveWithdrawalAsync(
            int withdrawalRequestId,
            int adminId,
            ProcessWithdrawalRequest request);

        Task<WithdrawalResponse> ApproveWithdrawalWithPayOsAsync(
            int withdrawalRequestId,
            int adminId,
            ProcessWithdrawalRequest request);

        Task<WithdrawalResponse> SyncPayOsWithdrawalAsync(
            int withdrawalRequestId,
            int adminId);

        Task<WithdrawalResponse> RejectWithdrawalAsync(
            int withdrawalRequestId,
            int adminId,
            ProcessWithdrawalRequest request);
    }
}
