using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IProposalService
{
    Task<ProposalResponse> SubmitAsync(int userId, int jobId, CreateProposalRequest request);

    Task<List<ProposalResponse>> GetForJobAsync(int userId, int jobId);

    Task<ProposalResponse> GetByIdAsync(int userId, int proposalId);

    Task<List<ProposalResponse>> GetMineAsync(int userId);

    Task<ProposalResponse> CounterOfferAsync(int userId, int proposalId, CounterOfferRequest request);

    Task<ProposalResponse> AcceptAsync(int userId, int proposalId);

    Task<ProposalResponse> RejectAsync(int userId, int proposalId);

    Task<ProposalResponse> WithdrawAsync(int userId, int proposalId);
}
