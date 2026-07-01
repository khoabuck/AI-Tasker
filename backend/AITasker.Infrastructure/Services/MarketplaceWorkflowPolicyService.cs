using System.Text.Json;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Services;

public class MarketplaceWorkflowPolicyService : IMarketplaceWorkflowPolicyService
{
    private const int DefaultProposalDraftLimit = 10;
    private const int DefaultProposalMilestoneLimit = 10;
    private const int DefaultFreeProposalSubmitCount = 5;
    private const int DefaultResubmitNoteMaxLength = 1000;
    private const int DefaultContractSignWindowHours = 24;
    private const int DefaultEscrowLockWindowHours = 24;
    private const int DefaultExpertMaxActiveProjects = 3;
    private const int DefaultDeliverableReviewWindowHours = 24;
    private const int DefaultDeliverableAutoApproveGraceHours = 6;
    private const decimal DefaultMinimumWithdrawalAmount = 1000m;
    private const decimal DefaultWithdrawalFeeRate = 0.10m;
    private const decimal DefaultMinimumDepositAmount = 1000m;
    private const decimal DefaultMaximumDepositAmount = 500000000m;
    private const int DefaultDisputeLostWarningThreshold = 3;

    private readonly AITaskerDbContext _context;
    private readonly IAdminAuditLogService _adminAuditLogService;

    public MarketplaceWorkflowPolicyService(
        AITaskerDbContext context,
        IAdminAuditLogService adminAuditLogService)
    {
        _context = context;
        _adminAuditLogService = adminAuditLogService;
    }

    public async Task<MarketplaceWorkflowPolicyResponse> GetActivePolicyAsync()
    {
        var policy = await GetOrCreateActivePolicyAsync();
        await _context.SaveChangesAsync();

        return MapToResponse(policy);
    }

    public async Task<MarketplaceWorkflowPolicyResponse> UpdateActivePolicyAsync(
        int adminId,
        UpdateMarketplaceWorkflowPolicyRequest request)
    {
        ValidateRequest(request);

        var policy = await GetOrCreateActivePolicyAsync();

        var oldValue = JsonSerializer.Serialize(MapToResponse(policy));

        policy.ProposalDraftLimit = request.ProposalDraftLimit;
        policy.ProposalMilestoneLimit = request.ProposalMilestoneLimit;
        policy.FreeProposalSubmitCount = request.FreeProposalSubmitCount;
        policy.ResubmitNoteMaxLength = request.ResubmitNoteMaxLength;
        policy.ContractSignWindowHours = request.ContractSignWindowHours;
        policy.EscrowLockWindowHours = request.EscrowLockWindowHours;
        policy.ExpertMaxActiveProjects = request.ExpertMaxActiveProjects;
        policy.DeliverableReviewWindowHours = request.DeliverableReviewWindowHours;
        policy.DeliverableAutoApproveGraceHours = request.DeliverableAutoApproveGraceHours;
        policy.MinimumWithdrawalAmount = request.MinimumWithdrawalAmount;
        policy.WithdrawalFeeRate = request.WithdrawalFeeRate;
        policy.MinimumDepositAmount = request.MinimumDepositAmount;
        policy.MaximumDepositAmount = request.MaximumDepositAmount;
        policy.DisputeLostWarningThreshold = request.DisputeLostWarningThreshold;
        policy.UpdatedByAdminId = adminId;
        policy.UpdateReason = request.Reason?.Trim();
        policy.UpdatedAt = DateTime.UtcNow;

        var newValue = JsonSerializer.Serialize(MapToResponse(policy));

        await _context.SaveChangesAsync();

        await _adminAuditLogService.LogAsync(
            adminId,
            "UPDATE_MARKETPLACE_WORKFLOW_POLICY",
            nameof(MarketplaceWorkflowPolicy),
            policy.MarketplaceWorkflowPolicyId,
            oldValue,
            newValue,
            request.Reason
        );

        return MapToResponse(policy);
    }

    private async Task<MarketplaceWorkflowPolicy> GetOrCreateActivePolicyAsync()
    {
        var policy = await _context.MarketplaceWorkflowPolicies
            .FirstOrDefaultAsync(x => x.IsActive);

        if (policy != null)
        {
            return policy;
        }

        policy = CreateDefaultPolicy();

        _context.MarketplaceWorkflowPolicies.Add(policy);

        return policy;
    }

    private static MarketplaceWorkflowPolicy CreateDefaultPolicy()
    {
        return new MarketplaceWorkflowPolicy
        {
            ProposalDraftLimit = DefaultProposalDraftLimit,
            ProposalMilestoneLimit = DefaultProposalMilestoneLimit,
            FreeProposalSubmitCount = DefaultFreeProposalSubmitCount,
            ResubmitNoteMaxLength = DefaultResubmitNoteMaxLength,
            ContractSignWindowHours = DefaultContractSignWindowHours,
            EscrowLockWindowHours = DefaultEscrowLockWindowHours,
            ExpertMaxActiveProjects = DefaultExpertMaxActiveProjects,
            DeliverableReviewWindowHours = DefaultDeliverableReviewWindowHours,
            DeliverableAutoApproveGraceHours = DefaultDeliverableAutoApproveGraceHours,
            MinimumWithdrawalAmount = DefaultMinimumWithdrawalAmount,
            WithdrawalFeeRate = DefaultWithdrawalFeeRate,
            MinimumDepositAmount = DefaultMinimumDepositAmount,
            MaximumDepositAmount = DefaultMaximumDepositAmount,
            DisputeLostWarningThreshold = DefaultDisputeLostWarningThreshold,
            IsActive = true,
            UpdateReason = "Default marketplace workflow policy.",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private static void ValidateRequest(UpdateMarketplaceWorkflowPolicyRequest request)
    {
        if (request.ProposalDraftLimit < 0 || request.ProposalDraftLimit > 100)
        {
            throw new InvalidOperationException("Proposal draft limit must be between 0 and 100.");
        }

        if (request.ProposalMilestoneLimit <= 0 || request.ProposalMilestoneLimit > 50)
        {
            throw new InvalidOperationException("Proposal milestone limit must be between 1 and 50.");
        }

        if (request.FreeProposalSubmitCount < 0 || request.FreeProposalSubmitCount > 100)
        {
            throw new InvalidOperationException("Free proposal submit count must be between 0 and 100.");
        }

        if (request.ResubmitNoteMaxLength < 100 || request.ResubmitNoteMaxLength > 5000)
        {
            throw new InvalidOperationException("Resubmit note max length must be between 100 and 5000.");
        }

        if (request.ContractSignWindowHours <= 0 || request.ContractSignWindowHours > 720)
        {
            throw new InvalidOperationException("Contract sign window hours must be between 1 and 720.");
        }

        if (request.EscrowLockWindowHours <= 0 || request.EscrowLockWindowHours > 720)
        {
            throw new InvalidOperationException("Escrow lock window hours must be between 1 and 720.");
        }

        if (request.ExpertMaxActiveProjects <= 0 || request.ExpertMaxActiveProjects > 50)
        {
            throw new InvalidOperationException("Expert max active projects must be between 1 and 50.");
        }

        if (request.DeliverableReviewWindowHours <= 0 || request.DeliverableReviewWindowHours > 720)
        {
            throw new InvalidOperationException("Deliverable review window hours must be between 1 and 720.");
        }

        if (request.DeliverableAutoApproveGraceHours <= 0 || request.DeliverableAutoApproveGraceHours > 168)
        {
            throw new InvalidOperationException("Deliverable auto approve grace hours must be between 1 and 168.");
        }

        if (request.MinimumWithdrawalAmount < 0)
        {
            throw new InvalidOperationException("Minimum withdrawal amount cannot be negative.");
        }

        if (request.WithdrawalFeeRate < 0 || request.WithdrawalFeeRate > 1)
        {
            throw new InvalidOperationException("Withdrawal fee rate must be between 0 and 1.");
        }

        if (request.MinimumDepositAmount < 0)
        {
            throw new InvalidOperationException("Minimum deposit amount cannot be negative.");
        }

        if (request.MaximumDepositAmount <= request.MinimumDepositAmount)
        {
            throw new InvalidOperationException("Maximum deposit amount must be greater than minimum deposit amount.");
        }

        if (request.DisputeLostWarningThreshold <= 0 || request.DisputeLostWarningThreshold > 20)
        {
            throw new InvalidOperationException("Dispute lost warning threshold must be between 1 and 20.");
        }
    }

    private static MarketplaceWorkflowPolicyResponse MapToResponse(
        MarketplaceWorkflowPolicy policy)
    {
        return new MarketplaceWorkflowPolicyResponse
        {
            MarketplaceWorkflowPolicyId = policy.MarketplaceWorkflowPolicyId,
            ProposalDraftLimit = policy.ProposalDraftLimit,
            ProposalMilestoneLimit = policy.ProposalMilestoneLimit,
            FreeProposalSubmitCount = policy.FreeProposalSubmitCount,
            ResubmitNoteMaxLength = policy.ResubmitNoteMaxLength,
            ContractSignWindowHours = policy.ContractSignWindowHours,
            EscrowLockWindowHours = policy.EscrowLockWindowHours,
            ExpertMaxActiveProjects = policy.ExpertMaxActiveProjects,
            DeliverableReviewWindowHours = policy.DeliverableReviewWindowHours,
            DeliverableAutoApproveGraceHours = policy.DeliverableAutoApproveGraceHours,
            MinimumWithdrawalAmount = policy.MinimumWithdrawalAmount,
            WithdrawalFeeRate = policy.WithdrawalFeeRate,
            MinimumDepositAmount = policy.MinimumDepositAmount,
            MaximumDepositAmount = policy.MaximumDepositAmount,
            DisputeLostWarningThreshold = policy.DisputeLostWarningThreshold,
            IsActive = policy.IsActive,
            UpdatedByAdminId = policy.UpdatedByAdminId,
            UpdateReason = policy.UpdateReason,
            CreatedAt = policy.CreatedAt,
            UpdatedAt = policy.UpdatedAt
        };
    }
}