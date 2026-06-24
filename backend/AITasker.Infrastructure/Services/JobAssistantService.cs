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

    public JobAssistantService(
        AITaskerDbContext context,
        IJobAssistantProvider jobAssistantProvider)
    {
        _context = context;
        _jobAssistantProvider = jobAssistantProvider;
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
            "You have used all AI generation credits. Please edit manually or buy an AI generation package."
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
}