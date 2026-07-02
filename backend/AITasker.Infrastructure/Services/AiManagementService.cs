using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
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
    private const string DefaultBaseUrl = "https://api.groq.com/openai/v1";
    private const string DefaultModel = "openai/gpt-oss-120b";
    private const int DefaultJobAssistantMaxTokens = 3000;
    private const int DefaultExpertSkillMaxTokens = 1500;
    private const int DefaultProfileReviewMaxTokens = 2000;
    private const int DefaultSkillValidatorMaxTokens = 1200;
    private const double DefaultTemperature = 0.1;
    private const bool DefaultJsonObjectResponse = true;
    private const int DefaultMonthlyTokenLimit = 1_000_000;
    private const int DefaultMonthlyRequestLimit = 50_000;
    private const int DefaultDailyRequestLimitPerUser = 50;

    private readonly AITaskerDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IAdminAuditLogService _adminAuditLogService;
    private readonly IHttpClientFactory _httpClientFactory;

    public AiManagementService(
        AITaskerDbContext context,
        IConfiguration configuration,
        IAdminAuditLogService adminAuditLogService,
        IHttpClientFactory httpClientFactory)
    {
        _context = context;
        _configuration = configuration;
        _adminAuditLogService = adminAuditLogService;
        _httpClientFactory = httpClientFactory;
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

        var model = request.Model.Trim();
        var allowedModels = await GetEnabledAllowedModelsAsync();
        ValidateModelEnabled(model, allowedModels);

        var selectedModel = allowedModels.First(x =>
            x.Model.Equals(model, StringComparison.OrdinalIgnoreCase)
        );

        if (request.JsonObjectResponse && !selectedModel.SupportsJsonObjectResponse)
        {
            throw new InvalidOperationException("Selected model does not support JSON object response mode.");
        }

        ValidateMaxTokensAgainstModel(request, selectedModel);

        var settings = await GetOrCreateActiveSettingsEntityAsync();
        var oldValue = BuildAuditValue(settings);

        settings.Model = model;
        settings.IsEnabled = request.IsEnabled;
        settings.JobAssistantMaxTokens = request.JobAssistantMaxTokens;
        settings.ExpertSkillMaxTokens = request.ExpertSkillMaxTokens;
        settings.ProfileReviewMaxTokens = request.ProfileReviewMaxTokens;
        settings.SkillValidatorMaxTokens = request.SkillValidatorMaxTokens;
        settings.Temperature = request.Temperature;
        settings.JsonObjectResponse = request.JsonObjectResponse;
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

        var allModels = await GetAllowedModelsAsync();
        return MapSettingsToResponse(settings, allModels);
    }

    public async Task<AiSettings> GetOrCreateActiveSettingsEntityAsync()
    {
        await EnsureDefaultAllowedModelsAsync();

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
            Model = GetConfiguredModel(),
            IsEnabled = true,
            JobAssistantMaxTokens = DefaultJobAssistantMaxTokens,
            ExpertSkillMaxTokens = DefaultExpertSkillMaxTokens,
            ProfileReviewMaxTokens = DefaultProfileReviewMaxTokens,
            SkillValidatorMaxTokens = DefaultSkillValidatorMaxTokens,
            Temperature = DefaultTemperature,
            JsonObjectResponse = DefaultJsonObjectResponse,
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

    public async Task<IReadOnlyList<AiAllowedModelResponse>> GetAllowedModelsAsync()
    {
        await EnsureDefaultAllowedModelsAsync();

        return await _context.AiAllowedModels
            .AsNoTracking()
            .Include(x => x.UpdatedByAdmin)
            .Where(x => x.Provider == ProviderName)
            .OrderByDescending(x => x.IsEnabled)
            .ThenBy(x => x.DisplayName)
            .Select(x => new AiAllowedModelResponse
            {
                AiAllowedModelId = x.AiAllowedModelId,
                Provider = x.Provider,
                Model = x.Model,
                DisplayName = x.DisplayName,
                IsEnabled = x.IsEnabled,
                SupportsJsonObjectResponse = x.SupportsJsonObjectResponse,
                MaxOutputTokens = x.MaxOutputTokens,
                Notes = x.Notes,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt,
                UpdatedByAdminId = x.UpdatedByAdminId,
                UpdatedByAdminEmail = x.UpdatedByAdmin != null ? x.UpdatedByAdmin.Email : null,
                UpdatedByAdminFullName = x.UpdatedByAdmin != null ? x.UpdatedByAdmin.FullName : null
            })
            .ToListAsync();
    }

    public async Task<AiAllowedModelResponse> CreateAllowedModelAsync(
        int adminId,
        CreateAiAllowedModelRequest request)
    {
        ValidateCreateAllowedModelRequest(request);

        var model = NormalizeModelOrThrow(request.Model);

        var exists = await _context.AiAllowedModels
            .AnyAsync(x => x.Provider == ProviderName && x.Model == model);

        if (exists)
        {
            throw new InvalidOperationException("AI model already exists in the model catalog.");
        }

        var entity = new AiAllowedModel
        {
            Provider = ProviderName,
            Model = model,
            DisplayName = request.DisplayName.Trim(),
            IsEnabled = request.IsEnabled,
            SupportsJsonObjectResponse = request.SupportsJsonObjectResponse,
            MaxOutputTokens = request.MaxOutputTokens,
            Notes = NormalizeOptionalText(request.Notes, 1000),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            UpdatedByAdminId = adminId
        };

        _context.AiAllowedModels.Add(entity);
        await _context.SaveChangesAsync();

        await _adminAuditLogService.LogAsync(
            adminId,
            "CREATE_AI_ALLOWED_MODEL",
            nameof(AiAllowedModel),
            entity.AiAllowedModelId,
            null,
            BuildAuditValue(entity),
            request.Reason
        );

        return await GetAllowedModelResponseAsync(entity.AiAllowedModelId);
    }

    public async Task<AiAllowedModelResponse> UpdateAllowedModelAsync(
        int adminId,
        int aiAllowedModelId,
        UpdateAiAllowedModelRequest request)
    {
        ValidateUpdateAllowedModelRequest(request);

        var entity = await _context.AiAllowedModels
            .FirstOrDefaultAsync(x => x.AiAllowedModelId == aiAllowedModelId && x.Provider == ProviderName);

        if (entity == null)
        {
            throw new InvalidOperationException("AI model was not found.");
        }

        var oldValue = BuildAuditValue(entity);

        entity.DisplayName = request.DisplayName.Trim();
        entity.IsEnabled = request.IsEnabled;
        entity.SupportsJsonObjectResponse = request.SupportsJsonObjectResponse;
        entity.MaxOutputTokens = request.MaxOutputTokens;
        entity.Notes = NormalizeOptionalText(request.Notes, 1000);
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedByAdminId = adminId;

        await _context.SaveChangesAsync();

        await _adminAuditLogService.LogAsync(
            adminId,
            "UPDATE_AI_ALLOWED_MODEL",
            nameof(AiAllowedModel),
            entity.AiAllowedModelId,
            oldValue,
            BuildAuditValue(entity),
            request.Reason
        );

        return await GetAllowedModelResponseAsync(entity.AiAllowedModelId);
    }

    public async Task<TestAiModelResponse> TestModelAsync(
        int adminId,
        TestAiModelRequest request)
    {
        var settings = await GetOrCreateActiveSettingsEntityAsync();
        var model = string.IsNullOrWhiteSpace(request.Model)
            ? settings.Model
            : request.Model.Trim();

        var enabledModels = await GetEnabledAllowedModelsAsync();
        ValidateModelEnabled(model, enabledModels);

        ValidateRange(request.MaxTokens, 1, 4096, "Test model max tokens");

        if (request.Temperature < 0 || request.Temperature > 1)
        {
            throw new InvalidOperationException("Temperature must be between 0 and 1.");
        }

        var apiKey = GetApiKey();
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return new TestAiModelResponse
            {
                Ok = false,
                Model = model,
                Status = "FAILED",
                ErrorCode = "missing_api_key",
                Message = "Groq API key is missing."
            };
        }

        var client = _httpClientFactory.CreateClient();
        using var httpRequest = new HttpRequestMessage(
            HttpMethod.Post,
            $"{GetBaseUrl().TrimEnd('/')}/chat/completions"
        );
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        var payload = BuildTestPayload(model, request);
        httpRequest.Content = new StringContent(
            JsonSerializer.Serialize(payload),
            Encoding.UTF8,
            "application/json"
        );

        var stopwatch = Stopwatch.StartNew();
        using var response = await client.SendAsync(httpRequest);
        stopwatch.Stop();

        var responseText = await response.Content.ReadAsStringAsync();
        var statusCode = (int)response.StatusCode;

        if (!response.IsSuccessStatusCode)
        {
            return new TestAiModelResponse
            {
                Ok = false,
                Model = model,
                Status = "FAILED",
                StatusCode = statusCode,
                ErrorCode = ExtractErrorCode(responseText),
                Message = Truncate(ExtractErrorMessage(responseText) ?? responseText, 1000),
                LatencyMs = stopwatch.ElapsedMilliseconds
            };
        }

        var (content, promptTokens, completionTokens, totalTokens) = ParseTestResponse(responseText);

        await _adminAuditLogService.LogAsync(
            adminId,
            "TEST_AI_MODEL",
            nameof(AiAllowedModel),
            null,
            null,
            $"Model={model}; StatusCode={statusCode}; TotalTokens={totalTokens}",
            "Admin tested AI model connectivity."
        );

        return new TestAiModelResponse
        {
            Ok = true,
            Model = model,
            Status = "SUCCESS",
            StatusCode = statusCode,
            PromptTokens = promptTokens,
            CompletionTokens = completionTokens,
            TotalTokens = totalTokens,
            Content = content,
            LatencyMs = stopwatch.ElapsedMilliseconds,
            Message = "Model test completed successfully."
        };
    }

    public async Task<AiUsageSummaryResponse> GetUsageSummaryAsync(int days = 30)
    {
        days = Math.Clamp(days, 1, 365);
        var to = DateTime.UtcNow;
        var from = to.AddDays(-days);

        var logs = await _context.AiUsageLogs
            .AsNoTracking()
            .Where(x => x.CreatedAt >= from && x.CreatedAt <= to)
            .ToListAsync();

        var settings = await GetOrCreateActiveSettingsEntityAsync();
        var totalTokens = logs.Sum(x => x.TotalTokens);
        var totalRequests = logs.Count;

        return new AiUsageSummaryResponse
        {
            From = from,
            To = to,
            TotalRequests = totalRequests,
            SuccessfulRequests = logs.Count(x => x.Status == "SUCCESS"),
            FailedRequests = logs.Count(x => x.Status != "SUCCESS"),
            TotalPromptTokens = logs.Sum(x => x.PromptTokens),
            TotalCompletionTokens = logs.Sum(x => x.CompletionTokens),
            TotalTokens = totalTokens,
            EstimatedCostUsd = 0m,
            MonthlyTokenLimit = settings.MonthlyTokenLimit,
            MonthlyRequestLimit = settings.MonthlyRequestLimit,
            TokenUsagePercent = settings.MonthlyTokenLimit <= 0
                ? 0m
                : Math.Round(totalTokens * 100m / settings.MonthlyTokenLimit, 2),
            RequestUsagePercent = settings.MonthlyRequestLimit <= 0
                ? 0m
                : Math.Round(totalRequests * 100m / settings.MonthlyRequestLimit, 2)
        };
    }

    public async Task<IReadOnlyList<AiUsageByFeatureResponse>> GetUsageByFeatureAsync(int days = 30)
    {
        days = Math.Clamp(days, 1, 365);
        var from = DateTime.UtcNow.AddDays(-days);

        return await _context.AiUsageLogs
            .AsNoTracking()
            .Where(x => x.CreatedAt >= from)
            .GroupBy(x => x.Feature)
            .Select(g => new AiUsageByFeatureResponse
            {
                Feature = g.Key,
                Requests = g.Count(),
                SuccessfulRequests = g.Count(x => x.Status == "SUCCESS"),
                FailedRequests = g.Count(x => x.Status != "SUCCESS"),
                PromptTokens = g.Sum(x => x.PromptTokens),
                CompletionTokens = g.Sum(x => x.CompletionTokens),
                TotalTokens = g.Sum(x => x.TotalTokens),
                EstimatedCostUsd = 0m
            })
            .OrderByDescending(x => x.TotalTokens)
            .ThenByDescending(x => x.Requests)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<AiUsageLogResponse>> GetUsageLogsAsync(
        int take = 100,
        int days = 30)
    {
        take = Math.Clamp(take, 1, 500);
        days = Math.Clamp(days, 1, 365);
        var from = DateTime.UtcNow.AddDays(-days);

        return await _context.AiUsageLogs
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
    }

    private async Task EnsureDefaultAllowedModelsAsync()
    {
        var hasAny = await _context.AiAllowedModels
            .AnyAsync(x => x.Provider == ProviderName);

        if (hasAny)
        {
            return;
        }

        var now = DateTime.UtcNow;
        _context.AiAllowedModels.AddRange(
            new AiAllowedModel
            {
                Provider = ProviderName,
                Model = "openai/gpt-oss-120b",
                DisplayName = "GPT OSS 120B",
                IsEnabled = true,
                SupportsJsonObjectResponse = true,
                MaxOutputTokens = 65536,
                Notes = "Recommended main model for JSON-heavy AI features.",
                CreatedAt = now
            },
            new AiAllowedModel
            {
                Provider = ProviderName,
                Model = "qwen/qwen3.6-27b",
                DisplayName = "Qwen 3.6 27B",
                IsEnabled = true,
                SupportsJsonObjectResponse = true,
                MaxOutputTokens = 4096,
                Notes = "Alternative model. Test before using for strict JSON features.",
                CreatedAt = now
            }
        );

        await _context.SaveChangesAsync();
    }

    private async Task<List<AiAllowedModel>> GetEnabledAllowedModelsAsync()
    {
        await EnsureDefaultAllowedModelsAsync();

        return await _context.AiAllowedModels
            .AsNoTracking()
            .Where(x => x.Provider == ProviderName && x.IsEnabled)
            .ToListAsync();
    }

    private async Task<AiAllowedModelResponse> GetAllowedModelResponseAsync(int aiAllowedModelId)
    {
        var response = await _context.AiAllowedModels
            .AsNoTracking()
            .Include(x => x.UpdatedByAdmin)
            .Where(x => x.AiAllowedModelId == aiAllowedModelId)
            .Select(x => new AiAllowedModelResponse
            {
                AiAllowedModelId = x.AiAllowedModelId,
                Provider = x.Provider,
                Model = x.Model,
                DisplayName = x.DisplayName,
                IsEnabled = x.IsEnabled,
                SupportsJsonObjectResponse = x.SupportsJsonObjectResponse,
                MaxOutputTokens = x.MaxOutputTokens,
                Notes = x.Notes,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt,
                UpdatedByAdminId = x.UpdatedByAdminId,
                UpdatedByAdminEmail = x.UpdatedByAdmin != null ? x.UpdatedByAdmin.Email : null,
                UpdatedByAdminFullName = x.UpdatedByAdmin != null ? x.UpdatedByAdmin.FullName : null
            })
            .FirstOrDefaultAsync();

        return response ?? throw new InvalidOperationException("AI model was not found.");
    }

    private string GetConfiguredModel()
    {
        return NormalizeConfiguredModel(_configuration["Groq:Model"])
            ?? NormalizeConfiguredModel(_configuration["BusinessVerification:Groq:Model"])
            ?? DefaultModel;
    }

    private string GetApiKey()
    {
        return _configuration["Groq:ApiKey"]
            ?? _configuration["BusinessVerification:Groq:ApiKey"]
            ?? string.Empty;
    }

    private string GetBaseUrl()
    {
        return _configuration["Groq:BaseUrl"]
            ?? _configuration["BusinessVerification:Groq:BaseUrl"]
            ?? DefaultBaseUrl;
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

    private static string NormalizeModelOrThrow(string model)
    {
        if (string.IsNullOrWhiteSpace(model))
        {
            throw new InvalidOperationException("Model is required.");
        }

        var normalized = model.Trim();
        if (normalized.Length > 100)
        {
            throw new InvalidOperationException("Model must be at most 100 characters.");
        }

        if (normalized.StartsWith("llama-3.3-", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Deprecated model is not allowed.");
        }

        return normalized;
    }

    private static string? NormalizeOptionalText(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }

    private static void ValidateUpdateRequest(UpdateAiSettingsRequest request)
    {
        NormalizeModelOrThrow(request.Model);

        ValidateRange(request.JobAssistantMaxTokens, 500, 65536, "Job assistant max tokens");
        ValidateRange(request.ExpertSkillMaxTokens, 500, 65536, "Expert skill max tokens");
        ValidateRange(request.ProfileReviewMaxTokens, 500, 65536, "Profile review max tokens");
        ValidateRange(request.SkillValidatorMaxTokens, 200, 65536, "Skill validator max tokens");

        if (request.Temperature < 0 || request.Temperature > 1)
        {
            throw new InvalidOperationException("Temperature must be between 0 and 1.");
        }

        ValidateRange(request.MonthlyTokenLimit, 1, 100_000_000, "Monthly token limit");
        ValidateRange(request.MonthlyRequestLimit, 1, 10_000_000, "Monthly request limit");
        ValidateRange(request.DailyRequestLimitPerUser, 1, 100_000, "Daily request limit per user");
        ValidateReason(request.Reason);
    }

    private static void ValidateCreateAllowedModelRequest(CreateAiAllowedModelRequest request)
    {
        NormalizeModelOrThrow(request.Model);

        if (string.IsNullOrWhiteSpace(request.DisplayName))
        {
            throw new InvalidOperationException("Display name is required.");
        }

        if (request.DisplayName.Trim().Length > 150)
        {
            throw new InvalidOperationException("Display name must be at most 150 characters.");
        }

        ValidateRange(request.MaxOutputTokens, 1, 65536, "Max output tokens");
        ValidateReason(request.Reason);
    }

    private static void ValidateUpdateAllowedModelRequest(UpdateAiAllowedModelRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.DisplayName))
        {
            throw new InvalidOperationException("Display name is required.");
        }

        if (request.DisplayName.Trim().Length > 150)
        {
            throw new InvalidOperationException("Display name must be at most 150 characters.");
        }

        ValidateRange(request.MaxOutputTokens, 1, 65536, "Max output tokens");
        ValidateReason(request.Reason);
    }

    private static void ValidateRange(int value, int min, int max, string fieldName)
    {
        if (value < min || value > max)
        {
            throw new InvalidOperationException($"{fieldName} must be between {min} and {max}.");
        }
    }

    private static void ValidateReason(string reason)
    {
        if (string.IsNullOrWhiteSpace(reason))
        {
            throw new InvalidOperationException("Reason is required.");
        }

        if (reason.Trim().Length > 500)
        {
            throw new InvalidOperationException("Reason must be at most 500 characters.");
        }
    }

    private static void ValidateModelEnabled(string model, IReadOnlyList<AiAllowedModel> enabledModels)
    {
        if (!enabledModels.Any(x => x.Model.Equals(model, StringComparison.OrdinalIgnoreCase)))
        {
            throw new InvalidOperationException("Model is not enabled in AI model catalog.");
        }
    }

    private static void ValidateMaxTokensAgainstModel(
        UpdateAiSettingsRequest request,
        AiAllowedModel selectedModel)
    {
        var max = selectedModel.MaxOutputTokens;

        if (request.JobAssistantMaxTokens > max ||
            request.ExpertSkillMaxTokens > max ||
            request.ProfileReviewMaxTokens > max ||
            request.SkillValidatorMaxTokens > max)
        {
            throw new InvalidOperationException(
                $"One or more max token settings exceed selected model max output tokens ({max})."
            );
        }
    }

    private static AiSettingsResponse MapSettingsToResponse(
        AiSettings settings,
        IReadOnlyList<AiAllowedModelResponse> allowedModels)
    {
        return new AiSettingsResponse
        {
            AiSettingsId = settings.AiSettingsId,
            Provider = settings.Provider,
            Model = settings.Model,
            IsEnabled = settings.IsEnabled,
            JobAssistantMaxTokens = settings.JobAssistantMaxTokens,
            ExpertSkillMaxTokens = settings.ExpertSkillMaxTokens,
            ProfileReviewMaxTokens = settings.ProfileReviewMaxTokens,
            SkillValidatorMaxTokens = settings.SkillValidatorMaxTokens,
            Temperature = settings.Temperature,
            JsonObjectResponse = settings.JsonObjectResponse,
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

    private static object BuildTestPayload(string model, TestAiModelRequest request)
    {
        var messages = new[]
        {
            new
            {
                role = "system",
                content = "Return exactly one valid JSON object only. Do not return markdown."
            },
            new
            {
                role = "user",
                content = request.Message
            }
        };

        if (request.JsonObjectResponse)
        {
            return new
            {
                model,
                messages,
                temperature = request.Temperature,
                max_tokens = request.MaxTokens,
                response_format = new
                {
                    type = "json_object"
                }
            };
        }

        return new
        {
            model,
            messages,
            temperature = request.Temperature,
            max_tokens = request.MaxTokens
        };
    }

    private static (string Content, int PromptTokens, int CompletionTokens, int TotalTokens) ParseTestResponse(string responseText)
    {
        using var document = JsonDocument.Parse(responseText);
        var root = document.RootElement;

        var content = root
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? string.Empty;

        var promptTokens = 0;
        var completionTokens = 0;
        var totalTokens = 0;

        if (root.TryGetProperty("usage", out var usage))
        {
            promptTokens = GetIntProperty(usage, "prompt_tokens");
            completionTokens = GetIntProperty(usage, "completion_tokens");
            totalTokens = GetIntProperty(usage, "total_tokens");
        }

        return (content, promptTokens, completionTokens, totalTokens);
    }

    private static int GetIntProperty(JsonElement element, string name)
    {
        return element.TryGetProperty(name, out var property) && property.TryGetInt32(out var value)
            ? value
            : 0;
    }

    private static string? ExtractErrorCode(string responseText)
    {
        try
        {
            using var document = JsonDocument.Parse(responseText);
            var root = document.RootElement;

            if (root.TryGetProperty("error", out var error) &&
                error.TryGetProperty("code", out var codeElement))
            {
                return codeElement.GetString();
            }
        }
        catch
        {
            return null;
        }

        return null;
    }

    private static string? ExtractErrorMessage(string responseText)
    {
        try
        {
            using var document = JsonDocument.Parse(responseText);
            var root = document.RootElement;

            if (root.TryGetProperty("error", out var error) &&
                error.TryGetProperty("message", out var messageElement))
            {
                return messageElement.GetString();
            }
        }
        catch
        {
            return null;
        }

        return null;
    }

    private static string? Truncate(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return value;
        }

        return value.Length <= maxLength
            ? value
            : value[..maxLength];
    }

    private static string BuildAuditValue(AiSettings settings)
    {
        return string.Join("; ", new[]
        {
            $"AiSettingsId={settings.AiSettingsId}",
            $"Provider={settings.Provider}",
            $"Model={settings.Model}",
            $"IsEnabled={settings.IsEnabled}",
            $"JobAssistantMaxTokens={settings.JobAssistantMaxTokens}",
            $"ExpertSkillMaxTokens={settings.ExpertSkillMaxTokens}",
            $"ProfileReviewMaxTokens={settings.ProfileReviewMaxTokens}",
            $"SkillValidatorMaxTokens={settings.SkillValidatorMaxTokens}",
            $"Temperature={settings.Temperature}",
            $"JsonObjectResponse={settings.JsonObjectResponse}",
            $"MonthlyTokenLimit={settings.MonthlyTokenLimit}",
            $"MonthlyRequestLimit={settings.MonthlyRequestLimit}",
            $"DailyRequestLimitPerUser={settings.DailyRequestLimitPerUser}",
            $"IsActive={settings.IsActive}",
            $"UpdatedByAdminId={settings.UpdatedByAdminId?.ToString() ?? "NULL"}",
            $"UpdatedAt={FormatDateTime(settings.UpdatedAt)}"
        });
    }

    private static string BuildAuditValue(AiAllowedModel model)
    {
        return string.Join("; ", new[]
        {
            $"AiAllowedModelId={model.AiAllowedModelId}",
            $"Provider={model.Provider}",
            $"Model={model.Model}",
            $"DisplayName={model.DisplayName}",
            $"IsEnabled={model.IsEnabled}",
            $"SupportsJsonObjectResponse={model.SupportsJsonObjectResponse}",
            $"MaxOutputTokens={model.MaxOutputTokens}",
            $"Notes={model.Notes ?? "NULL"}",
            $"UpdatedByAdminId={model.UpdatedByAdminId?.ToString() ?? "NULL"}",
            $"UpdatedAt={FormatDateTime(model.UpdatedAt)}"
        });
    }

    private static string FormatDateTime(DateTime? value)
    {
        return value.HasValue ? value.Value.ToString("O") : "NULL";
    }
}
