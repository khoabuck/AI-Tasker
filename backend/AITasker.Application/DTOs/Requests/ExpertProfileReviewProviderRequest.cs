using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.DTOs.Requests;

public class ExpertProfileReviewProviderRequest
{
    public string ProfessionalTitle { get; set; } = string.Empty;

    public string Bio { get; set; } = string.Empty;

    public string Skills { get; set; } = string.Empty;

    public int YearsOfExperience { get; set; }

    public bool AvailableForWork { get; set; }

    public string? PortfolioUrl { get; set; }

    public string? LinkedInUrl { get; set; }

    public string? GitHubUrl { get; set; }

    public decimal PassThreshold { get; set; } = 70m;

    public decimal ProfileCompletenessMaxScore { get; set; } = 15m;

    public decimal AiSkillMaxScore { get; set; } = 15m;

    public decimal ExperienceMaxScore { get; set; } = 20m;

    public decimal PortfolioMaxScore { get; set; } = 10m;

    public decimal GitHubMaxScore { get; set; } = 10m;

    public decimal LinkedInMaxScore { get; set; } = 5m;

    public decimal CertificateMaxScore { get; set; } = 15m;

    public decimal RiskMaxPenalty { get; set; } = 10m;

    public decimal CertificateUnverifiedMaxProfileScore { get; set; } = 69m;

    public List<ExpertProfileReviewCertificateItem> Certificates { get; set; } = new();

    public List<UrlInspectionResult> UrlInspectionResults { get; set; } = new();
}

public class ExpertProfileReviewCertificateItem
{
    public string CertificateName { get; set; } = string.Empty;

    public string CertificateIssuer { get; set; } = string.Empty;

    public string CertificateUrl { get; set; } = string.Empty;

    public DateTime? IssuedAt { get; set; }
}
