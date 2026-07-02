namespace AITasker.Application.DTOs.Responses;

public class ProposalCreditResponse
{
    public int FreeSubmitTotal { get; set; }

    public int FreeSubmitUsedCount { get; set; }

    public int FreeSubmitRemaining { get; set; }

    public int AvailableProposalSubmitCredits { get; set; }

    public bool CanSubmitNewProposal { get; set; }

    public string Reason { get; set; } = string.Empty;
}
