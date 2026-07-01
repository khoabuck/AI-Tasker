namespace AITasker.Application.DTOs.Requests;

public class UpsertAIModelPricingPolicyRequest
{
    public string Provider { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

    public decimal InputPricePerMillionTokensUsd { get; set; }

    public decimal OutputPricePerMillionTokensUsd { get; set; }

    public decimal ExchangeRateToVnd { get; set; } = 25000m;

    public bool IsFreeTier { get; set; } = true;

    public bool IsActive { get; set; } = true;

    public DateTime? EffectiveFrom { get; set; }

    public string? UpdateReason { get; set; }
}
