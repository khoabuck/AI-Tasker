using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace AITasker.Infrastructure.BusinessVerification;

public class GroqExpertProfileReviewProvider : IExpertProfileReviewProvider
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public GroqExpertProfileReviewProvider(
        HttpClient httpClient,
        IConfiguration configuration
    )
    {
        _httpClient = httpClient;
        _configuration = configuration;
    }

    public async Task<ExpertProfileReviewProviderResult> ReviewAsync(
        ExpertProfileReviewProviderRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var apiKey = _configuration["BusinessVerification:Groq:ApiKey"];
        var baseUrl = _configuration["BusinessVerification:Groq:BaseUrl"]
            ?? "https://api.groq.com/openai/v1";
        var model = _configuration["BusinessVerification:Groq:Model"]
            ?? "llama-3.3-70b-versatile";

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return PendingReview(
                "Groq API key is missing. Expert profile requires support review."
            );
        }

        try
        {
            var prompt = BuildPrompt(request);

            var payload = new
            {
                model,
                messages = new[]
                {
                    new
                    {
                        role = "system",
                        content = """
                        You are an AI Expert Profile Checker for an AI freelance marketplace.
                        You review whether an expert profile is credible, AI-related, and supported by URL evidence.
                        The backend has already inspected URLs using HttpClient.
                        Use the backend URL inspection evidence as the source of truth.
                        Return JSON only. Do not return markdown. Do not add text outside JSON.
                        """
                    },
                    new
                    {
                        role = "user",
                        content = prompt
                    }
                },
                temperature = 0.2,
                max_tokens = 800
            };

            using var requestMessage = new HttpRequestMessage(
                HttpMethod.Post,
                $"{baseUrl.TrimEnd('/')}/chat/completions"
            );

            requestMessage.Headers.Authorization =
                new AuthenticationHeaderValue("Bearer", apiKey);

            requestMessage.Content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                "application/json"
            );

            using var response = await _httpClient.SendAsync(
                requestMessage,
                cancellationToken
            );

            var responseText = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return PendingReview(
                    $"AI provider error: {(int)response.StatusCode}. Support review is required."
                );
            }

            var groqResponse = JsonSerializer.Deserialize<GroqChatCompletionResponse>(
                responseText,
                new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                }
            );

            var content = groqResponse?.Choices?.FirstOrDefault()?.Message?.Content;

            if (string.IsNullOrWhiteSpace(content))
            {
                return PendingReview(
                    "AI provider returned empty response. Support review is required."
                );
            }

            var result = ParseAiResult(content);

            return NormalizeResult(result);
        }
        catch
        {
            return PendingReview(
                "AI profile review failed due to a system error. Support review is required."
            );
        }
    }

    private static string BuildPrompt(ExpertProfileReviewProviderRequest request)
    {
        var certificatesText = request.Certificates.Count == 0
            ? "No certificates provided."
            : string.Join(
                "\n",
                request.Certificates.Select((c, index) =>
                    $"{index + 1}. Name: {c.CertificateName}; Issuer: {c.CertificateIssuer}; Url: {c.CertificateUrl}; IssuedAt: {c.IssuedAt:yyyy-MM-dd}"
                )
            );

        var urlEvidenceText = request.UrlInspectionResults.Count == 0
            ? "No URL evidence was collected."
            : string.Join(
                "\n\n",
                request.UrlInspectionResults.Select((x, index) =>
                    $"""
                    URL Evidence {index + 1}
                    Label: {x.Label}
                    URL: {x.Url}
                    RequiredProof: {x.IsRequiredProof}
                    IsReachable: {x.IsReachable}
                    IsBlockedOrUnknown: {x.IsBlockedOrUnknown}
                    StatusCode: {x.StatusCode}
                    ContentType: {x.ContentType ?? "N/A"}
                    PageTitle: {x.PageTitle ?? "N/A"}
                    MetaDescription: {x.MetaDescription ?? "N/A"}
                    TextSnippet: {x.TextSnippet ?? "N/A"}
                    ErrorMessage: {x.ErrorMessage ?? "N/A"}
                    """
                )
            );

        return $$"""
        Review this AI expert profile.

        Professional Title:
        {{request.ProfessionalTitle}}

        Bio:
        {{request.Bio}}

        Skills:
        {{request.Skills}}

        Years of Experience:
        {{request.YearsOfExperience}}

        Expected Project Budget:
        {{request.ExpectedProjectBudgetMin}} - {{request.ExpectedProjectBudgetMax}}

        Preferred Project Duration Days:
        {{request.PreferredProjectDurationDays}}

        Available For Work:
        {{request.AvailableForWork}}

        Portfolio URL:
        {{request.PortfolioUrl ?? "N/A"}}

        LinkedIn URL:
        {{request.LinkedInUrl ?? "N/A"}}

        GitHub URL:
        {{request.GitHubUrl ?? "N/A"}}

        Certificates:
        {{certificatesText}}

        Backend URL Inspection Evidence:
        {{urlEvidenceText}}

        Evaluation rules:
        - Use Backend URL Inspection Evidence as the source of truth for whether links are reachable.
        - APPROVED only if the profile is AI-related and has credible proof from reachable portfolio, GitHub, LinkedIn, or certificate URLs.
        - If a required proof URL returns 404, 500, invalid content, or clearly unrelated content, return NEEDS_CORRECTION.
        - If an important proof URL is blocked, timed out, rate-limited, or cannot be inspected, return PENDING_REVIEW instead of APPROVED.
        - If URL content does not match the claimed certificate, skill, portfolio, or AI experience, return NEEDS_CORRECTION or PENDING_REVIEW.
        - Do not approve based only on user-written text. At least one proof link must support the claimed AI expertise.
        - Classify the expert into one category:
          AI_AUTOMATION, CHATBOT_DEVELOPER, LLM_ENGINEER, DATA_ANALYST, COMPUTER_VISION, PROMPT_ENGINEER, AI_CONSULTANT, RPA_AUTOMATION, OTHER.
        - Level must be one of: JUNIOR, MID, SENIOR, UNKNOWN.
        - Profile score must be from 0 to 100.

        Return JSON only in this exact shape:
        {
          "status": "APPROVED | NEEDS_CORRECTION | PENDING_REVIEW",
          "profileScore": 0,
          "level": "JUNIOR | MID | SENIOR | UNKNOWN",
          "expertCategory": "AI_AUTOMATION | CHATBOT_DEVELOPER | LLM_ENGINEER | DATA_ANALYST | COMPUTER_VISION | PROMPT_ENGINEER | AI_CONSULTANT | RPA_AUTOMATION | OTHER",
          "reviewNote": "short review note explaining how URL evidence supports or does not support the profile",
          "missingInformation": "what user must fix, or null"
        }
        """;
    }

    private static ExpertProfileReviewProviderResult ParseAiResult(string content)
    {
        var json = ExtractJson(content);

        var result = JsonSerializer.Deserialize<ExpertProfileReviewProviderResult>(
            json,
            new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }
        );

        return result ?? PendingReview(
            "AI response could not be parsed. Support review is required."
        );
    }

    private static string ExtractJson(string content)
    {
        var trimmed = content.Trim();

        var firstBrace = trimmed.IndexOf('{');
        var lastBrace = trimmed.LastIndexOf('}');

        if (firstBrace >= 0 && lastBrace > firstBrace)
        {
            return trimmed[firstBrace..(lastBrace + 1)];
        }

        return trimmed;
    }

    private static ExpertProfileReviewProviderResult NormalizeResult(
        ExpertProfileReviewProviderResult result
    )
    {
        var allowedStatuses = new HashSet<string>
        {
            "APPROVED",
            "NEEDS_CORRECTION",
            "PENDING_REVIEW"
        };

        var allowedLevels = new HashSet<string>
        {
            "JUNIOR",
            "MID",
            "SENIOR",
            "UNKNOWN"
        };

        var allowedCategories = new HashSet<string>
        {
            "AI_AUTOMATION",
            "CHATBOT_DEVELOPER",
            "LLM_ENGINEER",
            "DATA_ANALYST",
            "COMPUTER_VISION",
            "PROMPT_ENGINEER",
            "AI_CONSULTANT",
            "RPA_AUTOMATION",
            "OTHER"
        };

        result.Status = NormalizeText(result.Status, "PENDING_REVIEW").ToUpperInvariant();
        result.Level = NormalizeText(result.Level, "UNKNOWN").ToUpperInvariant();
        result.ExpertCategory = NormalizeText(result.ExpertCategory, "OTHER").ToUpperInvariant();

        if (!allowedStatuses.Contains(result.Status))
        {
            result.Status = "PENDING_REVIEW";
        }

        if (!allowedLevels.Contains(result.Level))
        {
            result.Level = "UNKNOWN";
        }

        if (!allowedCategories.Contains(result.ExpertCategory))
        {
            result.ExpertCategory = "OTHER";
        }

        if (result.ProfileScore < 0)
        {
            result.ProfileScore = 0;
        }

        if (result.ProfileScore > 100)
        {
            result.ProfileScore = 100;
        }

        if (string.IsNullOrWhiteSpace(result.ReviewNote))
        {
            result.ReviewNote = "AI profile review completed.";
        }

        return result;
    }

    private static string NormalizeText(string? value, string fallback)
    {
        return string.IsNullOrWhiteSpace(value)
            ? fallback
            : value.Trim();
    }

    private static ExpertProfileReviewProviderResult PendingReview(string note)
    {
        return new ExpertProfileReviewProviderResult
        {
            Status = "PENDING_REVIEW",
            ProfileScore = 0,
            Level = "UNKNOWN",
            ExpertCategory = "OTHER",
            ReviewNote = note,
            MissingInformation = null
        };
    }

    private class GroqChatCompletionResponse
    {
        public List<GroqChoice>? Choices { get; set; }
    }

    private class GroqChoice
    {
        public GroqMessage? Message { get; set; }
    }

    private class GroqMessage
    {
        public string? Content { get; set; }
    }
}