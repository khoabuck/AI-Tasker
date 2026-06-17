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

    public string ExperienceVerificationStatus { get; set; } = "UNVERIFIED";

    public string? ExperienceVerificationNote { get; set; }

    public bool AvailableForWork { get; set; }

    public string? PortfolioUrl { get; set; }

    public string? LinkedInUrl { get; set; }

    public string? GitHubUrl { get; set; }

    public string ExpertCategory { get; set; } = string.Empty;

    public decimal ProfileScore { get; set; }

    // FRESHER / JUNIOR / MID_LEVEL / SENIOR / LEAD
    public string Level { get; set; } = string.Empty;

    // APPROVED / NEEDS_CORRECTION / REJECTED / LOCKED
    public string ProfileReviewStatus { get; set; } = string.Empty;

    public string? ProfileReviewNote { get; set; }

    public string? MissingInformation { get; set; }

    // Số lần submit/resubmit bị fail review
    public int ProfileReviewSubmissionCount { get; set; }

    // Thời điểm hết khóa nếu expert spam submit sai quá nhiều
    public DateTime? ProfileReviewLockedUntil { get; set; }

    public DateTime? VerifiedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public User User { get; set; } = null!;

    public ICollection<ExpertCertificate> Certificates { get; set; } = new List<ExpertCertificate>();

    public ICollection<ExpertSkill> ExpertSkills { get; set; } = new List<ExpertSkill>();
}