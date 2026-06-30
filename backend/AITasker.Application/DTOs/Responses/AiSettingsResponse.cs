namespace AITasker.Application.DTOs.Responses;

public class AiSettingsResponse
{
    public int AiSettingsId { get; set; }

    public string Provider { get; set; } = string.Empty;

    public string Model { get; set; } = string.Empty;

    public bool IsEnabled { get; set; }

    public int JobAssistantMaxTokens { get; set; }

    public int ExpertSkillMaxTokens { get; set; }

    public int ProfileReviewMaxTokens { get; set; }

    public int SkillValidatorMaxTokens { get; set; }

    public double Temperature { get; set; }

    public bool JsonObjectResponse { get; set; }

    public int MonthlyTokenLimit { get; set; }

    public int MonthlyRequestLimit { get; set; }

    public int DailyRequestLimitPerUser { get; set; }

    public IReadOnlyList<AiAllowedModelResponse> AllowedModels { get; set; } = Array.Empty<AiAllowedModelResponse>();

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public int? UpdatedByAdminId { get; set; }

    public string? UpdatedByAdminEmail { get; set; }

    public string? UpdatedByAdminFullName { get; set; }
}
