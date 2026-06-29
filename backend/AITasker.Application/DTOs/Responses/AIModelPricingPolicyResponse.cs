namespace AITasker.Application.DTOs.Responses;

public class AIModelPricingPolicyResponse
{
    public int AIModelPricingPolicyId { get; set; }

    public string Provider { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

    public decimal InputPricePerMillionTokensUsd { get; set; }

    public decimal OutputPricePerMillionTokensUsd { get; set; }

    public decimal ExchangeRateToVnd { get; set; }

    public bool IsFreeTier { get; set; }

    public bool IsActive { get; set; }

    public DateTime EffectiveFrom { get; set; }

    public int? UpdatedByAdminId { get; set; }

    public string? UpdateReason { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
