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
                            You are an AI Expert Profile Evidence Checker for an AI freelance marketplace.
                            You do not make a free-form final scoring decision.
                            You score each evidence category separately using the rubric and the backend will combine those sub-scores with the Admin scoring policy.

                            The backend has already inspected URLs using HttpClient.
                            Use the backend URL inspection evidence as the source of truth for reachability, status code, page title, meta description, and text snippet.

                            You must score each category separately:
                            - profileCompletenessScore: 0 to 15
                            - aiSkillRelevanceScore: 0 to 15
                            - experienceCredibilityScore: 0 to 20
                            - portfolioEvidenceScore: 0 to 10
                            - gitHubEvidenceScore: 0 to 10
                            - linkedInEvidenceScore: 0 to 5
                            - certificateEvidenceScore: 0 to 15
                            - trustRiskScore: 0 to 10

                            Do not approve only because many fields are filled.
                            Do not approve only because many skills are listed.
                            Be fair to FRESHER and JUNIOR profiles. Do not require production-grade projects, real clients, advanced architecture, or live deployment from a junior profile.
                            For FRESHER or JUNIOR profiles, a well-documented prototype, README, sample code, FAQ dataset, prompt templates, chatbot flow, setup guide, or documentation is acceptable evidence.
                            LinkedIn is optional. Empty LinkedIn should receive linkedInEvidenceScore = 0, but it must not reduce trustRiskScore and must not be listed as required missing information.
                            If LinkedIn is only https://www.linkedin.com/ or a generic login/home page, linkedInEvidenceScore must be 0 and the review note must mention it because the user submitted an invalid LinkedIn URL.

                            Return exactly one valid JSON object only.
                            Do not return markdown, code fences, comments, explanation, or text outside JSON.
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
                "AI profile evidence review failed due to a system error. Please try again later or submit stronger proof URLs."
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
        Review this AI expert profile and score each evidence category separately.

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

        Scoring rubric:

        1. profileCompletenessScore: 0 to 15
        - 0-5: sparse, meaningless, or mostly placeholder text.
        - 6-10: enough fields but weak or generic descriptions.
        - 11-15: complete profile with meaningful title, detailed bio, clear skills, years, and required proof URLs.

        2. aiSkillRelevanceScore: 0 to 15
        - 0-3: not AI-related.
        - 4-8: generic AI keywords without clear practical skill.
        - 9-12: clearly AI-related skills such as chatbot, RAG, NLP, LLM, automation, computer vision, data, or prompt engineering.
        - 13-15: clear AI skills plus practical applications in bio/projects.

        3. experienceCredibilityScore: 0 to 20
        - 0-5: claimed experience has no support.
        - 6-10: claimed experience is mostly self-written with weak proof.
        - 11-15: some project evidence supports claimed experience, but timeline/detail is limited.
        - 16-20: strong project, GitHub, portfolio, LinkedIn, certificate, or dated evidence supports the claimed years.
        Be strict with claimed years. Do not give high experience score only because the user wrote a number.

        4. portfolioEvidenceScore: 0 to 10
        - 0: missing, unreachable, 404, unrelated, blocked without useful evidence, belongs to another person, or fake.
        - 1-4: reachable but generic, empty, or does not show meaningful AI project evidence.
        - 5-7: has AI/chatbot-related project descriptions, case studies, workflow, deliverables, documentation, README, or portfolio evidence. For FRESHER/JUNIOR, this level is acceptable even without production deployment.
        - 8-10: strong portfolio with clear AI/chatbot/automation project details, demo, screenshots, documentation, outcomes, or a readable portfolio website.
        For FRESHER/JUNIOR profiles, do not score a relevant applicant-owned portfolio too harshly only because it is simple.

        5. gitHubEvidenceScore: 0 to 10
        - 0: missing, unreachable, 404, unrelated, blocked without useful evidence, belongs to another person, or fake.
        - 1-4: reachable but empty/generic GitHub UI, no clear AI repository evidence.
        - 5-7: has relevant repository/project with README, sample code, FAQ dataset, prompt templates, chatbot flow, project structure, or documentation. For FRESHER/JUNIOR, this is acceptable evidence of practical prototype work.
        - 8-10: strong AI/chatbot/automation repository evidence with runnable code, README, project structure, examples, tests, demo screenshots, or deployment guide.
        For FRESHER/JUNIOR profiles, do not require production-grade code, real client projects, advanced architecture, or live deployment.

        6. linkedInEvidenceScore: 0 to 5
        - 0: empty, homepage, login page, company page, invalid page, unreachable, or not a personal profile.
        - 1-3: personal profile but weak or little relevant experience evidence.
        - 4-5: personal LinkedIn profile with relevant AI/chatbot/automation experience matching the claim.
        LinkedIn is optional. If LinkedIn is empty, linkedInEvidenceScore must be 0, but do not reduce trustRiskScore, do not mention LinkedIn in reviewNote, do not mention LinkedIn in missingInformation, and do not ask the user to add LinkedIn.

        7. certificateEvidenceScore: 0 to 15
        - 0: no certificate, invalid certificate, unreachable, holder mismatch, or unrelated.
        - 1-5: reachable certificate but weak relevance or unclear holder/date.
        - 6-10: valid certificate with holder match but generic or introductory AI relevance.
        - 11-15: valid certificate with holder match and direct relevance to the claimed AI skills.
        Certificates are optional. Missing certificate does not automatically fail the profile.

        8. trustRiskScore: 0 to 10
        Start from 10 and reduce for real risk signals only:
        - Name mismatch certificate: 0 trust score.
        - Invalid certificate: reduce strongly.
        - Generic LinkedIn URL: reduce slightly only if submitted.
        - Fake, unrelated, copied, deceptive, or third-party required proof URLs: reduce strongly.
        - Clear ownership mismatch or evidence belongs to another person: reduce strongly.
        - Claimed experience much stronger than evidence: reduce.
        - Spam/placeholder content: reduce.
        - Broken required proof URL, 404 GitHub URL, unreachable required proof, or non-existing repository: trustRiskScore should usually be no higher than 6.
        - GitHub profile URL alone as GitHub proof, or GitHub blob/tree/report file as portfolio proof: trustRiskScore should usually be no higher than 6 unless other strong personal proof exists.
        - Submitted certificate URL that only opens a generic page, cannot expose holder name, or needs review: trustRiskScore should usually be no higher than 7. Missing certificate is different and must not reduce trust.
        Weak or junior-level project evidence should be reflected in portfolioEvidenceScore and gitHubEvidenceScore, not double-penalized in trustRiskScore.
        Empty optional LinkedIn must not reduce trustRiskScore.
        If there is no broken required proof, no fake evidence, no ownership mismatch, no certificate mismatch, and no deception, trustRiskScore should usually be at least 7 for a FRESHER/JUNIOR profile.

        Required proof rule:
        - Portfolio URL and GitHub URL are required proof links.
        - If they are unreachable, fake, unrelated, empty, or only generic UI snippets, give low portfolioEvidenceScore/gitHubEvidenceScore and explain exactly what is missing.
        - Do not approve based only on user-written bio/skills.

        Portfolio/GitHub proof format rules:
        - A GitHub profile page alone is not strong GitHub project evidence.
        - A GitHub repository file URL, blob URL, tree URL, report file, or document inside an unrelated team repository should not be treated as a personal portfolio.
        - Portfolio evidence should be a personal portfolio page, GitHub Pages site, or a dedicated portfolio repository owned by the applicant.
        - GitHub evidence should be a specific project repository owned by the applicant, not just a GitHub profile page.
        - For Junior/Fresher profiles, simple demo repositories are acceptable, but they must still be relevant and personally owned.
        - Do not give junior-friendly scores to unrelated repositories, copied repositories, third-party repositories, report/document-only links, or generic GitHub profiles.
        - A GitHub URL owned by another account or organization must be treated as weak proof unless the profile clearly proves ownership.

        Fresher/Junior evaluation rule:
        - Evaluate evidence relative to the claimed seniority level.
        - For FRESHER or JUNIOR profiles, simple but relevant prototypes are valid evidence.
        - A GitHub repository with README, Python files, FAQ data, prompt templates, chatbot flow, tests, or docs should usually receive at least 5/10 if it is relevant and applicant-owned.
        - A portfolio with project descriptions, case studies, workflows, deliverables, certificate mapping, or a portfolio page should usually receive at least 5/10 if it is relevant and applicant-owned.
        - Give 0-2 only when the proof is broken, empty, unrelated, copied, fake, belongs to another person, or has no meaningful evidence.

        Profile level must be one of:
        - FRESHER: 0-1 verified years, basic profile, little practical evidence.
        - JUNIOR: 1-2 verified years, some practical experience.
        - MID_LEVEL: 2-4 verified years, can handle normal projects independently.
        - SENIOR: 5-6 verified years, strong project, portfolio, GitHub, LinkedIn, or certificate evidence.
        - LEAD: 7+ verified years, strong evidence and ability to design or lead complex solutions.
        Do not use MID, BEGINNER, INTERMEDIATE, ADVANCED, EXPERT, or UNKNOWN as profile level.

        Expert category must be one of:
        AI_AUTOMATION, CHATBOT_DEVELOPER, LLM_ENGINEER, DATA_ANALYST, COMPUTER_VISION, PROMPT_ENGINEER, AI_CONSULTANT, RPA_AUTOMATION, OTHER.

        Return JSON only in this exact shape:
        {
          "status": "APPROVED | NEEDS_CORRECTION",
          "profileScore": 0,
          "profileCompletenessScore": 0,
          "aiSkillRelevanceScore": 0,
          "experienceCredibilityScore": 0,
          "portfolioEvidenceScore": 0,
          "gitHubEvidenceScore": 0,
          "linkedInEvidenceScore": 0,
          "certificateEvidenceScore": 0,
          "trustRiskScore": 0,
          "level": "FRESHER | JUNIOR | MID_LEVEL | SENIOR | LEAD",
          "expertCategory": "AI_AUTOMATION | CHATBOT_DEVELOPER | LLM_ENGINEER | DATA_ANALYST | COMPUTER_VISION | PROMPT_ENGINEER | AI_CONSULTANT | RPA_AUTOMATION | OTHER",
          "reviewNote": "short review note explaining exact weak fields and evidence quality",
          "missingInformation": "what user must fix, or null"
        }

        The backend will clamp each sub-score and recompute profileScore from sub-scores.
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

        result.ProfileCompletenessScore = Math.Clamp(result.ProfileCompletenessScore, 0m, 15m);
        result.AiSkillRelevanceScore = Math.Clamp(result.AiSkillRelevanceScore, 0m, 15m);
        result.ExperienceCredibilityScore = Math.Clamp(result.ExperienceCredibilityScore, 0m, 20m);
        result.PortfolioEvidenceScore = Math.Clamp(result.PortfolioEvidenceScore, 0m, 10m);
        result.GitHubEvidenceScore = Math.Clamp(result.GitHubEvidenceScore, 0m, 10m);
        result.LinkedInEvidenceScore = Math.Clamp(result.LinkedInEvidenceScore, 0m, 5m);
        result.CertificateEvidenceScore = Math.Clamp(result.CertificateEvidenceScore, 0m, 15m);
        result.TrustRiskScore = Math.Clamp(result.TrustRiskScore, 0m, 10m);

        result.ProfileScore = Math.Clamp(
            result.ProfileCompletenessScore
            + result.AiSkillRelevanceScore
            + result.ExperienceCredibilityScore
            + result.PortfolioEvidenceScore
            + result.GitHubEvidenceScore
            + result.LinkedInEvidenceScore
            + result.CertificateEvidenceScore
            + result.TrustRiskScore,
            0m,
            100m
        );

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
                ? "AI profile evidence review completed. The profile meets the minimum score threshold."
                : "AI profile evidence review completed. The profile is below the minimum score threshold.";
        }

        if (result.Status == "APPROVED")
        {
            result.MissingInformation = null;
        }
        else if (string.IsNullOrWhiteSpace(result.MissingInformation))
        {
            result.MissingInformation =
                "ProfileScore is below 70. Please improve profile completeness, AI skill relevance, experience evidence, portfolio evidence, GitHub evidence, LinkedIn evidence, certificate evidence, or trust/risk issues.";
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
            ProfileCompletenessScore = 0,
            AiSkillRelevanceScore = 0,
            ExperienceCredibilityScore = 0,
            PortfolioEvidenceScore = 0,
            GitHubEvidenceScore = 0,
            LinkedInEvidenceScore = 0,
            CertificateEvidenceScore = 0,
            TrustRiskScore = 0,
            Level = "FRESHER",
            ExpertCategory = "OTHER",
            ReviewNote = note,
            MissingInformation =
                "Please update your profile with valid proof URLs and certificate evidence."
        };
    }
}
