using System.Text.Json;
using AITasker.Application.DTOs.Ai;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;

namespace AITasker.Infrastructure.BusinessVerification;

public class GroqExpertProfileReviewProvider : IExpertProfileReviewProvider
{
    private const decimal ExpertProfilePassThreshold = 70m;

    private readonly IGroqChatCompletionService _groqChatCompletionService;

    public GroqExpertProfileReviewProvider(
        IGroqChatCompletionService groqChatCompletionService
    )
    {
        _groqChatCompletionService = groqChatCompletionService;
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
            ?? "openai/gpt-oss-120b";

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return NeedsCorrection(
                "Groq API key is missing. Please update the profile with valid proof URLs and certificate evidence."
            );
        }

        try
        {
            var prompt = BuildPrompt(request);

            var aiResponse = await _groqChatCompletionService.CreateChatCompletionAsync(
                new GroqChatCompletionRequest
                {
                    Feature = "ExpertProfileReview",
                    Messages = new List<GroqChatMessage>
                    {
                        new()
                        {
                            Role = "system",
                            Content = """
                            You are an AI Expert Profile Checker for an AI freelance marketplace.
                            You review whether an expert profile is credible, AI-related, and supported by URL evidence.
                            The backend has already inspected URLs using HttpClient.
                            Use the backend URL inspection evidence as the source of truth.

                            Score the whole Expert Profile on a 100-point scale:
                            - Profile completeness: 15 points
                            - AI skill relevance: 15 points
                            - Experience credibility: 20 points
                            - Portfolio/GitHub/LinkedIn evidence: 25 points
                            - Certificate evidence: 15 points
                            - Trust and risk check: 10 points

                            Skill relevance is only one criterion in the total profile score.
                            Do not approve only because many skills are listed.
                            Be strict with claimed years of experience.

                            Expert profile review status returned by AI must be either APPROVED or NEEDS_CORRECTION.
                            APPROVED means profileScore is 70 or higher.
                            NEEDS_CORRECTION means profileScore is below 70.
                            LOCKED is not an AI status. LOCKED is handled only by the backend after too many failed submissions or violations.

                            If evidence is weak, unclear, unrelated, or not AI-related, return NEEDS_CORRECTION.
                            Return exactly one valid JSON object only. Do not return markdown, code fences, comments, explanation, or text outside JSON.
                            """
                        },
                        new()
                        {
                            Role = "user",
                            Content = prompt
                        }
                    }
                },
                cancellationToken
            );

            var result = ParseAiResult(aiResponse.Content);

            return NormalizeResult(result, request.YearsOfExperience);
        }
        catch
        {
            return NeedsCorrection(
                "AI profile review failed due to a system error. Please update the profile with valid proof URLs and certificate evidence."
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
                    $"{index + 1}. Type: {c.CertificateType}; Url: {c.CertificateUrl}"
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

        Claimed Years of Experience:
        {{request.YearsOfExperience}}

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
        - Score the whole Expert Profile on a 100-point scale:
          1. Profile completeness: 15 points
          2. AI skill relevance: 15 points
          3. Experience credibility: 20 points
          4. Portfolio/GitHub/LinkedIn evidence: 25 points
          5. Certificate evidence: 15 points
          6. Trust and risk check: 10 points.
        - Skill relevance is only 15/100 points and is not a separate pass condition.
        - Do not approve only because many skills are listed.
        - Use Backend URL Inspection Evidence as the source of truth for whether links are reachable.
        - The yearsOfExperience field is claimed by the expert. Do not automatically trust it.
        - Portfolio URL and GitHub URL are required proof links. LinkedIn URL is optional and should not block approval by itself.
        - Certificates are optional. If certificates are provided, the user only provides certificate type and URL; name, issuer, and issued date may be detected from page content by backend.
        - APPROVED only if profileScore is at least 70 and the profile is AI-related with credible supporting evidence.
        - Do not approve based only on user-written text.
        - Even if the URL format is valid, only approve the profile when the required proof links are reachable and relevant. Certificate evidence can increase confidence but missing certificates should not automatically fail a profile.
        - If required proof links are fake, unreachable, unrelated, blocked, timed out, rate-limited, or cannot support the claimed experience, return NEEDS_CORRECTION. If an optional certificate URL is blocked, mention it as weak certificate evidence instead of treating certificate absence as an automatic failure.
        - If a required proof URL returns 404, 500, invalid content, or clearly unrelated content, return NEEDS_CORRECTION.
        - If URL content does not match the claimed certificate, skill, portfolio, or AI experience, return NEEDS_CORRECTION.
        - If the expert claims 5+ years but has weak evidence, return NEEDS_CORRECTION.
        - If the expert claims 7+ years but has no strong portfolio, GitHub, LinkedIn, reachable certificate, or detailed project evidence, return NEEDS_CORRECTION.
        - If claimed years are much higher than evidence, do not silently downgrade to MID_LEVEL and approve. Return NEEDS_CORRECTION.
        - Only approve SENIOR or LEAD when strong evidence supports that level.
        - If the profile is not related to AI, automation, data, LLM, chatbot, NLP, computer vision, prompt engineering, or AI consulting, return NEEDS_CORRECTION.
        - Return only APPROVED or NEEDS_CORRECTION as status.
        - Return APPROVED only when profileScore is 70 or higher.
        - Return NEEDS_CORRECTION when profileScore is below 70.
        - Do not return LOCKED. LOCKED is set by backend only after too many failed submissions or violations.

        Profile level must be one of:
        - FRESHER: 0-1 verified years, basic profile, little practical evidence.
        - JUNIOR: 1-2 verified years, some practical experience.
        - MID_LEVEL: 2-4 verified years, can handle normal projects independently.
        - SENIOR: 5-6 verified years, strong project, portfolio, GitHub, LinkedIn, or certificate evidence.
        - LEAD: 7+ verified years, strong evidence and ability to design or lead complex solutions.

        Do not use MID, BEGINNER, INTERMEDIATE, ADVANCED, EXPERT, or UNKNOWN as profile level.

        Expert category must be one of:
        AI_AUTOMATION, CHATBOT_DEVELOPER, LLM_ENGINEER, DATA_ANALYST, COMPUTER_VISION, PROMPT_ENGINEER, AI_CONSULTANT, RPA_AUTOMATION, OTHER.

        Profile score must be from 0 to 100.
        Profile score is the final score of the whole Expert Profile, not the score of a single skill.

        Return JSON only in this exact shape:
        {
          "status": "APPROVED | NEEDS_CORRECTION",
          "profileScore": 0,
          "level": "FRESHER | JUNIOR | MID_LEVEL | SENIOR | LEAD",
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

        return result ?? NeedsCorrection(
            "AI response could not be parsed. Please update the profile with stronger evidence."
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
        ExpertProfileReviewProviderResult result,
        int claimedYearsOfExperience
    )
    {
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

        result.ProfileScore = Math.Clamp(result.ProfileScore, 0m, 100m);

        // Final backend policy for the AI provider result:
        // - ProfileScore >= 70 => APPROVED
        // - ProfileScore < 70  => NEEDS_CORRECTION
        // LOCKED is not returned by AI. LOCKED is handled in ExpertProfileService
        // when the expert fails verification too many times or violates policy.
        result.Status = result.ProfileScore >= ExpertProfilePassThreshold
            ? "APPROVED"
            : "NEEDS_CORRECTION";

        result.Level = NormalizeProfileLevel(
            result.Level,
            claimedYearsOfExperience
        );

        result.ExpertCategory = NormalizeText(
            result.ExpertCategory,
            "OTHER"
        ).ToUpperInvariant();

        if (!allowedCategories.Contains(result.ExpertCategory))
        {
            result.ExpertCategory = "OTHER";
        }

        if (string.IsNullOrWhiteSpace(result.ReviewNote))
        {
            result.ReviewNote = result.Status == "APPROVED"
                ? "AI profile review completed. The profile meets the minimum score threshold."
                : "AI profile review completed. The profile is below the minimum score threshold.";
        }

        if (result.Status == "APPROVED")
        {
            result.MissingInformation = null;
        }
        else if (string.IsNullOrWhiteSpace(result.MissingInformation))
        {
            result.MissingInformation =
                "ProfileScore is below 70. Please improve profile completeness, AI skill relevance, experience evidence, portfolio/GitHub/LinkedIn proof, certificate evidence, or trust/risk issues.";
        }

        return result;
    }

    private static string NormalizeReviewStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return "NEEDS_CORRECTION";
        }

        var normalized = status.Trim()
            .ToUpper()
            .Replace("-", "_")
            .Replace(" ", "_");

        return normalized == "APPROVED"
            ? "APPROVED"
            : "NEEDS_CORRECTION";
    }

    private static string NormalizeProfileLevel(
        string? level,
        int claimedYearsOfExperience
    )
    {
        if (string.IsNullOrWhiteSpace(level))
        {
            return InferLevelFromYears(claimedYearsOfExperience);
        }

        var normalized = level.Trim()
            .ToUpper()
            .Replace("-", "_")
            .Replace(" ", "_");

        return normalized switch
        {
            "FRESHER" => "FRESHER",
            "JUNIOR" => "JUNIOR",
            "MID" => "MID_LEVEL",
            "MIDLEVEL" => "MID_LEVEL",
            "MID_LEVEL" => "MID_LEVEL",
            "SENIOR" => "SENIOR",
            "LEAD" => "LEAD",

            "BEGINNER" => "FRESHER",
            "INTERMEDIATE" => "MID_LEVEL",
            "ADVANCED" => "SENIOR",
            "EXPERT" => "LEAD",
            "UNKNOWN" => InferLevelFromYears(claimedYearsOfExperience),

            _ => InferLevelFromYears(claimedYearsOfExperience)
        };
    }

    private static string InferLevelFromYears(int yearsOfExperience)
    {
        if (yearsOfExperience <= 1)
        {
            return "FRESHER";
        }

        if (yearsOfExperience <= 2)
        {
            return "JUNIOR";
        }

        if (yearsOfExperience <= 4)
        {
            return "MID_LEVEL";
        }

        if (yearsOfExperience <= 6)
        {
            return "SENIOR";
        }

        return "LEAD";
    }

    private static string NormalizeText(string? value, string fallback)
    {
        return string.IsNullOrWhiteSpace(value)
            ? fallback
            : value.Trim();
    }

    private static ExpertProfileReviewProviderResult NeedsCorrection(string note)
    {
        return new ExpertProfileReviewProviderResult
        {
            Status = "NEEDS_CORRECTION",
            ProfileScore = 0,
            Level = "FRESHER",
            ExpertCategory = "OTHER",
            ReviewNote = note,
            MissingInformation =
                "Please update your profile with valid proof URLs and certificate evidence."
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