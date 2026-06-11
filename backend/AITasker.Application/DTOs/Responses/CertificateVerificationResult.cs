namespace AITasker.Application.DTOs.Responses;

public class CertificateVerificationResult
{
    public string CertificateName { get; set; } = string.Empty;

    public string CertificateIssuer { get; set; } = string.Empty;

    public string CertificateUrl { get; set; } = string.Empty;

    public bool IsReachable { get; set; }

    public int? HttpStatusCode { get; set; }

    public bool IsHttps { get; set; }

    public bool IsTrustedDomain { get; set; }

    public bool ContainsCertificateName { get; set; }

    public bool ContainsIssuer { get; set; }

    public bool IsRelatedToExpertSkills { get; set; }

    public bool IsIssuedAtReasonable { get; set; }

    public decimal VerificationScore { get; set; }

    // UNVERIFIED / VERIFIED / NEEDS_REVIEW / SUSPICIOUS / INVALID
    public string VerificationStatus { get; set; } = "UNVERIFIED";

    public string VerificationNote { get; set; } = string.Empty;

    public string? DetectedIssuer { get; set; }

    public string? DetectedCertificateName { get; set; }

    public string? PageTitle { get; set; }

    public string? ExtractedText { get; set; }

    public DateTime CheckedAt { get; set; } = DateTime.UtcNow;
}