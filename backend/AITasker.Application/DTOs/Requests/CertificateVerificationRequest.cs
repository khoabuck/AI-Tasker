namespace AITasker.Application.DTOs.Requests;

public class CertificateVerificationRequest
{
    public string CertificateType { get; set; } = string.Empty;

    public string CertificateName { get; set; } = string.Empty;

    public string CertificateIssuer { get; set; } = string.Empty;

    public string CertificateUrl { get; set; } = string.Empty;

    public DateTime? IssuedAt { get; set; }

    public string ExpertFullName { get; set; } = string.Empty;

    public string ExpertBio { get; set; } = string.Empty;

    public string ExpertSkillsText { get; set; } = string.Empty;
}
