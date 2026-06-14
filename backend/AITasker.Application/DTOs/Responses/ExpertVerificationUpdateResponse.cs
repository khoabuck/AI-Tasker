namespace AITasker.Application.DTOs.Responses;

public class ExpertVerificationUpdateResponse
{
    public bool Applied { get; set; }

    public string Message { get; set; } = string.Empty;

    public string ProfileReviewStatus { get; set; } = string.Empty;

    public string? ProfileReviewNote { get; set; }

    public string? MissingInformation { get; set; }

    public decimal ProfileScore { get; set; }

    public string Level { get; set; } = string.Empty;

    public string ExpertCategory { get; set; } = string.Empty;

    public int VerifiedYearsOfExperience { get; set; }

    public decimal ExperienceConfidenceScore { get; set; }

    public string ExperienceVerificationStatus { get; set; } = string.Empty;

    public string? ExperienceVerificationNote { get; set; }

    public List<ExpertCertificateResponse> ProposedCertificates { get; set; } = new();

    public ExpertProfileResponse CurrentProfile { get; set; } = null!;
}