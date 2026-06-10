using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Services;

public class JobAssistantService : IJobAssistantService
{
    private readonly AITaskerDbContext _context;
    private readonly IJobAssistantProvider _jobAssistantProvider;

    public JobAssistantService(
        AITaskerDbContext context,
        IJobAssistantProvider jobAssistantProvider)
    {
        _context = context;
        _jobAssistantProvider = jobAssistantProvider;
    }

    public async Task<JobAssistantResponse> AnalyzeJobAsync(JobAssistantRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RawRequirement))
        {
            throw new InvalidOperationException("Raw requirement is required.");
        }

        var activeSkills = await _context.Skills
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.SkillName)
            .Select(x => new
            {
                x.SkillId,
                x.SkillName,
                x.Category
            })
            .ToListAsync();

        if (activeSkills.Count == 0)
        {
            throw new InvalidOperationException("No active skills found in system.");
        }

        var availableSkillNames = activeSkills
            .Select(x => x.SkillName)
            .ToList();

        var aiResult = await _jobAssistantProvider.AnalyzeAsync(
            request,
            availableSkillNames
        );

        var normalizedAiSkillNames = aiResult.SuggestedSkillNames
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim().ToLower())
            .Distinct()
            .ToList();

        var matchedSkills = activeSkills
            .Where(x => normalizedAiSkillNames.Contains(x.SkillName.Trim().ToLower()))
            .Select(x => new JobAssistantSkillResponse
            {
                SkillId = x.SkillId,
                SkillName = x.SkillName,
                Category = x.Category
            })
            .ToList();

        var warnings = aiResult.Warnings ?? new List<string>();

        if (matchedSkills.Count == 0)
        {
            warnings.Add("AI could not match any active skill from the system.");
        }

        return new JobAssistantResponse
        {
            SuggestedTitle = aiResult.SuggestedTitle,
            ImprovedDescription = aiResult.ImprovedDescription,
            AiGeneratedDescription = aiResult.AiGeneratedDescription,
            SuggestedProjectType = aiResult.SuggestedProjectType,
            SuggestedComplexity = aiResult.SuggestedComplexity,
            ExpectedDeliverables = aiResult.ExpectedDeliverables,
            SuggestedSkillIds = matchedSkills.Select(x => x.SkillId).ToList(),
            SuggestedSkills = matchedSkills,
            Warnings = warnings
        };
    }
}