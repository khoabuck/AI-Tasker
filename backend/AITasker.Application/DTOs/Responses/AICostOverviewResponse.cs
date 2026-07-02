namespace AITasker.Application.DTOs.Responses;

public class AICostOverviewResponse
{
    public DateTime GeneratedAt { get; set; }

    public DateTime? From { get; set; }

    public DateTime? To { get; set; }

    public int TotalAIRequests { get; set; }

    public int SuccessfulAIRequests { get; set; }

    public int FailedAIRequests { get; set; }

    public long TotalInputTokens { get; set; }

    public long TotalOutputTokens { get; set; }

    public long TotalTokens { get; set; }

    public decimal EstimatedAICostUsd { get; set; }

    public decimal EstimatedAICostVnd { get; set; }

    public decimal ActualAICostUsd { get; set; }

    public decimal ActualAICostVnd { get; set; }

    public decimal FreeTierSavingsUsd { get; set; }

    public decimal FreeTierSavingsVnd { get; set; }

    public List<AICostBreakdownItemResponse> CostByProvider { get; set; } = new();

    public List<AICostBreakdownItemResponse> CostByModule { get; set; } = new();

    public List<AICostBreakdownItemResponse> CostByModel { get; set; } = new();
}
