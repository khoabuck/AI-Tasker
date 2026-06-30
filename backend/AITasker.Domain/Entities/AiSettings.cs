namespace AITasker.Domain.Entities;

public class AiSettings
{
    public int AiSettingsId { get; set; }

    public string Provider { get; set; } = "Groq";

    public string PrimaryModel { get; set; } = "openai/gpt-oss-120b";

    public string? FallbackModel { get; set; } = "qwen/qwen3.6-27b";

    public bool IsEnabled { get; set; } = true;

    public int MonthlyTokenLimit { get; set; } = 1_000_000;

    public int MonthlyRequestLimit { get; set; } = 50_000;

    public int DailyRequestLimitPerUser { get; set; } = 50;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public int? UpdatedByAdminId { get; set; }

    public User? UpdatedByAdmin { get; set; }
}
