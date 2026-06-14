using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces
{
    public interface IWalletService
    {
        Task<decimal> GetBalanceAsync(int userId);

        Task<Wallet> GetWalletByUserIdAsync(int userId);

        Task<bool> DepositAsync(int userId, decimal amount, string transactionRef);

        Task<bool> DepositAsync(int userId, decimal amount, string description, string referenceId);

        Task<bool> WithdrawAsync(int userId, decimal amount, string description);

        Task<bool> HoldEscrowAsync(int clientId, int milestoneId);

        Task<bool> ReleaseEscrowAsync(int milestoneId);

        Task<bool> RefundEscrowAsync(int milestoneId);
    }
}