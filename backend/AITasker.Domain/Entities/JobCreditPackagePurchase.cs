namespace AITasker.Domain.Entities;

public class JobCreditPackagePurchase
{
    public int JobCreditPackagePurchaseId { get; set; }

    public int ClientProfileId { get; set; }

    public int JobCreditPackageId { get; set; }

    public string PackageNameSnapshot { get; set; } = string.Empty;

    public string DescriptionSnapshot { get; set; } = string.Empty;

    public int JobPostCreditsAdded { get; set; }

    public int AiGenerationCreditsAdded { get; set; }

    public decimal PricePaid { get; set; }

    public string Currency { get; set; } = "VND";

    public string Status { get; set; } = "SUCCESS";

    public string TransactionReferenceId { get; set; } = string.Empty;

    public DateTime PurchasedAt { get; set; } = DateTime.UtcNow;

    public ClientProfile ClientProfile { get; set; } = null!;

    public JobCreditPackage JobCreditPackage { get; set; } = null!;
}
