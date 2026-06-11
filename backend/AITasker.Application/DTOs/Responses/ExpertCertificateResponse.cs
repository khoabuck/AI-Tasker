namespace AITasker.Application.DTOs.Responses;

public class ExpertCertificateResponse
{
    public int ExpertCertificateId { get; set; }

    public string CertificateName { get; set; } = string.Empty;

    public string CertificateIssuer { get; set; } = string.Empty;

    public string CertificateUrl { get; set; } = string.Empty;

    public DateTime? IssuedAt { get; set; }

    public DateTime CreatedAt { get; set; }
}