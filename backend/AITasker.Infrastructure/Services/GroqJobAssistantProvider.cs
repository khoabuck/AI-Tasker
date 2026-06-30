using System.Text.Json;
using AITasker.Application.DTOs.Ai;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;

namespace AITasker.Infrastructure.Services;

public class GroqJobAssistantProvider : IJobAssistantProvider
{
    private readonly IGroqChatCompletionService _groqChatCompletionService;

    public GroqJobAssistantProvider(
        IGroqChatCompletionService groqChatCompletionService)
    {
        _groqChatCompletionService = groqChatCompletionService;
    }

    public async Task<JobAiAnalysisResult> AnalyzeAsync(
        JobAssistantRequest request,
        List<string> availableSkills)
    {
        var prompt = BuildPrompt(request, availableSkills);

        var aiResponse = await _groqChatCompletionService.CreateChatCompletionAsync(
            new GroqChatCompletionRequest
            {
                Feature = "JobAssistant",
                Temperature = 0.2,
                MaxTokens = 1400,
                Messages = new List<GroqChatMessage>
                {
                    new()
                    {
                        Role = "system",
                        Content = "You are an AI job requirement analyst for an AI freelance marketplace. Return JSON only. Do not return markdown."
                    },
                    new()
                    {
                        Role = "user",
                        Content = prompt
                    }
                }
            }
        );

        return ParseAiResult(aiResponse.Content);
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

        Client form values, if already provided:
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
        - Budget suggestion rules:
          1. If BudgetMin or BudgetMax is already provided in the form values, return those values for the matching fields and set suggestedBudgetSource = "FORM".
          2. If the raw requirement explicitly states a budget, extract it and set suggestedBudgetSource = "RAW_REQUIREMENT".
          3. If the raw requirement does not clearly mention budget and form values are empty, estimate a practical VND budget range based on scope, complexity, required skills, likely deliverables, and deadline. Set suggestedBudgetSource = "AI_ESTIMATE".
        - If the raw requirement says a range like "5 million to 10 million VND", "5-10 triệu", or "khoảng 5 tới 10 triệu", return suggestedBudgetMin = 5000000 and suggestedBudgetMax = 10000000.
        - If the raw requirement says a single maximum budget like "budget 10 million VND", return suggestedBudgetMax = 10000000 and suggestedBudgetMin = null.
        - If the raw requirement says a minimum budget, return suggestedBudgetMin.
        - When estimating budget, do not return null unless the requirement is too vague to price at all.
        - Estimated budget must be realistic for Vietnam freelance AI/software projects, not too low, and not enterprise-inflated.
        - Add a short budgetSuggestionNote explaining why the budget was extracted or estimated.
        - Budget values must be numeric VND amounts without commas, currency symbols, or text.
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
          "suggestedBudgetMin": 0,
          "suggestedBudgetMax": 0,
          "suggestedBudgetSource": "FORM | RAW_REQUIREMENT | AI_ESTIMATE | UNKNOWN",
          "budgetSuggestionNote": "string",
          "expectedDeliverables": "string",
          "suggestedSkillNames": ["string"],
          "warnings": ["string"]
        }
        """;
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
        result.SuggestedBudgetMin = NormalizeBudgetValue(result.SuggestedBudgetMin);
        result.SuggestedBudgetMax = NormalizeBudgetValue(result.SuggestedBudgetMax);
        result.SuggestedBudgetSource = NormalizeBudgetSource(result.SuggestedBudgetSource);
        result.BudgetSuggestionNote = result.BudgetSuggestionNote?.Trim() ?? string.Empty;

        if (result.SuggestedBudgetMin.HasValue &&
            result.SuggestedBudgetMax.HasValue &&
            result.SuggestedBudgetMin.Value > result.SuggestedBudgetMax.Value)
        {
            (result.SuggestedBudgetMin, result.SuggestedBudgetMax) =
                (result.SuggestedBudgetMax, result.SuggestedBudgetMin);
        }

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

    private static string NormalizeBudgetSource(string? source)
    {
        if (string.IsNullOrWhiteSpace(source))
        {
            return "UNKNOWN";
        }

        var normalized = source.Trim().ToUpperInvariant();

        return normalized switch
        {
            "FORM" => "FORM",
            "RAW_REQUIREMENT" => "RAW_REQUIREMENT",
            "AI_ESTIMATE" => "AI_ESTIMATE",
            _ => "UNKNOWN"
        };
    }

    private static decimal? NormalizeBudgetValue(decimal? value)
    {
        if (!value.HasValue)
        {
            return null;
        }

        if (value.Value <= 0)
        {
            return null;
        }

        return decimal.Round(value.Value, 0, MidpointRounding.AwayFromZero);
    }
}
