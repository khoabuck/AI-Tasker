using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace AITasker.Infrastructure.Services;

public class GroqJobAssistantProvider : IJobAssistantProvider
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public GroqJobAssistantProvider(
        HttpClient httpClient,
        IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;
    }

    public async Task<JobAiAnalysisResult> AnalyzeAsync(
        JobAssistantRequest request,
        List<string> availableSkills)
    {
        var apiKey =
            _configuration["Groq:ApiKey"] ??
            _configuration["BusinessVerification:Groq:ApiKey"];

        var model =
            _configuration["Groq:Model"] ??
            _configuration["BusinessVerification:Groq:Model"];

        var baseUrl =
            _configuration["Groq:BaseUrl"] ??
            _configuration["BusinessVerification:Groq:BaseUrl"] ??
            "https://api.groq.com/openai/v1";

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("Groq API key is missing.");
        }

        if (string.IsNullOrWhiteSpace(model))
        {
            throw new InvalidOperationException("Groq model is missing.");
        }

        var prompt = BuildPrompt(request, availableSkills);

        var body = new
        {
            model,
            messages = new object[]
            {
                new
                {
                    role = "system",
                    content = "You are an AI job requirement analyst for an AI freelance marketplace. Return JSON only. Do not return markdown."
                },
                new
                {
                    role = "user",
                    content = prompt
                }
            },
            temperature = 0.2,
            max_tokens = 1200
        };

        var jsonBody = JsonSerializer.Serialize(body);

        var endpoint = $"{baseUrl.TrimEnd('/')}/chat/completions";

        using var httpRequest = new HttpRequestMessage(
            HttpMethod.Post,
            endpoint
        );

        httpRequest.Headers.Authorization =
            new AuthenticationHeaderValue("Bearer", apiKey);

        httpRequest.Content = new StringContent(
            jsonBody,
            Encoding.UTF8,
            "application/json"
        );

        using var response = await _httpClient.SendAsync(httpRequest);

        var responseContent = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"Groq job assistant failed: {responseContent}"
            );
        }

        var aiText = ExtractAssistantText(responseContent);

        return ParseAiResult(aiText);
    }

    private static string BuildPrompt(
        JobAssistantRequest request,
        List<string> availableSkills)
    {
        var skillsText = string.Join(", ", availableSkills);

        return $$"""
        Analyze this client job requirement and improve it for an AI service marketplace.

        Client raw requirement:
        {{request.RawRequirement}}

        BudgetMin: {{request.BudgetMin}}
        BudgetMax: {{request.BudgetMax}}
        Deadline: {{request.Deadline}}
        ProjectTypeHint: {{request.ProjectTypeHint}}

        Available skills in system:
        {{skillsText}}

        Rules:
        - The client may not understand technical complexity.
        - You must estimate complexity as SIMPLE, MEDIUM, COMPLEX, or UNKNOWN.
        - SuggestedSkillNames must only use names from Available skills.
        - Do not invent skill names outside the available skills list.
        - If the requirement is vague, still suggest a practical improved version.
        - Keep the result practical for a real software project.
        - Return JSON only.
        - Do not wrap the JSON in markdown.
        - Do not add explanation outside JSON.

        JSON format:
        {
          "suggestedTitle": "string",
          "improvedDescription": "string",
          "aiGeneratedDescription": "string",
          "suggestedProjectType": "string",
          "suggestedComplexity": "SIMPLE | MEDIUM | COMPLEX | UNKNOWN",
          "expectedDeliverables": "string",
          "suggestedSkillNames": ["string"],
          "warnings": ["string"]
        }
        """;
    }

    private static string ExtractAssistantText(string responseContent)
    {
        using var document = JsonDocument.Parse(responseContent);

        var root = document.RootElement;

        var content = root
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString();

        if (string.IsNullOrWhiteSpace(content))
        {
            throw new InvalidOperationException("AI response is empty.");
        }

        return content;
    }

    private static JobAiAnalysisResult ParseAiResult(string aiText)
    {
        var cleaned = CleanAiJson(aiText);

        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };

        var result = JsonSerializer.Deserialize<JobAiAnalysisResult>(
            cleaned,
            options
        );

        if (result == null)
        {
            throw new InvalidOperationException("Cannot parse AI job assistant result.");
        }

        result.SuggestedTitle = result.SuggestedTitle?.Trim() ?? string.Empty;
        result.ImprovedDescription = result.ImprovedDescription?.Trim() ?? string.Empty;
        result.AiGeneratedDescription = result.AiGeneratedDescription?.Trim() ?? string.Empty;
        result.SuggestedProjectType = result.SuggestedProjectType?.Trim() ?? string.Empty;
        result.ExpectedDeliverables = result.ExpectedDeliverables?.Trim() ?? string.Empty;
        result.SuggestedComplexity = NormalizeComplexity(result.SuggestedComplexity);

        result.SuggestedSkillNames = result.SuggestedSkillNames?
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList() ?? new List<string>();

        result.Warnings = result.Warnings?
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .ToList() ?? new List<string>();

        return result;
    }

    private static string CleanAiJson(string aiText)
    {
        var cleaned = aiText.Trim();

        if (cleaned.StartsWith("```"))
        {
            cleaned = cleaned
                .Replace("```json", "", StringComparison.OrdinalIgnoreCase)
                .Replace("```", "")
                .Trim();
        }

        var firstBrace = cleaned.IndexOf('{');
        var lastBrace = cleaned.LastIndexOf('}');

        if (firstBrace < 0 || lastBrace < 0 || lastBrace <= firstBrace)
        {
            throw new InvalidOperationException(
                "AI response does not contain valid JSON object."
            );
        }

        return cleaned.Substring(firstBrace, lastBrace - firstBrace + 1);
    }

    private static string NormalizeComplexity(string? complexity)
    {
        if (string.IsNullOrWhiteSpace(complexity))
        {
            return "UNKNOWN";
        }

        var normalized = complexity.Trim().ToUpper();

        if (normalized is "SIMPLE" or "MEDIUM" or "COMPLEX" or "UNKNOWN")
        {
            return normalized;
        }

        return "UNKNOWN";
    }
}