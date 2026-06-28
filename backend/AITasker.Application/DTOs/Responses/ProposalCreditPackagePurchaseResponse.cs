namespace AITasker.Application.DTOs.Responses;

public class ProposalCreditPackagePurchaseResponse
{
    public int ProposalCreditPackagePurchaseId { get; set; }

    public int ProposalCreditPackageId { get; set; }

    public string PackageNameSnapshot { get; set; } = string.Empty;

    public string DescriptionSnapshot { get; set; } = string.Empty;

    public int ProposalSubmitCreditsAdded { get; set; }

    public decimal PricePaid { get; set; }

    public string Currency { get; set; } = "VND";

    public string Status { get; set; } = string.Empty;

    public string TransactionReferenceId { get; set; } = string.Empty;

    public DateTime PurchasedAt { get; set; }
}