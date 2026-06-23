namespace AITasker.Application.DTOs.Responses;

public class ExpertProfileScoringPolicyResponse
{
    public int ExpertProfileScoringPolicyId { get; set; }

    public decimal PassThreshold { get; set; }

    public int MaxReviewSubmissions { get; set; }

    public int ReviewLockDurationHours { get; set; }

    public decimal ProfileCompletenessMaxScore { get; set; }

    public decimal AiSkillMaxScore { get; set; }

    public decimal ExperienceMaxScore { get; set; }

    public decimal PortfolioMaxScore { get; set; }

    public decimal GitHubMaxScore { get; set; }

    public decimal LinkedInMaxScore { get; set; }

    public decimal CertificateMaxScore { get; set; }

    public decimal RiskMaxPenalty { get; set; }

    public decimal CertificateUnverifiedMaxProfileScore { get; set; }

    public int BioMinimumLength { get; set; }

    public int SkillsMinimumLength { get; set; }

    public int MaxCertificates { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public int? UpdatedByAdminId { get; set; }

    public string? UpdatedByAdminEmail { get; set; }

    public string? UpdatedByAdminFullName { get; set; }
}
