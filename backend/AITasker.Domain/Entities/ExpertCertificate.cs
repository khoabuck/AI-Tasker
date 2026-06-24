namespace AITasker.Domain.Entities;

public class ExpertCertificate
{
    public int ExpertCertificateId { get; set; }

    public int ExpertProfileId { get; set; }

    // COURSE_CERTIFICATE / PROFESSIONAL_CERTIFICATE / BOOTCAMP_CERTIFICATE /
    // DEGREE_CERTIFICATE / AWARD_CERTIFICATE / OTHER
    public string CertificateType { get; set; } = "OTHER";

    // Stored after backend detection. User no longer needs to input this.
    public string CertificateName { get; set; } = string.Empty;

    // Stored after backend detection. User no longer needs to input this.
    public string CertificateIssuer { get; set; } = string.Empty;

    public string CertificateUrl { get; set; } = string.Empty;

    // Stored after backend detection when available.
    public DateTime? IssuedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // VERIFIED / NAME_MISMATCH / NEEDS_REVIEW / INVALID
    public string VerificationStatus { get; set; } = "NEEDS_REVIEW";

    public decimal VerificationScore { get; set; }

    public string? VerificationNote { get; set; }

    public string? DetectedIssuer { get; set; }

    public string? DetectedCertificateName { get; set; }

    public string? DetectedHolderName { get; set; }

    public string? DetectedIssuedDateText { get; set; }

    public DateTime? DetectedIssuedAt { get; set; }

    public DateTime? CheckedAt { get; set; }

    public ExpertProfile ExpertProfile { get; set; } = null!;
}
