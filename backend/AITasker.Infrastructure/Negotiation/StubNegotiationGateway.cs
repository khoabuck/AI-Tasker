using AITasker.Application.Interfaces;

namespace AITasker.Infrastructure.Negotiation;

public class StubNegotiationGateway : INegotiationGateway
{
    public Task OnProposalAcceptedAsync(int proposalId)
    {
        // No-op stub. BE3/Contracts replaces this with contract-draft creation.
        return Task.CompletedTask;
    }
}
