using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace AITasker.Infrastructure.JobAssistant;

public class GroqJobAssistantProvider : IAiJobAssistantProvider
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public GroqJobAssistantProvider(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;
    }

    public async Task<AiJobSuggestionResult> SuggestAsync(
        AiJobSuggestionRequest request,
        CancellationToken cancellationToken = default)
    {
        var apiKey = _configuration["BusinessVerification:Groq:ApiKey"];
        var baseUrl = _configuration["BusinessVerification:Groq:BaseUrl"]
            ?? "https://api.groq.com/openai/v1";
        var model = _configuration["BusinessVerification:Groq:Model"]
            ?? "llama-3.3-70b-versatile";

        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(request.ShortRequirement))
        {
            return Fallback(request.ShortRequirement);
        }

        try
        {
            var payload = new
            {
                model,
                messages = new[]
                {
                    new
                    {
                        role = "system",
                        content = """
                        You are an AI Job Assistant for an AI-services freelance marketplace.
                        Given a short requirement from a non-technical client, produce a clear AI job posting.
                        Return JSON only, no markdown, with exactly these keys:
                        title (string), description (string), requiredSkills (array of strings),
                        budgetMin (number), budgetMax (number), timelineDays (integer),
                        expectedDeliverables (string), complexity (one of SIMPLE, MEDIUM, COMPLEX).
                        """
                    },
                    new { role = "user", content = request.ShortRequirement.Trim() }
                },
                temperature = 0.3,
                max_tokens = 800,
                response_format = new { type = "json_object" }
            };

            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/chat/completions");
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            httpRequest.Content = new StringContent(
                JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return Fallback(request.ShortRequirement);
            }

            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            using var doc = JsonDocument.Parse(body);
            var content = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            if (string.IsNullOrWhiteSpace(content))
            {
                return Fallback(request.ShortRequirement);
            }

            using var contentDoc = JsonDocument.Parse(content);
            var root = contentDoc.RootElement;

            return new AiJobSuggestionResult
            {
                Title = GetString(root, "title", "AI Project"),
                Description = GetString(root, "description", request.ShortRequirement.Trim()),
                RequiredSkills = GetStringArray(root, "requiredSkills"),
                BudgetMin = GetDecimal(root, "budgetMin", 0),
                BudgetMax = GetDecimal(root, "budgetMax", 0),
                TimelineDays = GetInt(root, "timelineDays", 30),
                ExpectedDeliverables = GetString(root, "expectedDeliverables", "Source code, documentation"),
                Complexity = NormalizeComplexity(GetString(root, "complexity", "MEDIUM")),
                IsFallback = false
            };
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch
        {
            return Fallback(request.ShortRequirement);
        }
    }

    private static AiJobSuggestionResult Fallback(string shortRequirement)
    {
        var text = string.IsNullOrWhiteSpace(shortRequirement) ? "AI automation project" : shortRequirement.Trim();
        return new AiJobSuggestionResult
        {
            Title = text.Length <= 80 ? text : text[..80],
            Description = text,
            RequiredSkills = new List<string>(),
            BudgetMin = 0,
            BudgetMax = 0,
            TimelineDays = 30,
            ExpectedDeliverables = "Demo, source code, documentation",
            Complexity = "MEDIUM",
            IsFallback = true
        };
    }

    private static string NormalizeComplexity(string value)
    {
        var v = value.Trim().ToUpperInvariant();
        return v is "SIMPLE" or "MEDIUM" or "COMPLEX" ? v : "MEDIUM";
    }

    private static string GetString(JsonElement root, string name, string fallback)
        => root.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.String
            ? p.GetString() ?? fallback : fallback;

    private static int GetInt(JsonElement root, string name, int fallback)
        => root.TryGetProperty(name, out var p) && p.TryGetInt32(out var v) ? v : fallback;

    private static decimal GetDecimal(JsonElement root, string name, decimal fallback)
        => root.TryGetProperty(name, out var p) && p.TryGetDecimal(out var v) ? v : fallback;

    private static List<string> GetStringArray(JsonElement root, string name)
    {
        var list = new List<string>();
        if (root.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in p.EnumerateArray())
            {
                if (item.ValueKind == JsonValueKind.String)
                {
                    var s = item.GetString();
                    if (!string.IsNullOrWhiteSpace(s)) list.Add(s);
                }
            }
        }
        return list;
    }
}
