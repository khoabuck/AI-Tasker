using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using AITasker.Application.DTOs.Ai;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace AITasker.Infrastructure.AI;

public class GroqChatCompletionService : IGroqChatCompletionService
{
    private const string ProviderName = "Groq";
    private const string SuccessStatus = "SUCCESS";
    private const string FailedStatus = "FAILED";
    private const string BlockedStatus = "BLOCKED";
    private const string DefaultBaseUrl = "https://api.groq.com/openai/v1";
    private const string DefaultModel = "openai/gpt-oss-120b";

    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly AITaskerDbContext _context;
    private readonly IAiManagementService _aiManagementService;

    public GroqChatCompletionService(
        HttpClient httpClient,
        IConfiguration configuration,
        AITaskerDbContext context,
        IAiManagementService aiManagementService)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _context = context;
        _aiManagementService = aiManagementService;
    }

    public async Task<GroqChatCompletionResult> CreateChatCompletionAsync(
        GroqChatCompletionRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.Messages.Count == 0)
        {
            throw new InvalidOperationException("AI request must contain at least one message.");
        }

        var apiKey = GetApiKey();
        var baseUrl = GetBaseUrl();
        var settings = await _aiManagementService.GetOrCreateActiveSettingsEntityAsync();
        var model = FirstNonEmpty(settings.Model, GetConfiguredModel(), DefaultModel);
        var allowedModels = await _aiManagementService.GetAllowedModelsAsync();
        var enabledModel = allowedModels.FirstOrDefault(x =>
            x.IsEnabled && x.Model.Equals(model, StringComparison.OrdinalIgnoreCase)
        );

        if (enabledModel == null)
        {
            await LogUsageAsync(
                request,
                model,
                status: FailedStatus,
                statusCode: null,
                errorCode: "model_not_enabled",
                errorMessage: "Selected AI model is not enabled in AI model catalog.",
                cancellationToken: cancellationToken
            );

            throw new InvalidOperationException("Selected AI model is not enabled in AI model catalog.");
        }

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            await LogUsageAsync(
                request,
                model,
                status: FailedStatus,
                statusCode: null,
                errorCode: "missing_api_key",
                errorMessage: "Groq API key is missing.",
                cancellationToken: cancellationToken
            );

            throw new InvalidOperationException("Groq API key is missing.");
        }

        if (!settings.IsEnabled)
        {
            await LogUsageAsync(
                request,
                model,
                status: BlockedStatus,
                statusCode: null,
                errorCode: "ai_disabled",
                errorMessage: "AI feature is disabled by admin.",
                cancellationToken: cancellationToken
            );

            throw new InvalidOperationException("AI feature is currently disabled.");
        }

        await EnsureUsageLimitAsync(settings, request, model, cancellationToken);

        var effectiveRequest = BuildEffectiveRequest(request, settings);

        if (effectiveRequest.MaxTokens.HasValue && effectiveRequest.MaxTokens.Value > enabledModel.MaxOutputTokens)
        {
            await LogUsageAsync(
                request,
                model,
                FailedStatus,
                statusCode: null,
                errorCode: "max_tokens_exceeded",
                errorMessage: $"Requested max tokens exceed model max output tokens ({enabledModel.MaxOutputTokens}).",
                cancellationToken: cancellationToken
            );

            throw new InvalidOperationException($"Requested max tokens exceed model max output tokens ({enabledModel.MaxOutputTokens}).");
        }

        if (effectiveRequest.JsonObjectResponse == true && !enabledModel.SupportsJsonObjectResponse)
        {
            await LogUsageAsync(
                request,
                model,
                FailedStatus,
                statusCode: null,
                errorCode: "json_mode_not_supported",
                errorMessage: "Selected AI model does not support JSON object response mode.",
                cancellationToken: cancellationToken
            );

            throw new InvalidOperationException("Selected AI model does not support JSON object response mode.");
        }
        var endpoint = $"{baseUrl.TrimEnd('/')}/chat/completions";

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, endpoint);
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        var payload = BuildPayload(effectiveRequest, model);
        httpRequest.Content = new StringContent(
            JsonSerializer.Serialize(payload),
            Encoding.UTF8,
            "application/json"
        );

        using var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        var responseText = await response.Content.ReadAsStringAsync(cancellationToken);
        var statusCode = (int)response.StatusCode;

        if (!response.IsSuccessStatusCode)
        {
            var errorCode = ExtractErrorCode(responseText);
            var errorMessage = ExtractErrorMessage(responseText);

            await LogUsageAsync(
                request,
                model,
                FailedStatus,
                statusCode,
                errorCode,
                Truncate(errorMessage ?? responseText, 1000),
                cancellationToken: cancellationToken
            );

            throw new InvalidOperationException(
                $"Groq AI request failed. {Truncate(errorMessage ?? responseText, 1000)}"
            );
        }

        GroqChatCompletionResult result;

        try
        {
            result = ParseSuccessResponse(responseText, model);
        }
        catch (Exception ex)
        {
            await LogUsageAsync(
                request,
                model,
                FailedStatus,
                statusCode,
                errorCode: "invalid_groq_response",
                errorMessage: Truncate(ex.Message, 1000),
                cancellationToken: cancellationToken
            );

            throw new InvalidOperationException("Groq response is invalid or empty.");
        }

        await LogUsageAsync(
            request,
            model,
            SuccessStatus,
            statusCode,
            errorCode: null,
            errorMessage: null,
            promptTokens: result.PromptTokens,
            completionTokens: result.CompletionTokens,
            totalTokens: result.TotalTokens,
            cancellationToken: cancellationToken
        );

        return result;
    }

    private static object BuildPayload(GroqChatCompletionRequest request, string model)
    {
        var messages = request.Messages.Select(message => new
        {
            role = message.Role,
            content = message.Content
        }).ToArray();

        var maxTokens = request.MaxTokens;

        if (request.JsonObjectResponse == true)
        {
            return new
            {
                model,
                messages,
                temperature = request.Temperature,
                max_tokens = maxTokens,
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
            max_tokens = maxTokens
        };
    }

    private static GroqChatCompletionResult ParseSuccessResponse(
        string responseText,
        string model)
    {
        using var document = JsonDocument.Parse(responseText);
        var root = document.RootElement;

        var content = root
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString();

        if (string.IsNullOrWhiteSpace(content))
        {
            throw new InvalidOperationException("Groq response contains empty assistant content.");
        }

        var promptTokens = 0;
        var completionTokens = 0;
        var totalTokens = 0;

        if (root.TryGetProperty("usage", out var usage))
        {
            promptTokens = GetIntProperty(usage, "prompt_tokens");
            completionTokens = GetIntProperty(usage, "completion_tokens");
            totalTokens = GetIntProperty(usage, "total_tokens");
        }

        return new GroqChatCompletionResult
        {
            Content = content,
            Model = model,
            PromptTokens = promptTokens,
            CompletionTokens = completionTokens,
            TotalTokens = totalTokens,
            RawResponse = responseText
        };
    }

    private GroqChatCompletionRequest BuildEffectiveRequest(
        GroqChatCompletionRequest request,
        AiSettings settings)
    {
        return new GroqChatCompletionRequest
        {
            UserId = request.UserId,
            Feature = request.Feature,
            EntityType = request.EntityType,
            EntityId = request.EntityId,
            Messages = request.Messages,
            MaxTokens = request.MaxTokens ?? ResolveMaxTokens(settings, request.Feature),
            Temperature = request.Temperature ?? settings.Temperature,
            JsonObjectResponse = request.JsonObjectResponse ?? settings.JsonObjectResponse
        };
    }

    private static int ResolveMaxTokens(AiSettings settings, string feature)
    {
        return feature switch
        {
            "JobAssistant" => settings.JobAssistantMaxTokens,
            "ExpertSkillAnalysis" => settings.ExpertSkillMaxTokens,
            "ExpertProfileReview" => settings.ProfileReviewMaxTokens,
            "JobSkillRelevanceValidation" => settings.SkillValidatorMaxTokens,
            _ => 1500
        };
    }

    private async Task EnsureUsageLimitAsync(
        AiSettings settings,
        GroqChatCompletionRequest request,
        string model,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var monthlyRequests = await _context.AiUsageLogs
            .AsNoTracking()
            .CountAsync(x => x.CreatedAt >= monthStart, cancellationToken);

        if (monthlyRequests >= settings.MonthlyRequestLimit)
        {
            await LogUsageAsync(
                request,
                model,
                BlockedStatus,
                statusCode: null,
                errorCode: "monthly_request_limit_exceeded",
                errorMessage: "Monthly AI request limit has been reached.",
                cancellationToken: cancellationToken
            );

            throw new InvalidOperationException("Monthly AI request limit has been reached.");
        }

        var monthlyTokens = await _context.AiUsageLogs
            .AsNoTracking()
            .Where(x => x.CreatedAt >= monthStart)
            .SumAsync(x => x.TotalTokens, cancellationToken);

        if (monthlyTokens >= settings.MonthlyTokenLimit)
        {
            await LogUsageAsync(
                request,
                model,
                BlockedStatus,
                statusCode: null,
                errorCode: "monthly_token_limit_exceeded",
                errorMessage: "Monthly AI token limit has been reached.",
                cancellationToken: cancellationToken
            );

            throw new InvalidOperationException("Monthly AI token limit has been reached.");
        }

        if (request.UserId.HasValue)
        {
            var todayStart = now.Date;
            var dailyUserRequests = await _context.AiUsageLogs
                .AsNoTracking()
                .CountAsync(
                    x => x.UserId == request.UserId.Value && x.CreatedAt >= todayStart,
                    cancellationToken
                );

            if (dailyUserRequests >= settings.DailyRequestLimitPerUser)
            {
                await LogUsageAsync(
                    request,
                    model,
                    BlockedStatus,
                    statusCode: null,
                    errorCode: "daily_user_request_limit_exceeded",
                    errorMessage: "Daily AI request limit per user has been reached.",
                    cancellationToken: cancellationToken
                );

                throw new InvalidOperationException("Daily AI request limit per user has been reached.");
            }
        }
    }

    private async Task LogUsageAsync(
        GroqChatCompletionRequest request,
        string model,
        string status,
        int? statusCode,
        string? errorCode,
        string? errorMessage,
        int promptTokens = 0,
        int completionTokens = 0,
        int totalTokens = 0,
        CancellationToken cancellationToken = default)
    {
        var log = new AiUsageLog
        {
            UserId = request.UserId,
            Feature = string.IsNullOrWhiteSpace(request.Feature)
                ? "Unknown"
                : request.Feature.Trim(),
            EntityType = string.IsNullOrWhiteSpace(request.EntityType)
                ? null
                : request.EntityType.Trim(),
            EntityId = request.EntityId,
            Provider = ProviderName,
            Model = model,
            PromptTokens = promptTokens,
            CompletionTokens = completionTokens,
            TotalTokens = totalTokens,
            Status = status,
            StatusCode = statusCode,
            ErrorCode = Truncate(errorCode, 100),
            ErrorMessage = Truncate(errorMessage, 1000),
            CreatedAt = DateTime.UtcNow
        };

        _context.AiUsageLogs.Add(log);
        await _context.SaveChangesAsync(cancellationToken);
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

    private string GetConfiguredModel()
    {
        return NormalizeConfiguredModel(_configuration["Groq:Model"])
            ?? NormalizeConfiguredModel(_configuration["BusinessVerification:Groq:Model"])
            ?? DefaultModel;
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

    private static string FirstNonEmpty(params string?[] values)
    {
        return values.FirstOrDefault(x => !string.IsNullOrWhiteSpace(x))?.Trim()
            ?? string.Empty;
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
}
