namespace AITasker.Application.DTOs.Responses;

public class ExpertDirectoryPagedResponse
{
    public int Page { get; set; }

    public int PageSize { get; set; }

    public int TotalItems { get; set; }

    public int TotalPages { get; set; }

    public List<ExpertDirectoryItemResponse> Items { get; set; } = new();
}

public class ExpertDirectoryItemResponse
{
    public int ExpertProfileId { get; set; }

    public int UserId { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string? AvatarUrl { get; set; }

    public string ProfessionalTitle { get; set; } = string.Empty;

    public string Bio { get; set; } = string.Empty;

    public string SkillsText { get; set; } = string.Empty;

    public int YearsOfExperience { get; set; }

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

    public DateTime? VerifiedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public List<ExpertDirectorySkillResponse> ExpertSkills { get; set; } = new();

    public List<ExpertDirectoryCertificateResponse> Certificates { get; set; } = new();
}

public class ExpertDirectorySkillResponse
{
    public int SkillId { get; set; }

    public string SkillName { get; set; } = string.Empty;

    public string? Category { get; set; }

    public string SkillLevel { get; set; } = string.Empty;

    public int YearsOfExperience { get; set; }

    public bool IsPrimary { get; set; }
}

public class ExpertDirectoryCertificateResponse
{
    public int ExpertCertificateId { get; set; }

    public string CertificateName { get; set; } = string.Empty;

    public string CertificateIssuer { get; set; } = string.Empty;

    public string CertificateUrl { get; set; } = string.Empty;

    public DateTime? IssuedAt { get; set; }

    public DateTime CreatedAt { get; set; }
}