namespace AITasker.Application.DTOs.Responses;

public class AiUsageSummaryResponse
{
    public DateTime From { get; set; }

    public DateTime To { get; set; }

    public int TotalRequests { get; set; }

    public int SuccessfulRequests { get; set; }

    public int FailedRequests { get; set; }

    public int FallbackRequests { get; set; }

    public int TotalPromptTokens { get; set; }

    public int TotalCompletionTokens { get; set; }

    public int TotalTokens { get; set; }

    public decimal EstimatedCostUsd { get; set; }
}
