namespace AITasker.Domain.Entities;

public class ProposalCreditPackage
{
    public int ProposalCreditPackageId { get; set; }

    public string PackageName { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public int ProposalSubmitCredits { get; set; }

    public decimal Price { get; set; }

    public string Currency { get; set; } = "VND";

    public bool IsActive { get; set; } = true;

    public int DisplayOrder { get; set; }

    public int? UpdatedByAdminId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public User? UpdatedByAdmin { get; set; }

    public ICollection<ProposalCreditPackagePurchase> Purchases { get; set; } = new List<ProposalCreditPackagePurchase>();
}