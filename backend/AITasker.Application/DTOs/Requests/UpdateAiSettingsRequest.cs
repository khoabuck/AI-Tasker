namespace AITasker.Application.DTOs.Requests;

public class UpdateAiSettingsRequest
{
    public string Model { get; set; } = string.Empty;

    public bool IsEnabled { get; set; } = true;

    public int JobAssistantMaxTokens { get; set; } = 3000;

    public int ExpertSkillMaxTokens { get; set; } = 1500;

    public int ProfileReviewMaxTokens { get; set; } = 2000;

    public int SkillValidatorMaxTokens { get; set; } = 1200;

    public double Temperature { get; set; } = 0.1;

    public bool JsonObjectResponse { get; set; } = true;

    public int MonthlyTokenLimit { get; set; } = 1_000_000;

    public int MonthlyRequestLimit { get; set; } = 50_000;

    public int DailyRequestLimitPerUser { get; set; } = 50;

    public string Reason { get; set; } = string.Empty;
}
