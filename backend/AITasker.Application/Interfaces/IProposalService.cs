using System.Threading.Tasks;
using AITasker.Application.DTOs.Requests;

namespace AITasker.Application.Interfaces
{
    public interface IProposalService
    {
        Task<bool> SubmitProposalAsync(
            int userId,
            SubmitProposalRequest request);

        Task<bool> CounterOfferAsync(
            int userId,
            int proposalId,
            CounterOfferRequest request);

        Task<bool> ProcessProposalStatusAsync(
            int userId,
            int proposalId,
            string decision);
    }
}