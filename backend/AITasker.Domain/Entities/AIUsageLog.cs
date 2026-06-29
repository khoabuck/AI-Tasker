namespace AITasker.Domain.Entities;

public class AIUsageLog
{
    public int AIUsageLogId { get; set; }

    public int? UserId { get; set; }

    public string ModuleName { get; set; } = string.Empty;

    public string Provider { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

    public int InputTokens { get; set; }

    public int OutputTokens { get; set; }

    public int TotalTokens { get; set; }

    public decimal InputPricePerMillionTokensUsd { get; set; }

    public decimal OutputPricePerMillionTokensUsd { get; set; }

    public decimal EstimatedInputCostUsd { get; set; }

    public decimal EstimatedOutputCostUsd { get; set; }

    public decimal EstimatedTotalCostUsd { get; set; }

    public decimal ActualInputCostUsd { get; set; }

    public decimal ActualOutputCostUsd { get; set; }

    public decimal ActualTotalCostUsd { get; set; }

    public decimal ExchangeRateToVnd { get; set; }

    public decimal EstimatedTotalCostVnd { get; set; }

    public decimal ActualTotalCostVnd { get; set; }

    public decimal FreeTierSavingsUsd { get; set; }

    public decimal FreeTierSavingsVnd { get; set; }

    public bool IsFreeTier { get; set; }

    public bool IsChargedToPlatform { get; set; } = true;

    public bool IsChargedToUser { get; set; }

    public string Status { get; set; } = string.Empty;

    public string? ErrorMessage { get; set; }

    public string? RequestPreview { get; set; }

    public string? ResponsePreview { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
}
