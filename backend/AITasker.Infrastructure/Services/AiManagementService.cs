using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace AITasker.Infrastructure.Services;

public class AiManagementService : IAiManagementService
{
    private const string ProviderName = "Groq";
    private const string DefaultPrimaryModel = "openai/gpt-oss-120b";
    private const string DefaultFallbackModel = "qwen/qwen3.6-27b";
    private const int DefaultMonthlyTokenLimit = 1_000_000;
    private const int DefaultMonthlyRequestLimit = 50_000;
    private const int DefaultDailyRequestLimitPerUser = 50;

    private readonly AITaskerDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IAdminAuditLogService _adminAuditLogService;

    public AiManagementService(
        AITaskerDbContext context,
        IConfiguration configuration,
        IAdminAuditLogService adminAuditLogService)
    {
        _context = context;
        _configuration = configuration;
        _adminAuditLogService = adminAuditLogService;
    }

    public async Task<AiSettingsResponse> GetSettingsAsync()
    {
        var settings = await GetOrCreateActiveSettingsEntityAsync();
        var allowedModels = await GetAllowedModelsAsync();

        return MapSettingsToResponse(settings, allowedModels);
    }

    public async Task<AiSettingsResponse> UpdateSettingsAsync(
        int adminId,
        UpdateAiSettingsRequest request)
    {
        ValidateUpdateRequest(request);

        var allowedModels = await GetAllowedModelsAsync();
        var primaryModel = request.PrimaryModel?.Trim() ?? string.Empty;
        var fallbackModel = string.IsNullOrWhiteSpace(request.FallbackModel)
            ? null
            : request.FallbackModel.Trim();

        ValidateModel(primaryModel, allowedModels, "Primary model");

        if (!string.IsNullOrWhiteSpace(fallbackModel))
        {
            ValidateModel(fallbackModel, allowedModels, "Fallback model");

            if (string.Equals(primaryModel, fallbackModel, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "Fallback model must be different from primary model."
                );
            }
        }

        var settings = await GetOrCreateActiveSettingsEntityAsync();
        var oldValue = BuildAuditValue(settings);

        settings.PrimaryModel = primaryModel;
        settings.FallbackModel = fallbackModel;
        settings.IsEnabled = request.IsEnabled;
        settings.MonthlyTokenLimit = request.MonthlyTokenLimit;
        settings.MonthlyRequestLimit = request.MonthlyRequestLimit;
        settings.DailyRequestLimitPerUser = request.DailyRequestLimitPerUser;
        settings.UpdatedAt = DateTime.UtcNow;
        settings.UpdatedByAdminId = adminId;

        await _context.SaveChangesAsync();

        await _adminAuditLogService.LogAsync(
            adminId,
            "UPDATE_AI_SETTINGS",
            nameof(AiSettings),
            settings.AiSettingsId,
            oldValue,
            BuildAuditValue(settings),
            request.Reason
        );

        return MapSettingsToResponse(settings, allowedModels);
    }

    public async Task<AiSettings> GetOrCreateActiveSettingsEntityAsync()
    {
        var settings = await _context.AiSettings
            .Include(x => x.UpdatedByAdmin)
            .FirstOrDefaultAsync(x => x.IsActive && x.Provider == ProviderName);

        if (settings != null)
        {
            return settings;
        }

        var defaultSettings = new AiSettings
        {
            Provider = ProviderName,
            PrimaryModel = GetConfiguredPrimaryModel(),
            FallbackModel = GetConfiguredFallbackModel(),
            IsEnabled = true,
            MonthlyTokenLimit = DefaultMonthlyTokenLimit,
            MonthlyRequestLimit = DefaultMonthlyRequestLimit,
            DailyRequestLimitPerUser = DefaultDailyRequestLimitPerUser,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.AiSettings.Add(defaultSettings);
        await _context.SaveChangesAsync();

        return defaultSettings;
    }

    public Task<IReadOnlyList<string>> GetAllowedModelsAsync()
    {
        var configuredModels = _configuration
            .GetSection("Groq:AllowedModels")
            .Get<string[]>() ?? Array.Empty<string>();

        var businessVerificationModels = _configuration
            .GetSection("BusinessVerification:Groq:AllowedModels")
            .Get<string[]>() ?? Array.Empty<string>();

        var models = configuredModels
            .Concat(businessVerificationModels)
            .Concat(new[]
            {
                GetConfiguredPrimaryModel(),
                GetConfiguredFallbackModel(),
                DefaultPrimaryModel,
                DefaultFallbackModel
            })
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x!.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        return Task.FromResult<IReadOnlyList<string>>(models);
    }

    public async Task<AiUsageSummaryResponse> GetUsageSummaryAsync(int days = 30)
    {
        days = Math.Clamp(days, 1, 365);
        var to = DateTime.UtcNow;
        var from = to.AddDays(-days);

        var query = _context.AiUsageLogs
            .AsNoTracking()
            .Where(x => x.CreatedAt >= from && x.CreatedAt <= to);

        var logs = await query.ToListAsync();

        return new AiUsageSummaryResponse
        {
            From = from,
            To = to,
            TotalRequests = logs.Count,
            SuccessfulRequests = logs.Count(x => x.Status == "SUCCESS"),
            FailedRequests = logs.Count(x => x.Status != "SUCCESS"),
            FallbackRequests = logs.Count(x => x.UsedFallback),
            TotalPromptTokens = logs.Sum(x => x.PromptTokens),
            TotalCompletionTokens = logs.Sum(x => x.CompletionTokens),
            TotalTokens = logs.Sum(x => x.TotalTokens),
            EstimatedCostUsd = 0m
        };
    }

    public async Task<IReadOnlyList<AiUsageByFeatureResponse>> GetUsageByFeatureAsync(int days = 30)
    {
        days = Math.Clamp(days, 1, 365);
        var from = DateTime.UtcNow.AddDays(-days);

        var data = await _context.AiUsageLogs
            .AsNoTracking()
            .Where(x => x.CreatedAt >= from)
            .GroupBy(x => x.Feature)
            .Select(g => new AiUsageByFeatureResponse
            {
                Feature = g.Key,
                Requests = g.Count(),
                SuccessfulRequests = g.Count(x => x.Status == "SUCCESS"),
                FailedRequests = g.Count(x => x.Status != "SUCCESS"),
                FallbackRequests = g.Count(x => x.UsedFallback),
                PromptTokens = g.Sum(x => x.PromptTokens),
                CompletionTokens = g.Sum(x => x.CompletionTokens),
                TotalTokens = g.Sum(x => x.TotalTokens)
            })
            .OrderByDescending(x => x.TotalTokens)
            .ThenByDescending(x => x.Requests)
            .ToListAsync();

        return data;
    }

    public async Task<IReadOnlyList<AiUsageLogResponse>> GetUsageLogsAsync(
        int take = 100,
        int days = 30)
    {
        take = Math.Clamp(take, 1, 500);
        days = Math.Clamp(days, 1, 365);
        var from = DateTime.UtcNow.AddDays(-days);

        var logs = await _context.AiUsageLogs
            .AsNoTracking()
            .Include(x => x.User)
            .Where(x => x.CreatedAt >= from)
            .OrderByDescending(x => x.CreatedAt)
            .Take(take)
            .Select(x => new AiUsageLogResponse
            {
                AiUsageLogId = x.AiUsageLogId,
                UserId = x.UserId,
                UserEmail = x.User != null ? x.User.Email : null,
                UserFullName = x.User != null ? x.User.FullName : null,
                Feature = x.Feature,
                EntityType = x.EntityType,
                EntityId = x.EntityId,
                Provider = x.Provider,
                Model = x.Model,
                UsedFallback = x.UsedFallback,
                PromptTokens = x.PromptTokens,
                CompletionTokens = x.CompletionTokens,
                TotalTokens = x.TotalTokens,
                Status = x.Status,
                StatusCode = x.StatusCode,
                ErrorCode = x.ErrorCode,
                ErrorMessage = x.ErrorMessage,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync();

        return logs;
    }

    private string GetConfiguredPrimaryModel()
    {
        return NormalizeConfiguredModel(_configuration["Groq:PrimaryModel"])
            ?? NormalizeConfiguredModel(_configuration["Groq:Model"])
            ?? NormalizeConfiguredModel(_configuration["BusinessVerification:Groq:PrimaryModel"])
            ?? NormalizeConfiguredModel(_configuration["BusinessVerification:Groq:Model"])
            ?? DefaultPrimaryModel;
    }

    private string? GetConfiguredFallbackModel()
    {
        return NormalizeConfiguredModel(_configuration["Groq:FallbackModel"])
            ?? NormalizeConfiguredModel(_configuration["BusinessVerification:Groq:FallbackModel"])
            ?? DefaultFallbackModel;
    }

    private static string? NormalizeConfiguredModel(string? model)
    {
        if (string.IsNullOrWhiteSpace(model))
        {
            return null;
        }

        var normalized = model.Trim();

        return normalized.StartsWith("llama-3.3-", StringComparison.OrdinalIgnoreCase)
            ? null
            : normalized;
    }

    private static void ValidateUpdateRequest(UpdateAiSettingsRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.PrimaryModel))
        {
            throw new InvalidOperationException("Primary model is required.");
        }

        ValidateRange(request.MonthlyTokenLimit, 1, 100_000_000, "Monthly token limit");
        ValidateRange(request.MonthlyRequestLimit, 1, 10_000_000, "Monthly request limit");
        ValidateRange(request.DailyRequestLimitPerUser, 1, 100_000, "Daily request limit per user");

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            throw new InvalidOperationException(
                "Reason is required when updating AI settings."
            );
        }

        if (request.Reason.Trim().Length > 500)
        {
            throw new InvalidOperationException(
                "Reason must be at most 500 characters."
            );
        }
    }

    private static void ValidateRange(int value, int min, int max, string fieldName)
    {
        if (value < min || value > max)
        {
            throw new InvalidOperationException(
                $"{fieldName} must be between {min} and {max}."
            );
        }
    }

    private static void ValidateModel(
        string model,
        IReadOnlyList<string> allowedModels,
        string fieldName)
    {
        if (!allowedModels.Contains(model, StringComparer.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"{fieldName} is not in the allowed model list."
            );
        }
    }

    private static AiSettingsResponse MapSettingsToResponse(
        AiSettings settings,
        IReadOnlyList<string> allowedModels)
    {
        return new AiSettingsResponse
        {
            AiSettingsId = settings.AiSettingsId,
            Provider = settings.Provider,
            PrimaryModel = settings.PrimaryModel,
            FallbackModel = settings.FallbackModel,
            IsEnabled = settings.IsEnabled,
            MonthlyTokenLimit = settings.MonthlyTokenLimit,
            MonthlyRequestLimit = settings.MonthlyRequestLimit,
            DailyRequestLimitPerUser = settings.DailyRequestLimitPerUser,
            AllowedModels = allowedModels,
            IsActive = settings.IsActive,
            CreatedAt = settings.CreatedAt,
            UpdatedAt = settings.UpdatedAt,
            UpdatedByAdminId = settings.UpdatedByAdminId,
            UpdatedByAdminEmail = settings.UpdatedByAdmin?.Email,
            UpdatedByAdminFullName = settings.UpdatedByAdmin?.FullName
        };
    }

    private static string BuildAuditValue(AiSettings settings)
    {
        return string.Join("; ", new[]
        {
            $"AiSettingsId={settings.AiSettingsId}",
            $"Provider={settings.Provider}",
            $"PrimaryModel={settings.PrimaryModel}",
            $"FallbackModel={settings.FallbackModel ?? "NULL"}",
            $"IsEnabled={settings.IsEnabled}",
            $"MonthlyTokenLimit={settings.MonthlyTokenLimit}",
            $"MonthlyRequestLimit={settings.MonthlyRequestLimit}",
            $"DailyRequestLimitPerUser={settings.DailyRequestLimitPerUser}",
            $"IsActive={settings.IsActive}",
            $"UpdatedByAdminId={settings.UpdatedByAdminId?.ToString() ?? "NULL"}",
            $"UpdatedAt={FormatDateTime(settings.UpdatedAt)}"
        });
    }

    private static string FormatDateTime(DateTime? value)
    {
        return value.HasValue ? value.Value.ToString("O") : "NULL";
    }
}
