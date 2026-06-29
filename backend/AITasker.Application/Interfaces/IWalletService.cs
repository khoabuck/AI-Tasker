using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces
{
    public interface IWalletService
    {
        Task<decimal> GetBalanceAsync(int userId);

        Task<Wallet> GetWalletByUserIdAsync(int userId);

        Task<WalletResponse> GetMyWalletAsync(int userId);

        Task<IReadOnlyList<TransactionResponse>> GetMyTransactionsAsync(int userId);

        Task<IReadOnlyList<DepositOrderResponse>> GetMyDepositOrdersAsync(
            int userId);

        Task<DepositOrderResponse> ConfirmPayOsWebhookAsync(
            PayOsWebhookRequest request);

        Task<DepositOrderResponse> GetDepositOrderByIdAsync(
            int currentUserId,
            int depositOrderId);

        Task<DepositOrderResponse> CreateDepositOrderAsync(
            int userId,
            CreateDepositOrderRequest request);

        Task<IReadOnlyList<EscrowResponse>> GetProjectEscrowsAsync(
            int currentUserId,
            int projectId);

        Task<bool> DepositAsync(
            int userId,
            decimal amount,
            string transactionRef);

        Task<bool> DepositAsync(
            int userId,
            decimal amount,
            string description,
            string referenceId);

        Task<bool> WithdrawAsync(
            int userId,
            decimal amount,
            string description);

        Task<EscrowOperationResponse> LockProjectEscrowAsync(
            int currentUserId,
            int projectId);

        Task<EscrowOperationResponse> ReleaseEscrowAsync(
            int currentUserId,
            int milestoneId);

        Task<EscrowOperationResponse> RefundEscrowAsync(
            int currentUserId,
            int milestoneId);

        Task<EscrowOperationResponse> FreezeEscrowAsync(
            int currentUserId,
            int milestoneId);

        Task<bool> ReleaseEscrowAsync(
            int milestoneId);

        Task<bool> RefundEscrowAsync(
            int milestoneId);
    }
}