namespace AITasker.Application.DTOs.Responses;

public class AiUsageLogResponse
{
    public int AiUsageLogId { get; set; }

    public int? UserId { get; set; }

    public string? UserEmail { get; set; }

    public string? UserFullName { get; set; }

    public string Feature { get; set; } = string.Empty;

    // Compatibility alias for older Admin AI usage endpoint naming.
    public string ModuleName
    {
        get => Feature;
        set => Feature = value ?? string.Empty;
    }

    public string? EntityType { get; set; }

    public int? EntityId { get; set; }

    public string Provider { get; set; } = string.Empty;

    public string Model { get; set; } = string.Empty;

    // Compatibility alias for older cost-tracking naming.
    public string ModelName
    {
        get => Model;
        set => Model = value ?? string.Empty;
    }

    public int PromptTokens { get; set; }

    public int InputTokens
    {
        get => PromptTokens;
        set => PromptTokens = value;
    }

    public int CompletionTokens { get; set; }

    public int OutputTokens
    {
        get => CompletionTokens;
        set => CompletionTokens = value;
    }

    public int TotalTokens { get; set; }

    public decimal InputPricePerMillionTokensUsd { get; set; }

    public decimal OutputPricePerMillionTokensUsd { get; set; }

    public decimal EstimatedTotalCostUsd { get; set; }

    public decimal ActualTotalCostUsd { get; set; }

    public decimal EstimatedTotalCostVnd { get; set; }

    public decimal ActualTotalCostVnd { get; set; }

    public decimal FreeTierSavingsVnd { get; set; }

    public bool IsFreeTier { get; set; }

    public string Status { get; set; } = string.Empty;

    public int? StatusCode { get; set; }

    public string? ErrorCode { get; set; }

    public string? ErrorMessage { get; set; }

    public DateTime CreatedAt { get; set; }
}
