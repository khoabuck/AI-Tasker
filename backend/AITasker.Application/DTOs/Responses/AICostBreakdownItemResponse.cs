namespace AITasker.Application.DTOs.Responses;

public class AICostBreakdownItemResponse
{
    public string Key { get; set; } = string.Empty;

    public int RequestCount { get; set; }

    public int SuccessCount { get; set; }

    public int FailedCount { get; set; }

    public long InputTokens { get; set; }

    public long OutputTokens { get; set; }

    public long TotalTokens { get; set; }

    public decimal EstimatedCostUsd { get; set; }

    public decimal EstimatedCostVnd { get; set; }

    public decimal ActualCostUsd { get; set; }

    public decimal ActualCostVnd { get; set; }

    public decimal FreeTierSavingsUsd { get; set; }

    public decimal FreeTierSavingsVnd { get; set; }
}
