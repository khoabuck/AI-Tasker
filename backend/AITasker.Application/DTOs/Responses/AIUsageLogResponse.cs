namespace AITasker.Application.DTOs.Responses;

public class AIUsageLogResponse
{
    public int AIUsageLogId { get; set; }

    public int? UserId { get; set; }

    public string? UserEmail { get; set; }

    public string? UserFullName { get; set; }

    public string ModuleName { get; set; } = string.Empty;

    public string Provider { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

    public int InputTokens { get; set; }

    public int OutputTokens { get; set; }

    public int TotalTokens { get; set; }

    public decimal EstimatedTotalCostUsd { get; set; }

    public decimal ActualTotalCostUsd { get; set; }

    public decimal EstimatedTotalCostVnd { get; set; }

    public decimal ActualTotalCostVnd { get; set; }

    public decimal FreeTierSavingsVnd { get; set; }

    public bool IsFreeTier { get; set; }

    public string Status { get; set; } = string.Empty;

    public string? ErrorMessage { get; set; }

    public string? RequestPreview { get; set; }

    public string? ResponsePreview { get; set; }

    public DateTime CreatedAt { get; set; }
}
