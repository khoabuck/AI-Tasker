namespace AITasker.Application.DTOs.Responses;

public class AiSettingsResponse
{
    public int AiSettingsId { get; set; }

    public string Provider { get; set; } = "Groq";

    public string PrimaryModel { get; set; } = string.Empty;

    public string? FallbackModel { get; set; }

    public bool IsEnabled { get; set; }

    public int MonthlyTokenLimit { get; set; }

    public int MonthlyRequestLimit { get; set; }

    public int DailyRequestLimitPerUser { get; set; }

    public IReadOnlyList<string> AllowedModels { get; set; } = Array.Empty<string>();

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public int? UpdatedByAdminId { get; set; }

    public string? UpdatedByAdminEmail { get; set; }

    public string? UpdatedByAdminFullName { get; set; }
}
