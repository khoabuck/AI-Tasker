using System.Text.Json;
using AITasker.Application.DTOs.Ai;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;

namespace AITasker.Infrastructure.Services;

public class GroqJobSkillRelevanceValidator : IJobSkillRelevanceValidator
{
    private readonly IGroqChatCompletionService _groqChatCompletionService;

    public GroqJobSkillRelevanceValidator(IGroqChatCompletionService groqChatCompletionService)
    {
        _groqChatCompletionService = groqChatCompletionService;
    }

    public async Task<JobSkillRelevanceValidationResult> ValidateAsync(
        JobSkillRelevanceValidationRequest request)
    {
        var prompt = BuildPrompt(request);

        var aiResponse = await _groqChatCompletionService.CreateChatCompletionAsync(
            new GroqChatCompletionRequest
            {
                Feature = "JobSkillRelevanceValidation",
                Messages = new List<GroqChatMessage>
                {
                    new()
                    {
                        Role = "system",
                        Content = "You are an AI quality-control validator for an AI freelance marketplace. Return exactly one valid JSON object only. Do not return markdown, code fences, comments, or explanation."
                    },
                    new()
                    {
                        Role = "user",
                        Content = prompt
                    }
                }
            }
        );

        return ParseResult(
            aiResponse.Content,
            request.SelectedSkillNames,
            request.AvailableSkillNames
        );

    }

    private static string BuildPrompt(JobSkillRelevanceValidationRequest request)
    {
        var selectedSkillsText = string.Join(", ", request.SelectedSkillNames);
        var availableSkillsText = string.Join(", ", request.AvailableSkillNames);

        return $$"""
        Validate whether the client's selected skills match the job requirement.

        Job title:
        {{request.Title}}

        Job description:
        {{request.Description}}

        AI generated description:
        {{request.AiGeneratedDescription}}

        Project type:
        {{request.ProjectType}}

        Complexity:
        {{request.Complexity}}

        Expected deliverables:
        {{request.ExpectedDeliverables}}

        Selected skills by client:
        {{selectedSkillsText}}

        Available skills in system:
        {{availableSkillsText}}

        Rules:
        - Evaluate only the final selected skills chosen by the client.
        - A selected skill is relevant if it directly supports implementing the described project.
        - A selected skill is irrelevant if it is unrelated, misleading, spammy, or only weakly connected to the project.
        - The client may add or remove AI-suggested skills, but the final selected skills must still match the job.
        - If most selected skills are unrelated, set isRelevant to false.
        - If core technical skills are missing, list them in missingCoreSkills.
        - missingCoreSkills and suggestedSkillNames must only use names from Available skills.
        - irrelevantSkills must only use names from Selected skills.
        - relevanceScore must be an integer from 0 to 100.
        - Use a practical threshold: 60+ means acceptable, below 60 means reject.
        - Return JSON only.
        - Do not wrap the JSON in markdown.
        - Do not add text outside JSON.

        JSON format:
        {
          "isRelevant": true,
          "relevanceScore": 85,
          "relevantSkills": ["string"],
          "irrelevantSkills": ["string"],
          "missingCoreSkills": ["string"],
          "suggestedSkillNames": ["string"],
          "reason": "string"
        }
        """;
    }

    private static JobSkillRelevanceValidationResult ParseResult(
        string aiText,
        List<string> selectedSkillNames,
        List<string> availableSkillNames)
    {
        var cleaned = CleanAiJson(aiText);

        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };

        var result = JsonSerializer.Deserialize<JobSkillRelevanceValidationResult>(
            cleaned,
            options
        );

        if (result == null)
        {
            throw new InvalidOperationException("Cannot parse AI skill relevance validation result.");
        }

        var selectedSet = selectedSkillNames
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var availableSet = availableSkillNames
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        result.RelevanceScore = Math.Clamp(result.RelevanceScore, 0, 100);
        result.RelevantSkills = NormalizeList(result.RelevantSkills)
            .Where(selectedSet.Contains)
            .ToList();

        result.IrrelevantSkills = NormalizeList(result.IrrelevantSkills)
            .Where(selectedSet.Contains)
            .ToList();

        result.MissingCoreSkills = NormalizeList(result.MissingCoreSkills)
            .Where(availableSet.Contains)
            .ToList();

        result.SuggestedSkillNames = NormalizeList(result.SuggestedSkillNames)
            .Where(availableSet.Contains)
            .ToList();

        result.Reason = result.Reason?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(result.Reason))
        {
            result.Reason = result.IsRelevant
                ? "Selected skills are relevant to the job requirement."
                : "Selected skills do not sufficiently match the job requirement.";
        }

        return result;
    }

    private static List<string> NormalizeList(List<string>? values)
    {
        return values?
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList() ?? new List<string>();
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
                "AI skill relevance response does not contain valid JSON object."
            );
        }

        return cleaned.Substring(firstBrace, lastBrace - firstBrace + 1);
    }
}
