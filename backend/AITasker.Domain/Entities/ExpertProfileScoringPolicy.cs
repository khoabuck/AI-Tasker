namespace AITasker.Domain.Entities;

public class ExpertProfileScoringPolicy
{
    public int ExpertProfileScoringPolicyId { get; set; }

    public decimal PassThreshold { get; set; } = 70m;

    public int MaxReviewSubmissions { get; set; } = 5;

    public int ReviewLockDurationHours { get; set; } = 24;

    public decimal ProfileCompletenessMaxScore { get; set; } = 15m;

    public decimal AiSkillMaxScore { get; set; } = 15m;

    public decimal ExperienceMaxScore { get; set; } = 20m;

    public decimal PortfolioMaxScore { get; set; } = 10m;

    public decimal GitHubMaxScore { get; set; } = 10m;

    public decimal LinkedInMaxScore { get; set; } = 5m;

    public decimal CertificateMaxScore { get; set; } = 15m;

    public decimal RiskMaxPenalty { get; set; } = 10m;

    public decimal CertificateUnverifiedMaxProfileScore { get; set; } = 69m;

    public int BioMinimumLength { get; set; } = 50;

    public int SkillsMinimumLength { get; set; } = 10;

    public int MaxCertificates { get; set; } = 10;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public int? UpdatedByAdminId { get; set; }

    public User? UpdatedByAdmin { get; set; }
}
