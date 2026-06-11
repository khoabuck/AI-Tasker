using System.Threading.Tasks;
using AITasker.Application.DTOs.Requests;

namespace AITasker.Application.Interfaces
{
    public interface IProposalService
    {
        Task<bool> SubmitProposalAsync(int expertId, SubmitProposalRequest request);
        
        Task<bool> CounterOfferAsync(int proposalId, CounterOfferRequest request);
        
        Task<bool> ProcessProposalStatusAsync(int proposalId, string decision);
    }
}