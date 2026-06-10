namespace AITasker.Application.DTOs.Requests;

public class ExpertSkillAiProfileInput
{
    public string ProfessionalTitle { get; set; } = string.Empty;

    public string Bio { get; set; } = string.Empty;

    public string SkillsText { get; set; } = string.Empty;

    public int YearsOfExperience { get; set; }

    public string? PortfolioUrl { get; set; }

    public string? LinkedInUrl { get; set; }

    public string? GitHubUrl { get; set; }

    public List<ExpertSkillAiCertificateInput> Certificates { get; set; } = new();
}

public class ExpertSkillAiCertificateInput
{
    public string CertificateName { get; set; } = string.Empty;

    public string CertificateIssuer { get; set; } = string.Empty;

    public string CertificateUrl { get; set; } = string.Empty;

    public DateTime? IssuedAt { get; set; }
}