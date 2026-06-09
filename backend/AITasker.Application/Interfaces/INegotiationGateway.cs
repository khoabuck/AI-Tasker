namespace AITasker.Application.Interfaces;

// Integration point for BE3/Contracts. When a proposal is accepted, BE2 calls this
// gateway; the real implementation (chat summary -> contract draft) is provided later.
public interface INegotiationGateway
{
    Task OnProposalAcceptedAsync(int proposalId);
}
