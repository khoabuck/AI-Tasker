namespace AITasker.Application.DTOs.Responses;

public class JobCreditPackagePurchaseResponse
{
    public int JobCreditPackagePurchaseId { get; set; }

    public int JobCreditPackageId { get; set; }

    public string PackageNameSnapshot { get; set; } = string.Empty;

    public string DescriptionSnapshot { get; set; } = string.Empty;

    public int JobPostCreditsAdded { get; set; }

    public int AiGenerationCreditsAdded { get; set; }

    public decimal PricePaid { get; set; }

    public string Currency { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string TransactionReferenceId { get; set; } = string.Empty;

    public DateTime PurchasedAt { get; set; }
}
