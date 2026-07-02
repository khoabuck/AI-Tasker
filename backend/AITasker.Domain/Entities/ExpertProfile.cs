namespace AITasker.Domain.Entities;

public class ExpertProfile
{
    public int ExpertProfileId { get; set; }

    public int UserId { get; set; }

    public string ProfessionalTitle { get; set; } = string.Empty;

    public string Bio { get; set; } = string.Empty;

    public string Skills { get; set; } = string.Empty;

    // Expert tự khai
    public int YearsOfExperience { get; set; }

    // Backend/AI xác minh lại dựa trên evidence
    public int VerifiedYearsOfExperience { get; set; }

    public decimal ExperienceConfidenceScore { get; set; }

    // VERIFIED / NEEDS_EVIDENCE / SUSPICIOUS
    public string ExperienceVerificationStatus { get; set; } = "NEEDS_EVIDENCE";

    public string? ExperienceVerificationNote { get; set; }

    public bool AvailableForWork { get; set; }

    public string? PortfolioUrl { get; set; }

    public string? LinkedInUrl { get; set; }

    public string? GitHubUrl { get; set; }

    public string ExpertCategory { get; set; } = "OTHER";

    public decimal ProfileScore { get; set; }

    // Detailed scoring fields.
    // These fields allow frontend/admin to show exactly where the expert lost points.
    public decimal ProfileCompletenessScore { get; set; }

    public decimal AiSkillRelevanceScore { get; set; }

    public decimal ExperienceCredibilityScore { get; set; }

    public decimal PortfolioEvidenceScore { get; set; }

    public decimal GitHubEvidenceScore { get; set; }

    public decimal LinkedInEvidenceScore { get; set; }

    public decimal CertificateEvidenceScore { get; set; }

    public decimal TrustRiskScore { get; set; }

    // FRESHER / JUNIOR / MID_LEVEL / SENIOR / LEAD
    public string Level { get; set; } = "FRESHER";

    // APPROVED / NEEDS_CORRECTION / LOCKED
    public string ProfileReviewStatus { get; set; } = "NEEDS_CORRECTION";

    public string? ProfileReviewNote { get; set; }

    public string? MissingInformation { get; set; }

    // Số lần submit/resubmit bị fail review
    public int ProfileReviewSubmissionCount { get; set; }

    // Thời điểm hết khóa nếu expert spam submit sai quá nhiều
    public DateTime? ProfileReviewLockedUntil { get; set; }

    public DateTime? VerifiedAt { get; set; }

    public int FreeProposalSubmitUsedCount { get; set; }

    public int ProposalSubmitCredits { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public User User { get; set; } = null!;

    public ICollection<ExpertCertificate> Certificates { get; set; } = new List<ExpertCertificate>();

    public ICollection<ExpertSkill> ExpertSkills { get; set; } = new List<ExpertSkill>();
}