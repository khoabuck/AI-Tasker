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
        var modelName = NormalizeModelName(NormalizeRequired(request.ModelName, "ModelName"));
        var moduleName = NormalizeFeature(request.ModuleName);
        var status = NormalizeStatus(request.Status);
        var usage = ExtractUsage(request.ResponsePayload);

        var log = new AiUsageLog
        {
            UserId = request.UserId,
            Feature = moduleName,
            Provider = provider,
            Model = modelName,
            PromptTokens = usage.InputTokens,
            CompletionTokens = usage.OutputTokens,
            TotalTokens = usage.TotalTokens,
            Status = status,
            ErrorCode = status == "FAILED" ? "ai_request_failed" : null,
            ErrorMessage = Truncate(request.ErrorMessage, PreviewMaxLength),
            CreatedAt = DateTime.UtcNow
        };

        _context.AiUsageLogs.Add(log);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<AICostOverviewResponse> GetCostOverviewAsync(
        DateTime? from = null,
        DateTime? to = null,
        CancellationToken cancellationToken = default)
    {
        var logs = await BuildUsageQuery(from, to)
            .ToListAsync(cancellationToken);

        var pricingPolicies = await GetPricingPoliciesForCalculationAsync(cancellationToken);
        var costedLogs = logs
            .Select(log => BuildCostedUsage(log, pricingPolicies))
            .ToList();

        return new AICostOverviewResponse
        {
            GeneratedAt = DateTime.UtcNow,
            From = from,
            To = to,
            TotalAIRequests = costedLogs.Count,
            SuccessfulAIRequests = costedLogs.Count(x => IsStatus(x.Log.Status, "SUCCESS")),
            FailedAIRequests = costedLogs.Count(x => !IsStatus(x.Log.Status, "SUCCESS")),
            TotalInputTokens = costedLogs.Sum(x => (long)x.Log.PromptTokens),
            TotalOutputTokens = costedLogs.Sum(x => (long)x.Log.CompletionTokens),
            TotalTokens = costedLogs.Sum(x => (long)x.Log.TotalTokens),
            EstimatedAICostUsd = costedLogs.Sum(x => x.EstimatedTotalCostUsd),
            EstimatedAICostVnd = costedLogs.Sum(x => x.EstimatedTotalCostVnd),
            ActualAICostUsd = costedLogs.Sum(x => x.ActualTotalCostUsd),
            ActualAICostVnd = costedLogs.Sum(x => x.ActualTotalCostVnd),
            FreeTierSavingsUsd = costedLogs.Sum(x => x.FreeTierSavingsUsd),
            FreeTierSavingsVnd = costedLogs.Sum(x => x.FreeTierSavingsVnd),
            CostByProvider = BuildBreakdown(costedLogs, x => x.Log.Provider),
            CostByModule = BuildBreakdown(costedLogs, x => x.Log.Feature),
            CostByModel = BuildBreakdown(costedLogs, x => x.Log.Model)
        };
    }

    public async Task<IReadOnlyList<AiUsageLogResponse>> GetUsageLogsAsync(
        DateTime? from = null,
        DateTime? to = null,
        string? provider = null,
        string? moduleName = null,
        int take = 100,
        CancellationToken cancellationToken = default)
    {
        take = NormalizeTake(take);

        var logs = await BuildUsageQuery(from, to)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(provider))
        {
            var normalizedProvider = Normalize(provider);
            logs = logs
                .Where(x => Normalize(x.Provider) == normalizedProvider)
                .ToList();
        }

        if (!string.IsNullOrWhiteSpace(moduleName))
        {
            var normalizedModule = Normalize(moduleName);
            logs = logs
                .Where(x => Normalize(x.Feature) == normalizedModule)
                .ToList();
        }

        var pricingPolicies = await GetPricingPoliciesForCalculationAsync(cancellationToken);

        return logs
            .Take(take)
            .Select(x => MapUsageLog(x, pricingPolicies))
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
        var modelName = NormalizeModelName(NormalizeRequired(request.ModelName, "ModelName"));

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

    private IQueryable<AiUsageLog> BuildUsageQuery(DateTime? from, DateTime? to)
    {
        var query = _context.AiUsageLogs
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

    private async Task<List<AIModelPricingPolicy>> GetPricingPoliciesForCalculationAsync(
        CancellationToken cancellationToken)
    {
        return await _context.AIModelPricingPolicies
            .AsNoTracking()
            .OrderByDescending(x => x.EffectiveFrom)
            .ToListAsync(cancellationToken);
    }

    private static AiUsageLogResponse MapUsageLog(
        AiUsageLog log,
        List<AIModelPricingPolicy> pricingPolicies)
    {
        var costedUsage = BuildCostedUsage(log, pricingPolicies);

        return new AiUsageLogResponse
        {
            AiUsageLogId = log.AiUsageLogId,
            UserId = log.UserId,
            UserEmail = log.User?.Email,
            UserFullName = log.User?.FullName,
            Feature = log.Feature,
            EntityType = log.EntityType,
            EntityId = log.EntityId,
            Provider = log.Provider,
            Model = log.Model,
            PromptTokens = log.PromptTokens,
            CompletionTokens = log.CompletionTokens,
            TotalTokens = log.TotalTokens,
            InputPricePerMillionTokensUsd = costedUsage.InputPricePerMillionTokensUsd,
            OutputPricePerMillionTokensUsd = costedUsage.OutputPricePerMillionTokensUsd,
            EstimatedTotalCostUsd = costedUsage.EstimatedTotalCostUsd,
            ActualTotalCostUsd = costedUsage.ActualTotalCostUsd,
            EstimatedTotalCostVnd = costedUsage.EstimatedTotalCostVnd,
            ActualTotalCostVnd = costedUsage.ActualTotalCostVnd,
            FreeTierSavingsVnd = costedUsage.FreeTierSavingsVnd,
            IsFreeTier = costedUsage.IsFreeTier,
            Status = log.Status,
            StatusCode = log.StatusCode,
            ErrorCode = log.ErrorCode,
            ErrorMessage = log.ErrorMessage,
            CreatedAt = log.CreatedAt
        };
    }

    private static CostedAiUsage BuildCostedUsage(
        AiUsageLog log,
        List<AIModelPricingPolicy> pricingPolicies)
    {
        var pricing = ResolvePricingPolicy(log, pricingPolicies);

        var inputCostUsd = CalculateCost(
            log.PromptTokens,
            pricing.InputPricePerMillionTokensUsd);

        var outputCostUsd = CalculateCost(
            log.CompletionTokens,
            pricing.OutputPricePerMillionTokensUsd);

        var estimatedTotalCostUsd = inputCostUsd + outputCostUsd;
        var actualTotalCostUsd = pricing.IsFreeTier ? 0m : estimatedTotalCostUsd;
        var estimatedTotalCostVnd = estimatedTotalCostUsd * pricing.ExchangeRateToVnd;
        var actualTotalCostVnd = actualTotalCostUsd * pricing.ExchangeRateToVnd;
        var freeTierSavingsUsd = Math.Max(estimatedTotalCostUsd - actualTotalCostUsd, 0m);
        var freeTierSavingsVnd = freeTierSavingsUsd * pricing.ExchangeRateToVnd;

        return new CostedAiUsage
        {
            Log = log,
            InputPricePerMillionTokensUsd = pricing.InputPricePerMillionTokensUsd,
            OutputPricePerMillionTokensUsd = pricing.OutputPricePerMillionTokensUsd,
            EstimatedTotalCostUsd = estimatedTotalCostUsd,
            ActualTotalCostUsd = actualTotalCostUsd,
            EstimatedTotalCostVnd = estimatedTotalCostVnd,
            ActualTotalCostVnd = actualTotalCostVnd,
            FreeTierSavingsUsd = freeTierSavingsUsd,
            FreeTierSavingsVnd = freeTierSavingsVnd,
            IsFreeTier = pricing.IsFreeTier
        };
    }

    private static PricingSnapshot ResolvePricingPolicy(
        AiUsageLog log,
        List<AIModelPricingPolicy> pricingPolicies)
    {
        var provider = Normalize(log.Provider);
        var model = NormalizeModelName(log.Model);

        var policy = pricingPolicies
            .Where(x =>
                Normalize(x.Provider) == provider &&
                NormalizeModelName(x.ModelName) == model &&
                x.EffectiveFrom <= log.CreatedAt)
            .OrderByDescending(x => x.EffectiveFrom)
            .FirstOrDefault();

        if (policy == null)
        {
            return new PricingSnapshot
            {
                InputPricePerMillionTokensUsd = 0m,
                OutputPricePerMillionTokensUsd = 0m,
                ExchangeRateToVnd = DefaultExchangeRateToVnd,
                IsFreeTier = true
            };
        }

        return new PricingSnapshot
        {
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
        List<CostedAiUsage> logs,
        Func<CostedAiUsage, string> keySelector)
    {
        return logs
            .GroupBy(keySelector)
            .OrderByDescending(g => g.Sum(x => x.EstimatedTotalCostVnd))
            .Select(g => new AICostBreakdownItemResponse
            {
                Key = g.Key,
                RequestCount = g.Count(),
                SuccessCount = g.Count(x => IsStatus(x.Log.Status, "SUCCESS")),
                FailedCount = g.Count(x => !IsStatus(x.Log.Status, "SUCCESS")),
                InputTokens = g.Sum(x => (long)x.Log.PromptTokens),
                OutputTokens = g.Sum(x => (long)x.Log.CompletionTokens),
                TotalTokens = g.Sum(x => (long)x.Log.TotalTokens),
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

        return fieldName == "Provider"
            ? Normalize(value)
            : value.Trim();
    }

    private static string NormalizeFeature(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? "Unknown"
            : value.Trim();
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

    private sealed class UsageSnapshot
    {
        public int InputTokens { get; set; }

        public int OutputTokens { get; set; }

        public int TotalTokens { get; set; }
    }

    private sealed class PricingSnapshot
    {
        public decimal InputPricePerMillionTokensUsd { get; set; }

        public decimal OutputPricePerMillionTokensUsd { get; set; }

        public decimal ExchangeRateToVnd { get; set; }

        public bool IsFreeTier { get; set; }
    }

    private sealed class CostedAiUsage
    {
        public AiUsageLog Log { get; set; } = new();

        public decimal InputPricePerMillionTokensUsd { get; set; }

        public decimal OutputPricePerMillionTokensUsd { get; set; }

        public decimal EstimatedTotalCostUsd { get; set; }

        public decimal ActualTotalCostUsd { get; set; }

        public decimal EstimatedTotalCostVnd { get; set; }

        public decimal ActualTotalCostVnd { get; set; }

        public decimal FreeTierSavingsUsd { get; set; }

        public decimal FreeTierSavingsVnd { get; set; }

        public bool IsFreeTier { get; set; }
    }
}
