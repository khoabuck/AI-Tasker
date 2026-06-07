namespace AITasker.Application.DTOs.Requests;

public class CreateExpertCertificateRequest
{
    public string CertificateName { get; set; } = string.Empty;

    public string CertificateIssuer { get; set; } = string.Empty;

    public string CertificateUrl { get; set; } = string.Empty;

    public DateTime? IssuedAt { get; set; }
}