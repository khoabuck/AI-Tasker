namespace AITasker.Application.DTOs.Responses;

public class ExpertProfileReviewProviderResult
{
    // APPROVED / NEEDS_CORRECTION
    public string Status { get; set; } = "NEEDS_CORRECTION";

    public decimal ProfileScore { get; set; }

    public decimal ProfileCompletenessScore { get; set; }

    public decimal AiSkillRelevanceScore { get; set; }

    public decimal ExperienceCredibilityScore { get; set; }

    public decimal PortfolioEvidenceScore { get; set; }

    public decimal GitHubEvidenceScore { get; set; }

    public decimal LinkedInEvidenceScore { get; set; }

    public decimal CertificateEvidenceScore { get; set; }

    public decimal TrustRiskScore { get; set; }

    public string Level { get; set; } = "FRESHER";

    public string ExpertCategory { get; set; } = "OTHER";

    public string? ReviewNote { get; set; }

    public string? MissingInformation { get; set; }
}