using System.Text.Json;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Services;

public class AdminProposalCreditService : IAdminProposalCreditService
{
    private readonly AITaskerDbContext _context;
    private readonly IAdminAuditLogService _adminAuditLogService;
    private readonly IMarketplaceWorkflowPolicyService _workflowPolicyService;

    public AdminProposalCreditService(
        AITaskerDbContext context,
        IAdminAuditLogService adminAuditLogService,
        IMarketplaceWorkflowPolicyService workflowPolicyService)
    {
        _context = context;
        _adminAuditLogService = adminAuditLogService;
        _workflowPolicyService = workflowPolicyService;
    }

    public async Task<List<AdminProposalCreditResponse>> GetExpertCreditsAsync(
        string? search,
        string? profileReviewStatus,
        bool? availableForWork)
    {
        var query = _context.ExpertProfiles
            .AsNoTracking()
            .Include(x => x.User)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim();

            query = query.Where(x =>
                x.User.Email.Contains(keyword) ||
                x.User.FullName.Contains(keyword) ||
                x.ProfessionalTitle.Contains(keyword));
        }

        if (!string.IsNullOrWhiteSpace(profileReviewStatus))
        {
            var normalizedStatus = profileReviewStatus.Trim().ToUpperInvariant();

            query = query.Where(x => x.ProfileReviewStatus == normalizedStatus);
        }

        if (availableForWork.HasValue)
        {
            query = query.Where(x => x.AvailableForWork == availableForWork.Value);
        }

        var experts = await query
            .OrderByDescending(x => x.UpdatedAt ?? x.CreatedAt)
            .Take(300)
            .ToListAsync();

        var policy = await _workflowPolicyService.GetActivePolicyAsync();

        return experts
            .Select(expert => MapToResponse(expert, policy))
            .ToList();
    }

    public async Task<AdminProposalCreditResponse?> GetExpertCreditByIdAsync(
        int expertProfileId)
    {
        var expert = await _context.ExpertProfiles
            .AsNoTracking()
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.ExpertProfileId == expertProfileId);

        if (expert == null)
        {
            return null;
        }

        var policy = await _workflowPolicyService.GetActivePolicyAsync();

        return MapToResponse(expert, policy);
    }

    public async Task<AdminProposalCreditResponse?> AdjustCreditsAsync(
        int adminId,
        int expertProfileId,
        AdminAdjustProposalCreditsRequest request)
    {
        if (request.CreditDelta == 0)
        {
            throw new InvalidOperationException("Credit delta cannot be 0.");
        }

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            throw new InvalidOperationException("Reason is required.");
        }

        var expert = await _context.ExpertProfiles
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.ExpertProfileId == expertProfileId);

        if (expert == null)
        {
            return null;
        }

        var newCreditValue = expert.ProposalSubmitCredits + request.CreditDelta;

        if (newCreditValue < 0)
        {
            throw new InvalidOperationException("Proposal submit credits cannot be negative.");
        }

        if (newCreditValue > 100000)
        {
            throw new InvalidOperationException("Proposal submit credits cannot exceed 100000.");
        }

        var policy = await _workflowPolicyService.GetActivePolicyAsync();

        var oldValue = JsonSerializer.Serialize(MapToResponse(expert, policy));

        expert.ProposalSubmitCredits = newCreditValue;
        expert.UpdatedAt = DateTime.UtcNow;

        var newValue = JsonSerializer.Serialize(MapToResponse(expert, policy));

        await _context.SaveChangesAsync();

        await _adminAuditLogService.LogAsync(
            adminId,
            "ADJUST_PROPOSAL_CREDITS",
            nameof(ExpertProfile),
            expert.ExpertProfileId,
            oldValue,
            newValue,
            request.Reason
        );

        return MapToResponse(expert, policy);
    }

    public async Task<AdminProposalCreditResponse?> SetFreeProposalSubmitAsync(
        int adminId,
        int expertProfileId,
        AdminSetFreeProposalSubmitRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            throw new InvalidOperationException("Reason is required.");
        }

        var expert = await _context.ExpertProfiles
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.ExpertProfileId == expertProfileId);

        if (expert == null)
        {
            return null;
        }

        var policy = await _workflowPolicyService.GetActivePolicyAsync();

        var oldValue = JsonSerializer.Serialize(MapToResponse(expert, policy));

        if (request.FreeProposalSubmitUsedCount < 0 ||
            request.FreeProposalSubmitUsedCount > policy.FreeProposalSubmitCount)
        {
            throw new InvalidOperationException($"Free proposal submit used count must be between 0 and {policy.FreeProposalSubmitCount}.");
        }

        expert.FreeProposalSubmitUsedCount = request.FreeProposalSubmitUsedCount;
        expert.UpdatedAt = DateTime.UtcNow;

        var newValue = JsonSerializer.Serialize(MapToResponse(expert, policy));

        await _context.SaveChangesAsync();

        await _adminAuditLogService.LogAsync(
            adminId,
            "SET_FREE_PROPOSAL_SUBMIT",
            nameof(ExpertProfile),
            expert.ExpertProfileId,
            oldValue,
            newValue,
            request.Reason
        );

        return MapToResponse(expert, policy);
    }

    private static AdminProposalCreditResponse MapToResponse(ExpertProfile expert, MarketplaceWorkflowPolicyResponse policy)
    {
        var freeTotal = Math.Max(policy.FreeProposalSubmitCount, 0);
        var freeUsed = Math.Clamp(expert.FreeProposalSubmitUsedCount, 0, freeTotal);
        var freeRemaining = Math.Max(freeTotal - freeUsed, 0);

        var canSubmit = freeRemaining > 0 || expert.ProposalSubmitCredits > 0;

        return new AdminProposalCreditResponse
        {
            ExpertProfileId = expert.ExpertProfileId,
            UserId = expert.UserId,
            Email = expert.User.Email,
            FullName = expert.User.FullName,
            ProfessionalTitle = expert.ProfessionalTitle,
            ProfileReviewStatus = expert.ProfileReviewStatus,
            AvailableForWork = expert.AvailableForWork,
            FreeProposalSubmitTotal = freeTotal,
            FreeProposalSubmitUsedCount = freeUsed,
            FreeProposalSubmitRemaining = freeRemaining,
            ProposalSubmitCredits = expert.ProposalSubmitCredits,
            CanSubmitProposal = canSubmit,
            CreatedAt = expert.CreatedAt,
            UpdatedAt = expert.UpdatedAt
        };
    }
}