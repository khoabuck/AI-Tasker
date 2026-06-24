namespace AITasker.Application.DTOs.Responses;

public class ExpertCertificateResponse
{
    public int ExpertCertificateId { get; set; }

    public int CertificateId
    {
        get => ExpertCertificateId;
        set => ExpertCertificateId = value;
    }

    public string CertificateType { get; set; } = string.Empty;

    public string CertificateName { get; set; } = string.Empty;

    public string CertificateIssuer { get; set; } = string.Empty;

    public string CertificateUrl { get; set; } = string.Empty;

    public DateTime? IssuedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public string VerificationStatus { get; set; } = string.Empty;

    public decimal VerificationScore { get; set; }

    public string? VerificationNote { get; set; }

    public string? DetectedIssuer { get; set; }

    public string? DetectedCertificateName { get; set; }

    public string? DetectedHolderName { get; set; }

    public string? DetectedIssuedDateText { get; set; }

    public DateTime? DetectedIssuedAt { get; set; }

    public DateTime? CheckedAt { get; set; }
}
