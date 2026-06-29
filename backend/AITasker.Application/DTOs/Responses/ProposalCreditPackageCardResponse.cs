namespace AITasker.Application.DTOs.Responses;

public class ProposalCreditPackageCardResponse
{
    public int? ProposalCreditPackageId { get; set; }

    public string PackageName { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public int ProposalSubmitCredits { get; set; }

    public decimal Price { get; set; }

    public string Currency { get; set; } = "VND";

    public bool IsFreePackage { get; set; }

    public bool IsActive { get; set; }

    public int DisplayOrder { get; set; }

    public bool CanPurchase { get; set; }

    public decimal WalletAvailableBalance { get; set; }

    public decimal InsufficientAmount { get; set; }

    public string? PurchaseDisabledReason { get; set; }
}