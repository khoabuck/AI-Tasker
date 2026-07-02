using System.Text.Json;
using AITasker.Application.DTOs.Ai;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;

namespace AITasker.Infrastructure.Services;

public class GroqExpertSkillAiProvider : IExpertSkillAiProvider
{
    private readonly IGroqChatCompletionService _groqChatCompletionService;

    public GroqExpertSkillAiProvider(IGroqChatCompletionService groqChatCompletionService)
    {
        _groqChatCompletionService = groqChatCompletionService;
    }

    public async Task<ExpertSkillAiAnalysisResult> AnalyzeAsync(
        ExpertSkillAiProfileInput input,
        List<string> availableSkills)
    {
        if (availableSkills.Count == 0)
        {
            return new ExpertSkillAiAnalysisResult
            {
                Warnings = new List<string>
                {
                    "No available skills found in system."
                }
            };
        }

        var prompt = BuildPrompt(input, availableSkills);

        var aiResponse = await _groqChatCompletionService.CreateChatCompletionAsync(
            new GroqChatCompletionRequest
            {
                Feature = "ExpertSkillAnalysis",
                Messages = new List<GroqChatMessage>
                {
                    new()
                    {
                        Role = "system",
                        Content = "You are an AI expert profile analyzer. You must return valid JSON only."
                    },
                    new()
                    {
                        Role = "user",
                        Content = prompt
                    }
                }
            }
        );

        var json = CleanJson(aiResponse.Content);

        var result = JsonSerializer.Deserialize<ExpertSkillAiAnalysisResult>(
            json,
            new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }
        );

        return result ?? new ExpertSkillAiAnalysisResult
        {
            Warnings = new List<string>
            {
                "AI returned empty skill analysis result."
            }
        };
    }

    private static string BuildPrompt(
        ExpertSkillAiProfileInput input,
        List<string> availableSkills)
    {
        var availableSkillsText = string.Join(", ", availableSkills);

        var certificatesText = input.Certificates.Count == 0
            ? "No certificates provided."
            : string.Join(
                "\n",
                input.Certificates.Select(x =>
                    $"- {x.CertificateName} by {x.CertificateIssuer}, issued at: {x.IssuedAt?.ToString("yyyy-MM-dd") ?? "unknown"}, url: {x.CertificateUrl}"
                )
            );

        return $$"""
You must analyze an AI expert profile and map the expert's skills to the system skill list.

IMPORTANT RULES:
1. You can only use skillName values from AVAILABLE_SYSTEM_SKILLS.
2. Do not invent new skill names.
3. If a skill in the expert profile is similar to a system skill, map it to the closest system skill.
   Example:
   - "Natural Language Processing" can map to "NLP" if "NLP" exists.
   - "AI chatbot" can map to "Chatbot" if "Chatbot" exists.
   - "C Sharp" can map to "C#" if "C#" exists.
4. Return only skills that are reasonably supported by the profile.
5. skillLevel must be one of:
   BEGINNER, INTERMEDIATE, ADVANCED, EXPERT
6. yearsOfExperience must be between 0 and the expert's total years of experience.
7. isPrimary should be true for the strongest 1-3 skills only.

Skill level guidance:
- BEGINNER: basic knowledge, little evidence of real project experience.
- INTERMEDIATE: has practical experience or moderate evidence.
- ADVANCED: strong evidence, multiple projects, strong bio, portfolio, or certificates.
- EXPERT: very strong evidence, many years, strong portfolio/certificates, expert-level wording.

AVAILABLE_SYSTEM_SKILLS:
{{availableSkillsText}}

EXPERT_PROFILE:
ProfessionalTitle: {{input.ProfessionalTitle}}
Bio: {{input.Bio}}
SkillsText: {{input.SkillsText}}
TotalYearsOfExperience: {{input.YearsOfExperience}}
PortfolioUrl: {{input.PortfolioUrl ?? "null"}}
LinkedInUrl: {{input.LinkedInUrl ?? "null"}}
GitHubUrl: {{input.GitHubUrl ?? "null"}}

CERTIFICATES:
{{certificatesText}}

Return JSON exactly in this structure:
{
  "skills": [
    {
      "skillName": "Skill name from AVAILABLE_SYSTEM_SKILLS only",
      "skillLevel": "BEGINNER | INTERMEDIATE | ADVANCED | EXPERT",
      "yearsOfExperience": 0,
      "isPrimary": true,
      "reason": "Short reason why this skill level was assigned"
    }
  ],
  "warnings": [
    "Any warning if some profile skills could not be mapped"
  ]
}
""";
    }

    private static string CleanJson(string content)
    {
        var cleaned = content.Trim();

        if (cleaned.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
        {
            cleaned = cleaned[7..].Trim();
        }

        if (cleaned.StartsWith("```"))
        {
            cleaned = cleaned[3..].Trim();
        }

        if (cleaned.EndsWith("```"))
        {
            cleaned = cleaned[..^3].Trim();
        }

        var firstBrace = cleaned.IndexOf('{');
        var lastBrace = cleaned.LastIndexOf('}');

        if (firstBrace >= 0 && lastBrace > firstBrace)
        {
            cleaned = cleaned[firstBrace..(lastBrace + 1)];
        }

        return cleaned;
    }
}
