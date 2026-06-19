namespace AITasker.Application.DTOs.Requests;

public class UpdateExpertWorkPreferencesRequest
{
    public decimal ExpectedProjectBudgetMin { get; set; }

    public decimal ExpectedProjectBudgetMax { get; set; }

    public int PreferredProjectDurationDays { get; set; }

    public bool AvailableForWork { get; set; } = true;

    public string? PortfolioUrl { get; set; }

    public string? LinkedInUrl { get; set; }

    public string? GitHubUrl { get; set; }
}