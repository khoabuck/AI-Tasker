using System.Threading.Tasks;

namespace AITasker.Application.Interfaces
{
    public interface IDisputeService
    {
        Task<int?> OpenDisputeAsync(int projectId, int? milestoneId, int openedByUserId, int respondentUserId, decimal disputedAmount, string reason);
        Task<bool> ResolveDisputeAsync(int disputeId, string resolutionType, decimal expertAmount, decimal clientAmount);
    }
}