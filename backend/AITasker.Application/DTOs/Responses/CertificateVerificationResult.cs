namespace AITasker.Application.DTOs.Responses;

public class CertificateVerificationResult
{
    public string CertificateType { get; set; } = string.Empty;

    public string CertificateUrl { get; set; } = string.Empty;

    public string CertificateName { get; set; } = string.Empty;

    public string CertificateIssuer { get; set; } = string.Empty;

    public string? DetectedCertificateName { get; set; }

    public string? DetectedIssuer { get; set; }

    public string? DetectedHolderName { get; set; }

    public string? DetectedIssuedDateText { get; set; }

    public DateTime? DetectedIssuedAt { get; set; }

    public bool IsHolderNameMismatch { get; set; }

    public decimal VerificationScore { get; set; }

    // VERIFIED / NAME_MISMATCH / NEEDS_REVIEW / INVALID
    public string VerificationStatus { get; set; } = "NEEDS_REVIEW";

    public string? VerificationNote { get; set; }

    public DateTime? CheckedAt { get; set; }

    public bool IsReachable { get; set; }

    public bool IsHttps { get; set; }

    public bool IsTrustedDomain { get; set; }

    public int? HttpStatusCode { get; set; }

    public string? PageTitle { get; set; }

    public string? ExtractedText { get; set; }

    public bool ContainsCertificateName { get; set; }

    public bool ContainsIssuer { get; set; }

    public bool ContainsHolderName { get; set; }

    public bool ContainsIssuedDate { get; set; }

    public bool IsRelatedToExpertSkills { get; set; }

    public bool IsIssuedAtReasonable { get; set; }
}
