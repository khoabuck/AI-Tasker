namespace AITasker.Domain.Entities;

public class ExpertProfile
{
    public int ExpertProfileId { get; set; }

    public int UserId { get; set; }

    public string ProfessionalTitle { get; set; } = string.Empty;

    public string Bio { get; set; } = string.Empty;

    public string Skills { get; set; } = string.Empty;

    public int YearsOfExperience { get; set; }

    public decimal ExpectedProjectBudgetMin { get; set; }

    public decimal ExpectedProjectBudgetMax { get; set; }

    public int PreferredProjectDurationDays { get; set; }

    public bool AvailableForWork { get; set; } = true;

    public string? PortfolioUrl { get; set; }

    public string? LinkedInUrl { get; set; }

    public string? GitHubUrl { get; set; }

    // AI phân loại
    public string ExpertCategory { get; set; } = "OTHER";

    public decimal ProfileScore { get; set; } = 0;

    public decimal RatingAverage { get; set; } = 0;

    public int ReviewCount { get; set; } = 0;

    public int CompletedProjects { get; set; } = 0;

    public string Level { get; set; } = "UNKNOWN";

    // PENDING_REVIEW / APPROVED / NEEDS_CORRECTION / REJECTED
    public string ProfileReviewStatus { get; set; } = "PENDING_REVIEW";

    public string? ProfileReviewNote { get; set; }

    public string? MissingInformation { get; set; }

    public DateTime? VerifiedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public User User { get; set; } = null!;

    public ICollection<ExpertCertificate> Certificates { get; set; }
        = new List<ExpertCertificate>();
}