namespace AITasker.Domain.Entities;

public class AIModelPricingPolicy
{
    public int AIModelPricingPolicyId { get; set; }

    public string Provider { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

    public decimal InputPricePerMillionTokensUsd { get; set; }

    public decimal OutputPricePerMillionTokensUsd { get; set; }

    public decimal ExchangeRateToVnd { get; set; } = 25000m;

    public bool IsFreeTier { get; set; } = true;

    public bool IsActive { get; set; } = true;

    public DateTime EffectiveFrom { get; set; } = DateTime.UtcNow;

    public int? UpdatedByAdminId { get; set; }

    public string? UpdateReason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User? UpdatedByAdmin { get; set; }
}
