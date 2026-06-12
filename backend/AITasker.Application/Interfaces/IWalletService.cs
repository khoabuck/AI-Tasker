using System.Threading.Tasks;
using AITasker.Domain.Entities; 

namespace AITasker.Application.Interfaces
{
    public interface IWalletService
    {
        Task<decimal> GetBalanceAsync(int userId);
        
        Task<bool> DepositAsync(int userId, decimal amount, string transactionRef);
        
        Task<bool> HoldEscrowAsync(int clientId, int milestoneId, decimal amount);
        
        Task<bool> ReleaseEscrowAsync(int milestoneId, int expertId);
        
        Task<bool> RefundEscrowAsync(int milestoneId);
    }
}