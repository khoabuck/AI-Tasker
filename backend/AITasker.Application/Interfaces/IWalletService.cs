using System.Threading.Tasks;

namespace AITasker.Application.Interfaces
{
    public interface IWalletService
    {
        Task<decimal> GetBalanceAsync(int userId);

        Task<bool> DepositAsync(int userId, decimal amount, string description, string referenceId);

        Task<bool> WithdrawAsync(int userId, decimal amount, string description);

        Task<bool> HoldEscrowAsync(int clientId, decimal amount, string referenceJobId);

        Task<bool> ReleaseEscrowAsync(string referenceJobId, int expertId);
    }
}