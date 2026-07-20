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
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.RawRequirement))
        {
            throw new InvalidOperationException(
                "Raw requirement is required."
            );
        }

        request.RawRequirement = request.RawRequirement.Trim();

        NormalizeRequestBudget(request);
        ValidateRequestBudgetRange(request);

        var activeSkills = await _context.Skills
            .AsNoTracking()
            .Where(skill => skill.IsActive)
            .OrderBy(skill => skill.SkillName)
            .Select(skill => new
            {
                skill.SkillId,
                skill.SkillName,
                skill.Category
            })
            .ToListAsync();

        if (activeSkills.Count == 0)
        {
            throw new InvalidOperationException(
                "No active skills found in system."
            );
        }

        var clientProfile =
            await GetEligibleClientProfileForAiAssistantAsync(userId);

        var jobPostingAiPolicy = await _jobPostingAiPolicyService
            .GetOrCreateActivePolicyEntityAsync();

        var maxSkillsPerJob = Math.Max(
            1,
            jobPostingAiPolicy.MaxSkillsPerJob
        );

        var maxSuggestedSkills = Math.Min(
            Math.Max(1, jobPostingAiPolicy.MaxSuggestedSkills),
            maxSkillsPerJob
        );

        var reservedCreditType =
            await ReserveAiGenerationCreditAsync(clientProfile);

        try
        {
            var availableSkillNames = activeSkills
                .Select(skill => skill.SkillName)
                .ToList();

            var aiResult = await _jobAssistantProvider.AnalyzeAsync(
                request,
                availableSkillNames
            );

            aiResult.SuggestedSkillNames ??= new List<string>();
            aiResult.Warnings ??= new List<string>();

            var warnings = aiResult.Warnings
                .Where(warning => !string.IsNullOrWhiteSpace(warning))
                .Select(warning => warning.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            var suggestedBudget = ResolveSuggestedBudget(
                aiResult,
                warnings
            );

            var normalizedAiSkillNames =
                aiResult.SuggestedSkillNames
                    .Where(skill => !string.IsNullOrWhiteSpace(skill))
                    .Select(skill => skill.Trim().ToLowerInvariant())
                    .Distinct()
                    .ToList();

            var skillOrder = normalizedAiSkillNames
                .Select((skillName, index) => new
                {
                    SkillName = skillName,
                    Index = index
                })
                .ToDictionary(
                    item => item.SkillName,
                    item => item.Index
                );

            /*
             * Match against every AI-suggested skill first, then apply
             * the Admin-configured limit. This prevents a valid skill
             * later in the AI list from being dropped merely because an
             * earlier suggestion did not match an active system skill.
             */
            var allMatchedSkills = activeSkills
                .Where(skill => skillOrder.ContainsKey(
                    skill.SkillName.Trim().ToLowerInvariant()
                ))
                .OrderBy(skill => skillOrder[
                    skill.SkillName.Trim().ToLowerInvariant()
                ])
                .Select(skill => new JobAssistantSkillResponse
                {
                    SkillId = skill.SkillId,
                    SkillName = skill.SkillName,
                    Category = skill.Category
                })
                .ToList();

            var matchedSkills = allMatchedSkills
                .Take(maxSuggestedSkills)
                .ToList();

            if (allMatchedSkills.Count > maxSuggestedSkills)
            {
                AddWarning(
                    warnings,
                    $"The active Job Posting AI Policy allows at most {maxSuggestedSkills} suggested skills. " +
                    $"The top {maxSuggestedSkills} matched skills were returned."
                );
            }

            if (normalizedAiSkillNames.Count > 0 &&
                allMatchedSkills.Count == 0)
            {
                AddWarning(
                    warnings,
                    "AI could not match the suggested skills with active skills in the system."
                );
            }

            warnings = warnings
                .Where(warning => !string.IsNullOrWhiteSpace(warning))
                .Select(warning => warning.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            return new JobAssistantResponse
            {
                SuggestedTitle = aiResult.SuggestedTitle,
                ImprovedDescription = aiResult.ImprovedDescription,
                AiGeneratedDescription =
                    aiResult.AiGeneratedDescription,

                SuggestedProjectType =
                    aiResult.SuggestedProjectType,

                SuggestedComplexity =
                    aiResult.SuggestedComplexity,

                SuggestedBudgetMin = suggestedBudget.Min,
                SuggestedBudgetMax = suggestedBudget.Max,
                SuggestedBudgetSource = suggestedBudget.Source,
                IsBudgetEstimated = suggestedBudget.IsEstimated,
                BudgetSuggestionNote = suggestedBudget.Note,

                ExpectedDeliverables =
                    aiResult.ExpectedDeliverables,

                SuggestedSkillIds = matchedSkills
                    .Select(skill => skill.SkillId)
                    .ToList(),

                SuggestedSkills = matchedSkills,
                Warnings = warnings,

                RemainingFreeAiGenerationCredits =
                    clientProfile.FreeAiGenerationCredits,

                RemainingPaidAiGenerationCredits =
                    clientProfile.PaidAiGenerationCredits
            };
        }
        catch
        {
            await RefundAiGenerationCreditAsync(
                clientProfile,
                reservedCreditType
            );

            throw;
        }
    }

    private async Task<ClientProfile>
        GetEligibleClientProfileForAiAssistantAsync(int userId)
    {
        var clientProfile = await _context.ClientProfiles
            .Include(profile => profile.User)
            .Include(profile => profile.BusinessProfile)
            .FirstOrDefaultAsync(profile => profile.UserId == userId);

        if (clientProfile == null)
        {
            throw new InvalidOperationException(
                "Client profile not found."
            );
        }

        if (clientProfile.User == null ||
            clientProfile.User.Status != UserStatusActive)
        {
            throw new InvalidOperationException(
                "Your account must be active before using AI Job Assistant."
            );
        }

        var clientType = clientProfile.ClientType
            .Trim()
            .ToUpperInvariant();

        if (clientType == ClientTypeBusiness)
        {
            if (clientProfile.BusinessProfile == null)
            {
                throw new InvalidOperationException(
                    "Business profile not found."
                );
            }

            if (clientProfile.BusinessProfile.VerificationStatus !=
                BusinessVerificationVerified)
            {
                throw new InvalidOperationException(
                    "Business profile must be verified before using AI Job Assistant."
                );
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

    private static void NormalizeRequestBudget(
        JobAssistantRequest request)
    {
        request.BudgetMin = NormalizePositiveBudget(
            request.BudgetMin
        );

        request.BudgetMax = NormalizePositiveBudget(
            request.BudgetMax
        );
    }

    private static void ValidateRequestBudgetRange(
        JobAssistantRequest request)
    {
        if (request.BudgetMin.HasValue &&
            request.BudgetMax.HasValue &&
            request.BudgetMin.Value > request.BudgetMax.Value)
        {
            throw new InvalidOperationException(
                "BudgetMin must be less than or equal to BudgetMax."
            );
        }
    }

    private static (
        decimal Min,
        decimal Max,
        string Source,
        bool IsEstimated,
        string Note
    ) ResolveSuggestedBudget(
        JobAiAnalysisResult aiResult,
        List<string> warnings)
    {
        var budgetMin = NormalizePositiveBudget(
            aiResult.SuggestedBudgetMin
        );

        var budgetMax = NormalizePositiveBudget(
            aiResult.SuggestedBudgetMax
        );

        if (!budgetMin.HasValue && !budgetMax.HasValue)
        {
            throw new InvalidOperationException(
                "AI did not return a valid positive budget range."
            );
        }

        if (!budgetMin.HasValue)
        {
            budgetMin = budgetMax;

            AddWarning(
                warnings,
                "AI returned only a maximum budget, so the minimum was set to the same value."
            );
        }

        if (!budgetMax.HasValue)
        {
            budgetMax = budgetMin;

            AddWarning(
                warnings,
                "AI returned only a minimum budget, so the maximum was set to the same value."
            );
        }

        if (budgetMin!.Value > budgetMax!.Value)
        {
            (
                budgetMin,
                budgetMax
            ) =
            (
                budgetMax,
                budgetMin
            );

            AddWarning(
                warnings,
                "The AI-suggested budget range was reordered because the minimum exceeded the maximum."
            );
        }

        var source = NormalizeBudgetSource(
            aiResult.SuggestedBudgetSource
        );

        if (source == "UNKNOWN")
        {
            source = "AI_ESTIMATE";

            AddWarning(
                warnings,
                "The AI returned an unknown budget source, so the suggested range is treated as an AI estimate."
            );
        }

        var note = string.IsNullOrWhiteSpace(
            aiResult.BudgetSuggestionNote
        )
            ? source == "AI_ESTIMATE"
                ? "AI estimated this budget range from the improved requirement, complexity, skills, deliverables, integrations, platforms, and deadline."
                : "The suggested budget range was derived from the client-provided information."
            : aiResult.BudgetSuggestionNote.Trim();

        if (source == "AI_ESTIMATE")
        {
            AddWarning(
                warnings,
                "Budget is AI-estimated and should be reviewed by the client before publishing the job."
            );
        }

        return (
            budgetMin.Value,
            budgetMax.Value,
            source,
            source == "AI_ESTIMATE",
            note
        );
    }

    private static decimal? NormalizePositiveBudget(decimal? value)
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

    private static void AddWarning(
        List<string> warnings,
        string warning)
    {
        var alreadyExists = warnings.Any(existingWarning =>
            string.Equals(
                existingWarning,
                warning,
                StringComparison.OrdinalIgnoreCase
            )
        );

        if (!alreadyExists)
        {
            warnings.Add(warning);
        }
    }
}
