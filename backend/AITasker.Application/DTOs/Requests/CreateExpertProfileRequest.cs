namespace AITasker.Application.DTOs.Requests;

public class CreateExpertProfileRequest
{
    public string FullName { get; set; } = string.Empty;

    // Avatar nằm ở bảng Users, nhưng gửi chung trong form hoàn thiện profile
    public string? AvatarUrl { get; set; }

    public string ProfessionalTitle { get; set; } = string.Empty;

    public string Bio { get; set; } = string.Empty;

    public string Skills { get; set; } = string.Empty;

    public int YearsOfExperience { get; set; }

    public bool AvailableForWork { get; set; } = true;

    public string? PortfolioUrl { get; set; }

    public string? LinkedInUrl { get; set; }

    public string? GitHubUrl { get; set; }

    public List<CreateExpertCertificateRequest> Certificates { get; set; } = new();
}