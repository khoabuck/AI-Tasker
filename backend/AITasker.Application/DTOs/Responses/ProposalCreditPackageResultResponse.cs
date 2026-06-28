namespace AITasker.Application.DTOs.Responses;

public class ProposalCreditPackagePurchaseResultResponse
{
    public ProposalCreditPackagePurchaseResponse Purchase { get; set; } = null!;

    public decimal RemainingWalletBalance { get; set; }

    public bool FreeProposalSubmitUsed { get; set; }

    public int FreeProposalSubmitRemaining { get; set; }

    public int ProposalSubmitCredits { get; set; }

    public bool CanSubmitProposal { get; set; }

    public List<ProposalCreditWarningResponse> Warnings { get; set; } = new();
}