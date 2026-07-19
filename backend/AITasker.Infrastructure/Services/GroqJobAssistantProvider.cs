using System.Globalization;
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
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(availableSkills);

        if (string.IsNullOrWhiteSpace(request.RawRequirement))
        {
            throw new ArgumentException(
                "Raw requirement is required.",
                nameof(request)
            );
        }

        var prompt = BuildPrompt(request, availableSkills);

        var aiResponse = await _groqChatCompletionService
            .CreateChatCompletionAsync(
                new GroqChatCompletionRequest
                {
                    Feature = "JobAssistant",
                    Messages = new List<GroqChatMessage>
                    {
                        new()
                        {
                            Role = "system",
                            Content =
                                "You are an AI job requirement analyst and budget estimator " +
                                "for an AI freelance marketplace. Improve clarity without expanding " +
                                "the client's requested scope. All monetary amounts are VND. " +
                                "Return exactly one valid JSON object only. Do not return markdown, " +
                                "code fences, comments, or explanation outside the JSON object."
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
        var normalizedBudgetMin = NormalizeBudgetValue(request.BudgetMin);
        var normalizedBudgetMax = NormalizeBudgetValue(request.BudgetMax);

        var budgetMinText = FormatOptionalBudget(normalizedBudgetMin);
        var budgetMaxText = FormatOptionalBudget(normalizedBudgetMax);

        var deadlineText = request.Deadline.HasValue
            ? request.Deadline.Value.ToString(
                "O",
                CultureInfo.InvariantCulture
            )
            : "null";

        var projectTypeHintText =
            string.IsNullOrWhiteSpace(request.ProjectTypeHint)
                ? "null"
                : request.ProjectTypeHint.Trim();

        var skillsText = string.Join(
            ", ",
            availableSkills
                .Where(skill => !string.IsNullOrWhiteSpace(skill))
                .Select(skill => skill.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
        );

        return $$"""
        Analyze and improve the following client job requirement for an AI freelance marketplace.

        CLIENT RAW REQUIREMENT:
        {{request.RawRequirement.Trim()}}

        OPTIONAL CLIENT FORM VALUES:
        BudgetMin: {{budgetMinText}}
        BudgetMax: {{budgetMaxText}}
        Deadline: {{deadlineText}}
        ProjectTypeHint: {{projectTypeHintText}}

        AVAILABLE SKILLS IN THE SYSTEM:
        {{skillsText}}

        PRIMARY TASKS:
        1. Rewrite the requirement so it is clearer, less repetitive, internally consistent,
           and understandable to qualified experts.
        2. Preserve the client's requested business scope and major features.
        3. Do not add new committed scope that the client did not request.
        4. Produce concrete, reviewable deliverables that map directly to the requested scope.
        5. Estimate a realistic VND budget range for exactly that scope.
        6. Select the minimum essential skills from AVAILABLE SKILLS and order them from
           most important to least important.

        SCOPE CONTROL RULES:
        - Improve wording, organization, acceptance clarity, and missing context only.
        - Do not transform the request into a larger, enterprise-grade, production-scale,
          or commercial-scale system unless the client explicitly requested that level.
        - Do not invent extra user roles, modules, dashboards, integrations, infrastructure,
          analytics, compliance requirements, support periods, warranties, or deployment work.
        - Do not add offline mode, Power BI, vector databases, RAG, semantic search,
          custom model training, Kubernetes, microservices, message queues, teacher roles,
          password reset, profile management, file upload, or post-delivery support unless
          the client explicitly requested that exact capability.
        - Do not add a technology merely because it exists in AVAILABLE SKILLS.
        - If the client did not choose a specific framework, describe the capability
          generically instead of committing to an unnecessary technology.
        - Responsive web design is not a separate mobile application.
        - Use "mobile application" only when the client explicitly requests a separate
          native or cross-platform iOS/Android application.
        - Do not silently remove a major requested feature because the client's stated
          budget appears too low. Keep the requested scope and recommend a more realistic budget.
        - If a necessary detail is missing, state a concise assumption in warnings.
          Do not convert that assumption into an additional committed feature.

        DESCRIPTION AND DELIVERABLE RULES:
        - suggestedTitle must be concise and describe only the client's improved scope.
        - improvedDescription must contain only the requested features plus necessary
          clarification. It must not include speculative optional features.
        - aiGeneratedDescription must be a concise summary of the same scope.
        - Estimate complexity as SIMPLE, MEDIUM, COMPLEX, or UNKNOWN.
        - expectedDeliverables must map directly to the requested features.
        - Basic source code, configuration, migrations, tests, and short setup documentation
          may be included only when they are necessary to deliver the requested system.
        - Do not add extensive specifications, Power BI templates, warranty periods,
          long-term support, repository history, containerization, or production operations
          unless explicitly requested.
        - The title, descriptions, deliverables, complexity, and skills must be consistent.

        CURRENCY RULES:
        - Every budget amount in the form, raw requirement, output, and notes is VND.
        - Never interpret an amount as USD or another currency.
        - Never convert VND into another currency.
        - Never write "presumably USD" or infer another currency from the size of the number.

        BUDGET RULES:
        - Recommend a realistic VND range for the client's actual requested scope only.
        - Positive BudgetMin and BudgetMax form values are client references.
        - A budget written inside the raw requirement is also a client reference.
        - Zero or negative form values mean the client did not provide that field.
        - Evaluate the reference budget against the requested features, platforms,
          integrations, complexity, deliverables, and deadline.
        - If the client's budget is realistic, you may retain it.
        - If it is materially unrealistic, return a realistic AI-estimated range and explain
          the mismatch in budgetSuggestionNote and warnings.
        - Do not shrink the scope into an unrelated tiny task merely to retain a low budget.
        - If no usable budget was provided, estimate both minimum and maximum values.
        - suggestedBudgetMin and suggestedBudgetMax must always be positive numeric VND values.
        - Never return null, zero, negative values, text, commas, or currency symbols in
          suggestedBudgetMin or suggestedBudgetMax.
        - suggestedBudgetMin must be less than or equal to suggestedBudgetMax.
        - Estimate the budget from the requested scope. Do not add invented work and then
          charge for that invented work.
        - Do not cite hourly rates, market-rate claims, USD rates, developer salaries,
          estimated labor hours, or arithmetic cost formulas in budgetSuggestionNote.
        - budgetSuggestionNote should explain the estimate using scope factors only, such as
          number of platforms, requested modules, AI integrations, complexity, and deadline.
        - Keep the estimate proportionate to the requirement and avoid extreme ranges caused
          by optional features that were not requested.

        BUDGET SOURCE RULES:
        - Use "FORM" only when the final recommended range substantially keeps the positive
          form budget values.
        - Use "RAW_REQUIREMENT" only when the final recommended range substantially keeps
          the explicit budget written in the raw requirement.
        - Use "AI_ESTIMATE" when no usable client budget exists or when an unrealistic
          client budget is materially adjusted or replaced.
        - Use "UNKNOWN" only when pricing genuinely cannot be assessed, but still return
          the best positive preliminary min/max range.

        SKILL RULES:
        - suggestedSkillNames must contain exact names from AVAILABLE SKILLS only.
        - Never invent, translate, rename, abbreviate, or approximate a skill name.
        - Do not select an unrelated skill because an exact matching skill is unavailable.
        - Select only skills directly needed by the requested deliverables.
        - Order skills from most essential to least essential because the platform may apply
          an Admin-configured maximum number of suggested skills.
        - If a requested deliverable has no matching active skill, preserve the requested
          deliverable, omit the unrelated skill, and add a warning that the active skill
          catalog has no direct match.
        - If no available skill is appropriate, return an empty array.

        OUTPUT RULES:
        - Return exactly one valid JSON object.
        - Do not wrap JSON in markdown.
        - Do not include comments or explanation outside JSON.
        - Do not repeat warnings.

        JSON FORMAT:
        {
          "suggestedTitle": "string",
          "improvedDescription": "string",
          "aiGeneratedDescription": "string",
          "suggestedProjectType": "string",
          "suggestedComplexity": "SIMPLE | MEDIUM | COMPLEX | UNKNOWN",
          "suggestedBudgetMin": 1000000,
          "suggestedBudgetMax": 2000000,
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
        if (string.IsNullOrWhiteSpace(aiText))
        {
            throw new InvalidOperationException(
                "AI job assistant returned an empty response."
            );
        }

        var cleaned = CleanAiJson(aiText);

        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };

        JobAiAnalysisResult? result;

        try
        {
            result = JsonSerializer.Deserialize<JobAiAnalysisResult>(
                cleaned,
                options
            );
        }
        catch (JsonException exception)
        {
            throw new InvalidOperationException(
                "Cannot parse AI job assistant result as valid JSON.",
                exception
            );
        }

        if (result == null)
        {
            throw new InvalidOperationException(
                "Cannot parse AI job assistant result."
            );
        }

        result.SuggestedTitle =
            result.SuggestedTitle?.Trim() ?? string.Empty;

        result.ImprovedDescription =
            result.ImprovedDescription?.Trim() ?? string.Empty;

        result.AiGeneratedDescription =
            result.AiGeneratedDescription?.Trim() ?? string.Empty;

        result.SuggestedProjectType =
            result.SuggestedProjectType?.Trim() ?? string.Empty;

        result.ExpectedDeliverables =
            result.ExpectedDeliverables?.Trim() ?? string.Empty;

        result.SuggestedComplexity =
            NormalizeComplexity(result.SuggestedComplexity);

        result.SuggestedBudgetMin =
            NormalizeBudgetValue(result.SuggestedBudgetMin);

        result.SuggestedBudgetMax =
            NormalizeBudgetValue(result.SuggestedBudgetMax);

        NormalizeBudgetRange(result);

        result.SuggestedBudgetSource =
            NormalizeBudgetSource(result.SuggestedBudgetSource);

        result.BudgetSuggestionNote =
            result.BudgetSuggestionNote?.Trim() ?? string.Empty;

        result.SuggestedSkillNames =
            result.SuggestedSkillNames?
                .Where(skill => !string.IsNullOrWhiteSpace(skill))
                .Select(skill => skill.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList()
            ?? new List<string>();

        result.Warnings =
            result.Warnings?
                .Where(warning => !string.IsNullOrWhiteSpace(warning))
                .Select(warning => warning.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList()
            ?? new List<string>();

        return result;
    }

    private static void NormalizeBudgetRange(
        JobAiAnalysisResult result)
    {
        if (!result.SuggestedBudgetMin.HasValue &&
            !result.SuggestedBudgetMax.HasValue)
        {
            throw new InvalidOperationException(
                "AI did not return a valid positive budget range."
            );
        }

        if (!result.SuggestedBudgetMin.HasValue)
        {
            result.SuggestedBudgetMin =
                result.SuggestedBudgetMax;
        }

        if (!result.SuggestedBudgetMax.HasValue)
        {
            result.SuggestedBudgetMax =
                result.SuggestedBudgetMin;
        }

        if (result.SuggestedBudgetMin!.Value >
            result.SuggestedBudgetMax!.Value)
        {
            (
                result.SuggestedBudgetMin,
                result.SuggestedBudgetMax
            ) =
            (
                result.SuggestedBudgetMax,
                result.SuggestedBudgetMin
            );
        }
    }

    private static string CleanAiJson(string aiText)
    {
        var cleaned = aiText.Trim();

        if (cleaned.StartsWith("```", StringComparison.Ordinal))
        {
            cleaned = cleaned
                .Replace(
                    "```json",
                    string.Empty,
                    StringComparison.OrdinalIgnoreCase
                )
                .Replace(
                    "```",
                    string.Empty,
                    StringComparison.Ordinal
                )
                .Trim();
        }

        var firstBrace = cleaned.IndexOf('{');
        var lastBrace = cleaned.LastIndexOf('}');

        if (firstBrace < 0 ||
            lastBrace < 0 ||
            lastBrace <= firstBrace)
        {
            throw new InvalidOperationException(
                "AI response does not contain a valid JSON object."
            );
        }

        return cleaned.Substring(
            firstBrace,
            lastBrace - firstBrace + 1
        );
    }

    private static string NormalizeComplexity(string? complexity)
    {
        if (string.IsNullOrWhiteSpace(complexity))
        {
            return "UNKNOWN";
        }

        var normalized = complexity
            .Trim()
            .ToUpperInvariant();

        return normalized switch
        {
            "SIMPLE" => "SIMPLE",
            "MEDIUM" => "MEDIUM",
            "COMPLEX" => "COMPLEX",
            "UNKNOWN" => "UNKNOWN",
            _ => "UNKNOWN"
        };
    }

    private static string NormalizeBudgetSource(string? source)
    {
        if (string.IsNullOrWhiteSpace(source))
        {
            return "UNKNOWN";
        }

        var normalized = source
            .Trim()
            .ToUpperInvariant();

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
        if (!value.HasValue || value.Value <= 0)
        {
            return null;
        }

        return decimal.Round(
            value.Value,
            0,
            MidpointRounding.AwayFromZero
        );
    }

    private static string FormatOptionalBudget(decimal? value)
    {
        return value.HasValue
            ? value.Value.ToString(
                "0",
                CultureInfo.InvariantCulture
            )
            : "null";
    }
}
