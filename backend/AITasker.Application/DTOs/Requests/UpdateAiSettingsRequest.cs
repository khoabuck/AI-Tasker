namespace AITasker.Application.DTOs.Requests;

public class UpdateAiSettingsRequest
{
    public string? PrimaryModel { get; set; }

    public string? FallbackModel { get; set; }

    public bool IsEnabled { get; set; }

    public int MonthlyTokenLimit { get; set; }

    public int MonthlyRequestLimit { get; set; }

    public int DailyRequestLimitPerUser { get; set; }

    public string? Reason { get; set; }
}
