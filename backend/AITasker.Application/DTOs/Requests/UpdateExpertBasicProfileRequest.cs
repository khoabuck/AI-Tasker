namespace AITasker.Application.DTOs.Requests;

public class UpdateExpertBasicProfileRequest
{
    public string FullName { get; set; } = string.Empty;

    public string? AvatarUrl { get; set; }

    public string ProfessionalTitle { get; set; } = string.Empty;

    public string Bio { get; set; } = string.Empty;

    public decimal ExpectedProjectBudgetMin { get; set; }

    public decimal ExpectedProjectBudgetMax { get; set; }

    public int PreferredProjectDurationDays { get; set; }

    public bool AvailableForWork { get; set; } = true;
}