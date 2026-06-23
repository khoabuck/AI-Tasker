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
            return NeedsCorrection(
                "Groq API key is missing. Please update the profile with valid proof URLs and certificate evidence."
            );
        }

        try
        {
            var systemPrompt = BuildSystemPrompt(request);
            var prompt = BuildPrompt(request);

            var payload = new
            {
                model,
                messages = new[]
                {
                    new
                    {
                        role = "system",
                        content = systemPrompt
                    },
                    new
                    {
                        role = "user",
                        content = prompt
                    }
                },
                temperature = 0.2,
                max_tokens = 900
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

            var responseText = await response.Content.ReadAsStringAsync(
                cancellationToken
            );

            if (!response.IsSuccessStatusCode)
            {
                return NeedsCorrection(
                    $"AI provider error: {(int)response.StatusCode}. Please update the profile or try again later."
                );
            }

            var groqResponse = JsonSerializer.Deserialize<GroqChatCompletionResponse>(
                responseText,
                new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                }
            );

            var content = groqResponse?.Choices
                ?.FirstOrDefault()
                ?.Message
                ?.Content;

            if (string.IsNullOrWhiteSpace(content))
            {
                return NeedsCorrection(
                    "AI provider returned empty response. Please update the profile with stronger evidence."
                );
            }

            var result = ParseAiResult(content);

            return NormalizeResult(result, request);
        }
        catch
        {
            return NeedsCorrection(
                "AI profile review failed due to a system error. Please update the profile with valid proof URLs and certificate evidence."
            );
        }
    }

    private static string BuildSystemPrompt(ExpertProfileReviewProviderRequest request)
    {
        var portfolioEvidenceMaxScore = request.PortfolioMaxScore
            + request.GitHubMaxScore
            + request.LinkedInMaxScore;

        return $$"""
        You are an AI Expert Profile Checker for an AI freelance marketplace.
        You review whether an expert profile is credible, AI-related, and supported by URL evidence.
        The backend has already inspected URLs using HttpClient.
        Use the backend URL inspection evidence as the source of truth.

        Score the whole Expert Profile using the active Admin scoring policy:
        - Profile completeness: {{request.ProfileCompletenessMaxScore:0.##}} points
        - AI skill relevance: {{request.AiSkillMaxScore:0.##}} points
        - Experience credibility: {{request.ExperienceMaxScore:0.##}} points
        - Portfolio/GitHub/LinkedIn evidence: {{portfolioEvidenceMaxScore:0.##}} points total
          - Portfolio: {{request.PortfolioMaxScore:0.##}}
          - GitHub: {{request.GitHubMaxScore:0.##}}
          - LinkedIn: {{request.LinkedInMaxScore:0.##}}
        - Certificate evidence: {{request.CertificateMaxScore:0.##}} points
        - Trust and risk check: {{request.RiskMaxPenalty:0.##}} points

        Skill relevance is only one criterion in the total profile score.
        Do not approve only because many skills are listed.
        Be strict with claimed years of experience.

        Expert profile review status returned by AI must be either APPROVED or NEEDS_CORRECTION.
        APPROVED means profileScore is {{request.PassThreshold:0.##}} or higher.
        NEEDS_CORRECTION means profileScore is below {{request.PassThreshold:0.##}}.
        LOCKED is not an AI status. LOCKED is handled only by the backend after too many failed submissions or violations.

        If evidence is weak, unclear, unrelated, or not AI-related, return NEEDS_CORRECTION.
        Return JSON only. Do not return markdown. Do not add text outside JSON.
        """;
    }

    private static string BuildPrompt(ExpertProfileReviewProviderRequest request)
    {
        var portfolioEvidenceMaxScore = request.PortfolioMaxScore
            + request.GitHubMaxScore
            + request.LinkedInMaxScore;

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

        Active Admin scoring policy:
        - Pass threshold: {{request.PassThreshold:0.##}}
        - Profile completeness: {{request.ProfileCompletenessMaxScore:0.##}} points
        - AI skill relevance: {{request.AiSkillMaxScore:0.##}} points
        - Experience credibility: {{request.ExperienceMaxScore:0.##}} points
        - Portfolio/GitHub/LinkedIn evidence: {{portfolioEvidenceMaxScore:0.##}} points total
          - Portfolio: {{request.PortfolioMaxScore:0.##}}
          - GitHub: {{request.GitHubMaxScore:0.##}}
          - LinkedIn: {{request.LinkedInMaxScore:0.##}}
        - Certificate evidence: {{request.CertificateMaxScore:0.##}} points
        - Trust and risk check: {{request.RiskMaxPenalty:0.##}} points
        - Certificate not fully verified max profile score: {{request.CertificateUnverifiedMaxProfileScore:0.##}}

        Evaluation rules:
        - Skill relevance is not a separate pass condition.
        - Do not approve only because many skills are listed.
        - Use Backend URL Inspection Evidence as the source of truth for whether links are reachable.
        - The yearsOfExperience field is claimed by the expert. Do not automatically trust it.
        - The frontend and backend require Portfolio URL and GitHub URL as required proof links. LinkedIn URL is optional and is mainly displayed to Clients.
        - At least one certificate is required.
        - APPROVED only if profileScore is at least {{request.PassThreshold:0.##}} and the profile is AI-related with credible supporting evidence.
        - Do not approve based only on user-written text.
        - Even if the URL format is valid, only approve the profile when the required proof links and certificate evidence are reachable and relevant.
        - Portfolio scoring rule: 0-{{request.PortfolioMaxScore:0.##}} points. Award full points for a credible real AI project portfolio such as RAG, chatbot, OCR, LLM, data, computer vision, or automation work; award partial points for a simple demo; award 0 when missing, unreachable, unrelated, fake, or not useful as evidence.
        - GitHub scoring rule: 0-{{request.GitHubMaxScore:0.##}} points. Award full points for real AI repositories or meaningful AI project code; award partial points for basic or small repos; award 0 when missing, unreachable, unrelated, fake, or not useful as evidence.
        - LinkedIn scoring rule: 0-{{request.LinkedInMaxScore:0.##}} points. Do not fetch or require LinkedIn content because LinkedIn may block crawlers. Award full LinkedIn points only when the provided URL text looks like a personal LinkedIn profile, for example linkedin.com/in/{username}. Award 0 when LinkedIn is missing, malformed, blocked, unreadable, non-LinkedIn, or a company page such as linkedin.com/company/{name}. LinkedIn must never directly reject the profile.
        - If required proof links or certificate URLs are fake, unreachable, unrelated, blocked, timed out, rate-limited, or cannot support the claimed experience, return NEEDS_CORRECTION. This rule does not apply to optional LinkedIn.
        - If a required Portfolio or GitHub URL returns 404, 500, invalid content, or clearly unrelated content, return NEEDS_CORRECTION. This rule does not apply to optional LinkedIn.
        - If URL content does not match the claimed certificate, skill, portfolio, or AI experience, return NEEDS_CORRECTION.
        - If the expert claims 5+ years but has weak evidence, return NEEDS_CORRECTION.
        - If the expert claims 7+ years but has no strong Portfolio, GitHub, reachable certificate, or detailed project evidence, return NEEDS_CORRECTION. LinkedIn alone is not enough to support senior experience.
        - If claimed years are much higher than evidence, do not silently downgrade to MID_LEVEL and approve. Return NEEDS_CORRECTION.
        - Only approve SENIOR or LEAD when strong evidence supports that level.
        - If the profile is not related to AI, automation, data, LLM, chatbot, NLP, computer vision, prompt engineering, or AI consulting, return NEEDS_CORRECTION.
        - Return only APPROVED or NEEDS_CORRECTION as status.
        - Return APPROVED only when profileScore is {{request.PassThreshold:0.##}} or higher.
        - Return NEEDS_CORRECTION when profileScore is below {{request.PassThreshold:0.##}}.
        - Do not return LOCKED. LOCKED is set by backend only after too many failed submissions or violations.

        Profile level must be one of:
        - FRESHER: 0-1 verified years, basic profile, little practical evidence.
        - JUNIOR: 1-2 verified years, some practical experience.
        - MID_LEVEL: 2-4 verified years, can handle normal projects independently.
        - SENIOR: 5-6 verified years, strong project, Portfolio, GitHub, or certificate evidence. LinkedIn can add optional points but is not required evidence.
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
        ExpertProfileReviewProviderRequest request
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
        // - ProfileScore >= active policy pass threshold => APPROVED
        // - ProfileScore < active policy pass threshold  => NEEDS_CORRECTION
        // LOCKED is handled in ExpertProfileService when the expert fails verification too many times.
        result.Status = result.ProfileScore >= request.PassThreshold
            ? "APPROVED"
            : "NEEDS_CORRECTION";

        result.Level = NormalizeProfileLevel(
            result.Level,
            request.YearsOfExperience
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
                ? $"AI profile review completed. The profile meets the minimum score threshold of {request.PassThreshold:0.##}."
                : $"AI profile review completed. The profile is below the minimum score threshold of {request.PassThreshold:0.##}.";
        }

        if (result.Status == "APPROVED")
        {
            result.MissingInformation = null;
        }
        else if (string.IsNullOrWhiteSpace(result.MissingInformation))
        {
            result.MissingInformation =
                $"ProfileScore is below {request.PassThreshold:0.##}. Please improve profile completeness, AI skill relevance, experience evidence, Portfolio/GitHub proof, optional LinkedIn score, certificate evidence, or trust/risk issues.";
        }

        return result;
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
