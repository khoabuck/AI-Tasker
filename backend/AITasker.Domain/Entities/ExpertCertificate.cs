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

    public ExpertProfile ExpertProfile { get; set; } = null!;
}