namespace AITasker.Domain.Entities;

public class ExpertCertificate
{
    public int ExpertCertificateId { get; set; }

    public int ExpertProfileId { get; set; }

    public string CertificateName { get; set; } = string.Empty;

    public string CertificateIssuer { get; set; } = string.Empty;

    public string CertificateUrl { get; set; } = string.Empty;

    public DateTime? IssuedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // VERIFIED / NEEDS_EVIDENCE / SUSPICIOUS / INVALID
    public string VerificationStatus { get; set; } = "NEEDS_EVIDENCE";

    public decimal VerificationScore { get; set; }

    public string? VerificationNote { get; set; }

    public string? DetectedIssuer { get; set; }

    public string? DetectedCertificateName { get; set; }

    public DateTime? CheckedAt { get; set; }

    public ExpertProfile ExpertProfile { get; set; } = null!;
}