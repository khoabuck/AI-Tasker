using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Services;

public class JobAssistantService : IJobAssistantService
{
    private const string UserStatusActive = "ACTIVE";
    private const string ClientTypeBusiness = "BUSINESS";
    private const string BusinessVerificationVerified = "VERIFIED";

    private readonly AITaskerDbContext _context;
    private readonly IJobAssistantProvider _jobAssistantProvider;
    private readonly IJobPostingAiPolicyService _jobPostingAiPolicyService;

    public JobAssistantService(
        AITaskerDbContext context,
        IJobAssistantProvider jobAssistantProvider,
        IJobPostingAiPolicyService jobPostingAiPolicyService)
    {
        _context = context;
        _jobAssistantProvider = jobAssistantProvider;
        _jobPostingAiPolicyService = jobPostingAiPolicyService;
    }

    public async Task<JobAssistantResponse> AnalyzeJobAsync(
        int userId,
        JobAssistantRequest request)
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

        var clientProfile = await GetEligibleClientProfileForAiAssistantAsync(userId);

        var jobPostingAiPolicy = await _jobPostingAiPolicyService
            .GetOrCreateActivePolicyEntityAsync();

        var maxSuggestedSkills = Math.Max(1, jobPostingAiPolicy.MaxSuggestedSkills);

        var reservedCreditType = await ReserveAiGenerationCreditAsync(clientProfile);

        try
        {
            var availableSkillNames = activeSkills
                .Select(x => x.SkillName)
                .ToList();

            var aiResult = await _jobAssistantProvider.AnalyzeAsync(
                request,
                availableSkillNames
            );

            var rawSuggestedSkillCount = aiResult.SuggestedSkillNames
                .Count(x => !string.IsNullOrWhiteSpace(x));

            var normalizedAiSkillNames = aiResult.SuggestedSkillNames
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x.Trim().ToLowerInvariant())
                .Distinct()
                .Take(maxSuggestedSkills)
                .ToList();

            var skillOrder = normalizedAiSkillNames
                .Select((skillName, index) => new
                {
                    SkillName = skillName,
                    Index = index
                })
                .ToDictionary(
                    x => x.SkillName,
                    x => x.Index
                );

            var matchedSkills = activeSkills
                .Where(x => skillOrder.ContainsKey(x.SkillName.Trim().ToLowerInvariant()))
                .OrderBy(x => skillOrder[x.SkillName.Trim().ToLowerInvariant()])
                .Take(maxSuggestedSkills)
                .Select(x => new JobAssistantSkillResponse
                {
                    SkillId = x.SkillId,
                    SkillName = x.SkillName,
                    Category = x.Category
                })
                .ToList();

            var warnings = aiResult.Warnings ?? new List<string>();

            if (rawSuggestedSkillCount > maxSuggestedSkills)
            {
                warnings.Add(
                    $"AI suggested more skills than the current admin policy allows. Only the top {maxSuggestedSkills} matched skills were returned."
                );
            }

            if (matchedSkills.Count == 0)
            {
                warnings.Add("AI could not match any active skill from the system.");
            }

            var suggestedBudget = ResolveSuggestedBudget(request, aiResult, warnings);

            return new JobAssistantResponse
            {
                SuggestedTitle = aiResult.SuggestedTitle,
                ImprovedDescription = aiResult.ImprovedDescription,
                AiGeneratedDescription = aiResult.AiGeneratedDescription,
                SuggestedProjectType = aiResult.SuggestedProjectType,
                SuggestedComplexity = aiResult.SuggestedComplexity,
                SuggestedBudgetMin = suggestedBudget.Min,
                SuggestedBudgetMax = suggestedBudget.Max,
                SuggestedBudgetSource = suggestedBudget.Source,
                IsBudgetEstimated = suggestedBudget.IsEstimated,
                BudgetSuggestionNote = suggestedBudget.Note,
                ExpectedDeliverables = aiResult.ExpectedDeliverables,
                SuggestedSkillIds = matchedSkills.Select(x => x.SkillId).ToList(),
                SuggestedSkills = matchedSkills,
                Warnings = warnings,
                RemainingFreeAiGenerationCredits = clientProfile.FreeAiGenerationCredits,
                RemainingPaidAiGenerationCredits = clientProfile.PaidAiGenerationCredits
            };
        }
        catch
        {
            await RefundAiGenerationCreditAsync(clientProfile, reservedCreditType);
            throw;
        }
    }

    private async Task<ClientProfile> GetEligibleClientProfileForAiAssistantAsync(
        int userId)
    {
        var clientProfile = await _context.ClientProfiles
            .Include(x => x.User)
            .Include(x => x.BusinessProfile)
            .FirstOrDefaultAsync(x => x.UserId == userId);

        if (clientProfile == null)
        {
            throw new InvalidOperationException("Client profile not found.");
        }

        if (clientProfile.User == null ||
            clientProfile.User.Status != UserStatusActive)
        {
            throw new InvalidOperationException("Your account must be active before using AI Job Assistant.");
        }

        var clientType = clientProfile.ClientType.Trim().ToUpperInvariant();

        if (clientType == ClientTypeBusiness)
        {
            if (clientProfile.BusinessProfile == null)
            {
                throw new InvalidOperationException("Business profile not found.");
            }

            if (clientProfile.BusinessProfile.VerificationStatus != BusinessVerificationVerified)
            {
                throw new InvalidOperationException("Business profile must be verified before using AI Job Assistant.");
            }
        }

        return clientProfile;
    }

    private async Task<string> ReserveAiGenerationCreditAsync(
        ClientProfile clientProfile)
    {
        if (clientProfile.FreeAiGenerationCredits > 0)
        {
            clientProfile.FreeAiGenerationCredits -= 1;
            clientProfile.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return "FREE";
        }

        if (clientProfile.PaidAiGenerationCredits > 0)
        {
            clientProfile.PaidAiGenerationCredits -= 1;
            clientProfile.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return "PAID";
        }

        throw new InvalidOperationException(
            "You have used all AI generation credits. Please edit manually or buy a job credit package to get more AI generation credits."
        );
    }

    private async Task RefundAiGenerationCreditAsync(
        ClientProfile clientProfile,
        string reservedCreditType)
    {
        if (reservedCreditType == "PAID")
        {
            clientProfile.PaidAiGenerationCredits += 1;
        }
        else
        {
            clientProfile.FreeAiGenerationCredits += 1;
        }

        clientProfile.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    private static (
        decimal? Min,
        decimal? Max,
        string Source,
        bool IsEstimated,
        string Note
    ) ResolveSuggestedBudget(
        JobAssistantRequest request,
        JobAiAnalysisResult aiResult,
        List<string> warnings)
    {
        var hasFormBudget = request.BudgetMin.HasValue || request.BudgetMax.HasValue;

        var budgetMin = hasFormBudget
            ? request.BudgetMin
            : aiResult.SuggestedBudgetMin;

        var budgetMax = hasFormBudget
            ? request.BudgetMax
            : aiResult.SuggestedBudgetMax;

        var source = hasFormBudget
            ? "FORM"
            : NormalizeBudgetSource(aiResult.SuggestedBudgetSource);

        var note = string.IsNullOrWhiteSpace(aiResult.BudgetSuggestionNote)
            ? string.Empty
            : aiResult.BudgetSuggestionNote.Trim();

        if (budgetMin.HasValue && budgetMin.Value < 0)
        {
            warnings.Add("BudgetMin was ignored because it is negative.");
            budgetMin = null;
        }

        if (budgetMax.HasValue && budgetMax.Value < 0)
        {
            warnings.Add("BudgetMax was ignored because it is negative.");
            budgetMax = null;
        }

        if (budgetMin.HasValue && budgetMax.HasValue && budgetMin.Value > budgetMax.Value)
        {
            warnings.Add("BudgetMin was greater than BudgetMax, so the suggested budget range was normalized.");
            (budgetMin, budgetMax) = (budgetMax, budgetMin);
        }

        if (!budgetMin.HasValue && !budgetMax.HasValue)
        {
            source = "UNKNOWN";
            note = string.IsNullOrWhiteSpace(note)
                ? "No budget range could be suggested from the requirement."
                : note;
        }
        else if (source == "AI_ESTIMATE")
        {
            var estimateWarning = "Budget is AI-estimated from requirement complexity and should be reviewed by the client.";
            if (!warnings.Contains(estimateWarning))
            {
                warnings.Add(estimateWarning);
            }

            note = string.IsNullOrWhiteSpace(note)
                ? "AI estimated this budget range because the client did not provide a clear budget."
                : note;
        }

        return (
            budgetMin,
            budgetMax,
            source,
            source == "AI_ESTIMATE",
            note
        );
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
}
