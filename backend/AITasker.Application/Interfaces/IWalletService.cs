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

        Task<IReadOnlyList<TransactionResponse>> GetMyTransactionsAsync(int userId, string? category = null, string? statusGroup = null);

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

        Task<EscrowOperationResponse> LockProjectEscrowAsync(
            int currentUserId,
            int projectId,
            bool sendNotifications = true);

        Task<EscrowOperationResponse> ReleaseEscrowAsync(
            int currentUserId,
            int milestoneId);

    }
}