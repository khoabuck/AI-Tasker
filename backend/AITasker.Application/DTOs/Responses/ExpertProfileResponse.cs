namespace AITasker.Application.DTOs.Responses;

public class ExpertProfileResponse
{
    public int ExpertProfileId { get; set; }

    public int UserId { get; set; }

    public string Email { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string? AvatarUrl { get; set; }

    public string ProfessionalTitle { get; set; } = string.Empty;

    public string Bio { get; set; } = string.Empty;

    public string Skills { get; set; } = string.Empty;

    public int YearsOfExperience { get; set; }

    public int VerifiedYearsOfExperience { get; set; }

    public decimal ExperienceConfidenceScore { get; set; }

    public string ExperienceVerificationStatus { get; set; } = string.Empty;

    public string? ExperienceVerificationNote { get; set; }

    public decimal ExpectedProjectBudgetMin { get; set; }

    public decimal ExpectedProjectBudgetMax { get; set; }

    public int PreferredProjectDurationDays { get; set; }

    public bool AvailableForWork { get; set; }

    public string? PortfolioUrl { get; set; }

    public string? LinkedInUrl { get; set; }

    public string? GitHubUrl { get; set; }

    public string ExpertCategory { get; set; } = string.Empty;

    public decimal ProfileScore { get; set; }

    public string Level { get; set; } = string.Empty;

    public string ProfileReviewStatus { get; set; } = string.Empty;

    public string? ProfileReviewNote { get; set; }

    public string? MissingInformation { get; set; }

    public DateTime? VerifiedAt { get; set; }

    public string UserStatus { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public List<ExpertCertificateResponse> Certificates { get; set; } = new();
}