namespace AITasker.Application.DTOs.Responses;

public class ProposalCreditPackagePageResponse
{
    public decimal WalletAvailableBalance { get; set; }

    public string CurrentCreditTier { get; set; } = "Free";

    public bool FreeProposalSubmitUsed { get; set; }

    public int FreeProposalSubmitRemaining { get; set; }

    public int ProposalSubmitCredits { get; set; }

    public bool CanSubmitProposal { get; set; }

    public List<ProposalCreditPackageCardResponse> Packages { get; set; } = new();

    public List<ProposalCreditPackagePurchaseResponse> RecentPurchases { get; set; } = new();

    public List<TransactionResponse> RecentTransactions { get; set; } = new();

    public List<ProposalCreditWarningResponse> Warnings { get; set; } = new();
}