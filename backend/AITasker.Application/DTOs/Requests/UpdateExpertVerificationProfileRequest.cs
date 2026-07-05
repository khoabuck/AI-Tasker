namespace AITasker.Application.DTOs.Requests;

public class UpdateExpertVerificationProfileRequest
{
    public string? Skills { get; set; }

    public int? YearsOfExperience { get; set; }

    public string? PortfolioUrl { get; set; }

    public string? LinkedInUrl { get; set; }

    public string? GitHubUrl { get; set; }

    public List<CreateExpertCertificateRequest> Certificates { get; set; } = new();
}
