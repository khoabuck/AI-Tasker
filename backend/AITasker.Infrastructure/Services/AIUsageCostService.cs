using System.Text.Json;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Services;

public class AIUsageCostService : IAIUsageCostService
{
    private const int PreviewMaxLength = 1000;
    private const decimal DefaultExchangeRateToVnd = 25000m;

    private readonly AITaskerDbContext _context;

    public AIUsageCostService(AITaskerDbContext context)
    {
        _context = context;
    }

    public async Task RecordFromOpenAICompatibleResponseAsync(
        RecordAIUsageRequest request,
        CancellationToken cancellationToken = default)
    {
        var provider = NormalizeRequired(request.Provider, "Provider");
        var modelName = NormalizeRequired(request.ModelName, "ModelName");
        var moduleName = NormalizeRequired(request.ModuleName, "ModuleName");
        var status = NormalizeStatus(request.Status);

        var usage = ExtractUsage(request.ResponsePayload);
        var pricing = await ResolvePricingPolicyAsync(
            provider,
            modelName,
            cancellationToken);

        var inputCostUsd = CalculateCost(
            usage.InputTokens,
            pricing.InputPricePerMillionTokensUsd);

        var outputCostUsd = CalculateCost(
            usage.OutputTokens,
            pricing.OutputPricePerMillionTokensUsd);

        var estimatedTotalCostUsd = inputCostUsd + outputCostUsd;
        var actualTotalCostUsd = pricing.IsFreeTier
            ? 0m
            : estimatedTotalCostUsd;

        var estimatedTotalCostVnd = estimatedTotalCostUsd * pricing.ExchangeRateToVnd;
        var actualTotalCostVnd = actualTotalCostUsd * pricing.ExchangeRateToVnd;
        var freeTierSavingsUsd = Math.Max(estimatedTotalCostUsd - actualTotalCostUsd, 0m);
        var freeTierSavingsVnd = freeTierSavingsUsd * pricing.ExchangeRateToVnd;

        var log = new AIUsageLog
        {
            UserId = request.UserId,
            AIModelPricingPolicyId = pricing.AIModelPricingPolicyId,
            ModuleName = moduleName,
            Provider = provider,
            ModelName = modelName,
            InputTokens = usage.InputTokens,
            OutputTokens = usage.OutputTokens,
            TotalTokens = usage.TotalTokens,
            InputPricePerMillionTokensUsd = pricing.InputPricePerMillionTokensUsd,
            OutputPricePerMillionTokensUsd = pricing.OutputPricePerMillionTokensUsd,
            EstimatedInputCostUsd = inputCostUsd,
            EstimatedOutputCostUsd = outputCostUsd,
            EstimatedTotalCostUsd = estimatedTotalCostUsd,
            ActualInputCostUsd = pricing.IsFreeTier ? 0m : inputCostUsd,
            ActualOutputCostUsd = pricing.IsFreeTier ? 0m : outputCostUsd,
            ActualTotalCostUsd = actualTotalCostUsd,
            ExchangeRateToVnd = pricing.ExchangeRateToVnd,
            EstimatedTotalCostVnd = estimatedTotalCostVnd,
            ActualTotalCostVnd = actualTotalCostVnd,
            FreeTierSavingsUsd = freeTierSavingsUsd,
            FreeTierSavingsVnd = freeTierSavingsVnd,
            IsFreeTier = pricing.IsFreeTier,
            IsChargedToPlatform = request.IsChargedToPlatform,
            IsChargedToUser = request.IsChargedToUser,
            Status = status,
            ErrorMessage = Truncate(request.ErrorMessage, PreviewMaxLength),
            RequestPreview = Truncate(request.RequestPayload, PreviewMaxLength),
            ResponsePreview = Truncate(request.ResponsePayload, PreviewMaxLength),
            CreatedAt = DateTime.UtcNow
        };

        _context.AIUsageLogs.Add(log);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<AICostOverviewResponse> GetCostOverviewAsync(
        DateTime? from = null,
        DateTime? to = null,
        CancellationToken cancellationToken = default)
    {
        var query = BuildUsageQuery(from, to);
        var logs = await query.ToListAsync(cancellationToken);

        return new AICostOverviewResponse
        {
            GeneratedAt = DateTime.UtcNow,
            From = from,
            To = to,
            TotalAIRequests = logs.Count,
            SuccessfulAIRequests = logs.Count(x => IsStatus(x.Status, "SUCCESS")),
            FailedAIRequests = logs.Count(x => IsStatus(x.Status, "FAILED")),
            TotalInputTokens = logs.Sum(x => (long)x.InputTokens),
            TotalOutputTokens = logs.Sum(x => (long)x.OutputTokens),
            TotalTokens = logs.Sum(x => (long)x.TotalTokens),
            EstimatedAICostUsd = logs.Sum(x => x.EstimatedTotalCostUsd),
            EstimatedAICostVnd = logs.Sum(x => x.EstimatedTotalCostVnd),
            ActualAICostUsd = logs.Sum(x => x.ActualTotalCostUsd),
            ActualAICostVnd = logs.Sum(x => x.ActualTotalCostVnd),
            FreeTierSavingsUsd = logs.Sum(x => x.FreeTierSavingsUsd),
            FreeTierSavingsVnd = logs.Sum(x => x.FreeTierSavingsVnd),
            CostByProvider = BuildBreakdown(logs, x => x.Provider),
            CostByModule = BuildBreakdown(logs, x => x.ModuleName),
            CostByModel = BuildBreakdown(logs, x => x.ModelName)
        };
    }

    public async Task<IReadOnlyList<AIUsageLogResponse>> GetUsageLogsAsync(
        DateTime? from = null,
        DateTime? to = null,
        string? provider = null,
        string? moduleName = null,
        int take = 100,
        CancellationToken cancellationToken = default)
    {
        take = NormalizeTake(take);

        var query = BuildUsageQuery(from, to);

        if (!string.IsNullOrWhiteSpace(provider))
        {
            var normalizedProvider = Normalize(provider);
            query = query.Where(x => x.Provider == normalizedProvider);
        }

        if (!string.IsNullOrWhiteSpace(moduleName))
        {
            var normalizedModule = Normalize(moduleName);
            query = query.Where(x => x.ModuleName == normalizedModule);
        }

        var logs = await query
            .OrderByDescending(x => x.CreatedAt)
            .Take(take)
            .ToListAsync(cancellationToken);

        return logs
            .Select(x => new AIUsageLogResponse
            {
                AIUsageLogId = x.AIUsageLogId,
                UserId = x.UserId,
                UserEmail = x.User?.Email,
                UserFullName = x.User?.FullName,
                ModuleName = x.ModuleName,
                Provider = x.Provider,
                ModelName = x.ModelName,
                InputTokens = x.InputTokens,
                OutputTokens = x.OutputTokens,
                TotalTokens = x.TotalTokens,
                EstimatedTotalCostUsd = x.EstimatedTotalCostUsd,
                ActualTotalCostUsd = x.ActualTotalCostUsd,
                EstimatedTotalCostVnd = x.EstimatedTotalCostVnd,
                ActualTotalCostVnd = x.ActualTotalCostVnd,
                FreeTierSavingsVnd = x.FreeTierSavingsVnd,
                IsFreeTier = x.IsFreeTier,
                Status = x.Status,
                ErrorMessage = x.ErrorMessage,
                RequestPreview = x.RequestPreview,
                ResponsePreview = x.ResponsePreview,
                CreatedAt = x.CreatedAt
            })
            .ToList();
    }

    public async Task<IReadOnlyList<AIModelPricingPolicyResponse>> GetPricingPoliciesAsync(
        string? provider = null,
        string? modelName = null,
        bool? isActive = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.AIModelPricingPolicies
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(provider))
        {
            var normalizedProvider = Normalize(provider);
            query = query.Where(x => x.Provider == normalizedProvider);
        }

        if (!string.IsNullOrWhiteSpace(modelName))
        {
            var normalizedModel = NormalizeModelName(modelName);
            query = query.Where(x => x.ModelName == normalizedModel);
        }

        if (isActive.HasValue)
        {
            query = query.Where(x => x.IsActive == isActive.Value);
        }

        var policies = await query
            .OrderBy(x => x.Provider)
            .ThenBy(x => x.ModelName)
            .ThenByDescending(x => x.EffectiveFrom)
            .ToListAsync(cancellationToken);

        return policies.Select(MapPricingPolicy).ToList();
    }

    public async Task<AIModelPricingPolicyResponse> UpsertPricingPolicyAsync(
        UpsertAIModelPricingPolicyRequest request,
        int? adminUserId = null,
        CancellationToken cancellationToken = default)
    {
        var provider = NormalizeRequired(request.Provider, "Provider");
        var modelName = NormalizeRequired(request.ModelName, "ModelName");

        if (request.InputPricePerMillionTokensUsd < 0 ||
            request.OutputPricePerMillionTokensUsd < 0)
        {
            throw new InvalidOperationException("AI model token prices cannot be negative.");
        }

        if (request.ExchangeRateToVnd <= 0)
        {
            throw new InvalidOperationException("Exchange rate must be greater than zero.");
        }

        if (request.IsActive)
        {
            var activePolicies = await _context.AIModelPricingPolicies
                .Where(x =>
                    x.Provider == provider &&
                    x.ModelName == modelName &&
                    x.IsActive)
                .ToListAsync(cancellationToken);

            foreach (var activePolicy in activePolicies)
            {
                activePolicy.IsActive = false;
                activePolicy.UpdatedAt = DateTime.UtcNow;
                activePolicy.UpdatedByAdminId = adminUserId;
                activePolicy.UpdateReason = "Deactivated by a newer pricing policy.";
            }
        }

        var policy = new AIModelPricingPolicy
        {
            Provider = provider,
            ModelName = modelName,
            InputPricePerMillionTokensUsd = request.InputPricePerMillionTokensUsd,
            OutputPricePerMillionTokensUsd = request.OutputPricePerMillionTokensUsd,
            ExchangeRateToVnd = request.ExchangeRateToVnd,
            IsFreeTier = request.IsFreeTier,
            IsActive = request.IsActive,
            EffectiveFrom = request.EffectiveFrom ?? DateTime.UtcNow,
            UpdatedByAdminId = adminUserId,
            UpdateReason = request.UpdateReason,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.AIModelPricingPolicies.Add(policy);
        await _context.SaveChangesAsync(cancellationToken);

        return MapPricingPolicy(policy);
    }

    public async Task DeactivatePricingPolicyAsync(
        int policyId,
        int? adminUserId = null,
        string? reason = null,
        CancellationToken cancellationToken = default)
    {
        var policy = await _context.AIModelPricingPolicies
            .FirstOrDefaultAsync(x => x.AIModelPricingPolicyId == policyId, cancellationToken);

        if (policy == null)
        {
            throw new InvalidOperationException("AI model pricing policy was not found.");
        }

        policy.IsActive = false;
        policy.UpdatedAt = DateTime.UtcNow;
        policy.UpdatedByAdminId = adminUserId;
        policy.UpdateReason = string.IsNullOrWhiteSpace(reason)
            ? "Pricing policy was deactivated by Admin."
            : reason.Trim();

        await _context.SaveChangesAsync(cancellationToken);
    }

    private IQueryable<AIUsageLog> BuildUsageQuery(DateTime? from, DateTime? to)
    {
        var query = _context.AIUsageLogs
            .AsNoTracking()
            .Include(x => x.User)
            .AsQueryable();

        if (from.HasValue)
        {
            query = query.Where(x => x.CreatedAt >= from.Value);
        }

        if (to.HasValue)
        {
            query = query.Where(x => x.CreatedAt <= to.Value);
        }

        return query;
    }

    private async Task<PricingSnapshot> ResolvePricingPolicyAsync(
        string provider,
        string modelName,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        var policy = await _context.AIModelPricingPolicies
            .AsNoTracking()
            .Where(x =>
                x.Provider == provider &&
                x.ModelName == modelName &&
                x.IsActive &&
                x.EffectiveFrom <= now)
            .OrderByDescending(x => x.EffectiveFrom)
            .FirstOrDefaultAsync(cancellationToken);

        if (policy == null)
        {
            return new PricingSnapshot
            {
                AIModelPricingPolicyId = null,
                InputPricePerMillionTokensUsd = 0m,
                OutputPricePerMillionTokensUsd = 0m,
                ExchangeRateToVnd = DefaultExchangeRateToVnd,
                IsFreeTier = true
            };
        }

        return new PricingSnapshot
        {
            AIModelPricingPolicyId = policy.AIModelPricingPolicyId,
            InputPricePerMillionTokensUsd = policy.InputPricePerMillionTokensUsd,
            OutputPricePerMillionTokensUsd = policy.OutputPricePerMillionTokensUsd,
            ExchangeRateToVnd = policy.ExchangeRateToVnd,
            IsFreeTier = policy.IsFreeTier
        };
    }

    private static UsageSnapshot ExtractUsage(string? responsePayload)
    {
        if (string.IsNullOrWhiteSpace(responsePayload))
        {
            return new UsageSnapshot();
        }

        try
        {
            using var document = JsonDocument.Parse(responsePayload);
            var root = document.RootElement;

            if (!root.TryGetProperty("usage", out var usage))
            {
                return new UsageSnapshot();
            }

            var inputTokens = GetIntValue(
                usage,
                "prompt_tokens",
                "promptTokens",
                "promptTokenCount",
                "input_tokens",
                "inputTokens");

            var outputTokens = GetIntValue(
                usage,
                "completion_tokens",
                "completionTokens",
                "candidatesTokenCount",
                "output_tokens",
                "outputTokens");

            var totalTokens = GetIntValue(
                usage,
                "total_tokens",
                "totalTokens",
                "totalTokenCount");

            if (totalTokens <= 0)
            {
                totalTokens = inputTokens + outputTokens;
            }

            return new UsageSnapshot
            {
                InputTokens = Math.Max(inputTokens, 0),
                OutputTokens = Math.Max(outputTokens, 0),
                TotalTokens = Math.Max(totalTokens, 0)
            };
        }
        catch
        {
            return new UsageSnapshot();
        }
    }

    private static int GetIntValue(
        JsonElement element,
        params string[] names)
    {
        foreach (var name in names)
        {
            if (element.TryGetProperty(name, out var property))
            {
                if (property.ValueKind == JsonValueKind.Number &&
                    property.TryGetInt32(out var value))
                {
                    return value;
                }

                if (property.ValueKind == JsonValueKind.String &&
                    int.TryParse(property.GetString(), out var stringValue))
                {
                    return stringValue;
                }
            }
        }

        return 0;
    }

    private static List<AICostBreakdownItemResponse> BuildBreakdown(
        List<AIUsageLog> logs,
        Func<AIUsageLog, string> keySelector)
    {
        return logs
            .GroupBy(keySelector)
            .OrderByDescending(g => g.Sum(x => x.EstimatedTotalCostVnd))
            .Select(g => new AICostBreakdownItemResponse
            {
                Key = g.Key,
                RequestCount = g.Count(),
                SuccessCount = g.Count(x => IsStatus(x.Status, "SUCCESS")),
                FailedCount = g.Count(x => IsStatus(x.Status, "FAILED")),
                InputTokens = g.Sum(x => (long)x.InputTokens),
                OutputTokens = g.Sum(x => (long)x.OutputTokens),
                TotalTokens = g.Sum(x => (long)x.TotalTokens),
                EstimatedCostUsd = g.Sum(x => x.EstimatedTotalCostUsd),
                EstimatedCostVnd = g.Sum(x => x.EstimatedTotalCostVnd),
                ActualCostUsd = g.Sum(x => x.ActualTotalCostUsd),
                ActualCostVnd = g.Sum(x => x.ActualTotalCostVnd),
                FreeTierSavingsUsd = g.Sum(x => x.FreeTierSavingsUsd),
                FreeTierSavingsVnd = g.Sum(x => x.FreeTierSavingsVnd)
            })
            .ToList();
    }

    private static AIModelPricingPolicyResponse MapPricingPolicy(
        AIModelPricingPolicy policy)
    {
        return new AIModelPricingPolicyResponse
        {
            AIModelPricingPolicyId = policy.AIModelPricingPolicyId,
            Provider = policy.Provider,
            ModelName = policy.ModelName,
            InputPricePerMillionTokensUsd = policy.InputPricePerMillionTokensUsd,
            OutputPricePerMillionTokensUsd = policy.OutputPricePerMillionTokensUsd,
            ExchangeRateToVnd = policy.ExchangeRateToVnd,
            IsFreeTier = policy.IsFreeTier,
            IsActive = policy.IsActive,
            EffectiveFrom = policy.EffectiveFrom,
            UpdatedByAdminId = policy.UpdatedByAdminId,
            UpdateReason = policy.UpdateReason,
            CreatedAt = policy.CreatedAt,
            UpdatedAt = policy.UpdatedAt
        };
    }

    private static decimal CalculateCost(int tokens, decimal pricePerMillionTokens)
    {
        if (tokens <= 0 || pricePerMillionTokens <= 0)
        {
            return 0m;
        }

        return Math.Round(tokens / 1_000_000m * pricePerMillionTokens, 8);
    }

    private static int NormalizeTake(int take)
    {
        if (take <= 0)
        {
            return 100;
        }

        return Math.Min(take, 500);
    }

    private static string NormalizeRequired(string? value, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException($"{fieldName} is required.");
        }

        if (fieldName == "ModelName")
        {
            return NormalizeModelName(value);
        }

        return Normalize(value);
    }

    private static string NormalizeModelName(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? string.Empty
            : value.Trim().ToLowerInvariant();
    }

    private static string NormalizeStatus(string? value)
    {
        var normalized = Normalize(value);
        return normalized == "FAILED" ? "FAILED" : "SUCCESS";
    }

    private static bool IsStatus(string? value, string expected)
    {
        return Normalize(value) == Normalize(expected);
    }

    private static string Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? string.Empty
            : value.Trim().ToUpperInvariant();
    }

    private static string? Truncate(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        return trimmed.Length <= maxLength
            ? trimmed
            : trimmed[..maxLength];
    }

    private class UsageSnapshot
    {
        public int InputTokens { get; set; }

        public int OutputTokens { get; set; }

        public int TotalTokens { get; set; }
    }

    private class PricingSnapshot
    {
        public int? AIModelPricingPolicyId { get; set; }

        public decimal InputPricePerMillionTokensUsd { get; set; }

        public decimal OutputPricePerMillionTokensUsd { get; set; }

        public decimal ExchangeRateToVnd { get; set; }

        public bool IsFreeTier { get; set; }
    }
}
