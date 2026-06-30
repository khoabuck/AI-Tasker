namespace AITasker.Application.DTOs.Responses;

public class AiUsageLogResponse
{
    public int AiUsageLogId { get; set; }

    public int? UserId { get; set; }

    public string? UserEmail { get; set; }

    public string? UserFullName { get; set; }

    public string Feature { get; set; } = string.Empty;

    public string? EntityType { get; set; }

    public int? EntityId { get; set; }

    public string Provider { get; set; } = "Groq";

    public string Model { get; set; } = string.Empty;

    public bool UsedFallback { get; set; }

    public int PromptTokens { get; set; }

    public int CompletionTokens { get; set; }

    public int TotalTokens { get; set; }

    public string Status { get; set; } = string.Empty;

    public int? StatusCode { get; set; }

    public string? ErrorCode { get; set; }

    public string? ErrorMessage { get; set; }

    public DateTime CreatedAt { get; set; }
}
