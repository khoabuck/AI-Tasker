namespace AITasker.Domain.Entities;

public class BusinessProfile
{
    public int BusinessProfileId { get; set; }

    public int ClientProfileId { get; set; }

    public string CompanyName { get; set; } = string.Empty;

    public string TaxCode { get; set; } = string.Empty;

    public string Industry { get; set; } = string.Empty;

    public string CompanyAddress { get; set; } = string.Empty;

    public string? BusinessEmail { get; set; }

    public string? BusinessPhone { get; set; }

    public string VerificationStatus { get; set; } = "PENDING";

    public string? VerificationNote { get; set; }

    public int VerificationSubmissionCount { get; set; }

    public DateTime? VerificationLockedUntil { get; set; }

    public DateTime? VerifiedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public ClientProfile ClientProfile { get; set; } = null!;
}