namespace AITasker.Application.DTOs.Responses;

public class AiUsageByFeatureResponse
{
    public string Feature { get; set; } = string.Empty;

    public int Requests { get; set; }

    public int SuccessfulRequests { get; set; }

    public int FailedRequests { get; set; }

    public int PromptTokens { get; set; }

    public int CompletionTokens { get; set; }

    public int TotalTokens { get; set; }

    public decimal EstimatedCostUsd { get; set; }
}
