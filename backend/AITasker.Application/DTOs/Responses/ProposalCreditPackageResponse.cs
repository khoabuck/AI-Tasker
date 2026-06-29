namespace AITasker.Application.DTOs.Responses;

public class ProposalCreditPackageResponse
{
    public int ProposalCreditPackageId { get; set; }

    public string PackageName { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public int ProposalSubmitCredits { get; set; }

    public decimal Price { get; set; }

    public string Currency { get; set; } = "VND";

    public bool IsActive { get; set; }

    public int DisplayOrder { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public int? UpdatedByAdminId { get; set; }

    public string? UpdatedByAdminEmail { get; set; }

    public string? UpdatedByAdminFullName { get; set; }
}