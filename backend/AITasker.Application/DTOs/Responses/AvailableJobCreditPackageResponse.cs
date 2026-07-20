namespace AITasker.Application.DTOs.Responses;

public class AvailableJobCreditPackageResponse
{
    public int? JobCreditPackageId { get; set; }

    public string PackageName { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public int JobPostCredits { get; set; }

    public int AiGenerationCredits { get; set; }

    public decimal Price { get; set; }

    public string Currency { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    public bool IsFreeTier { get; set; }

    public bool IsPurchasable { get; set; }

    public int DisplayOrder { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public int? UpdatedByAdminId { get; set; }

    public string? UpdatedByAdminEmail { get; set; }

    public string? UpdatedByAdminFullName { get; set; }
}
