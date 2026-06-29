namespace AITasker.Domain.Entities;

public class ProposalCreditPackagePurchase
{
    public int ProposalCreditPackagePurchaseId { get; set; }

    public int ExpertProfileId { get; set; }

    public int ProposalCreditPackageId { get; set; }

    public string PackageNameSnapshot { get; set; } = string.Empty;

    public string DescriptionSnapshot { get; set; } = string.Empty;

    public int ProposalSubmitCreditsAdded { get; set; }

    public decimal PricePaid { get; set; }

    public string Currency { get; set; } = "VND";

    public string Status { get; set; } = "SUCCESS";

    public string TransactionReferenceId { get; set; } = string.Empty;

    public DateTime PurchasedAt { get; set; } = DateTime.UtcNow;

    public ExpertProfile ExpertProfile { get; set; } = null!;

    public ProposalCreditPackage ProposalCreditPackage { get; set; } = null!;
}