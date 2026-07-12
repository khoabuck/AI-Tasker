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
    private const int DefaultProposalResubmitLimit = 0;
    private const int DefaultProposalResubmitWindowHours = 0;
    private const int DefaultProposalCreditLowWarningThreshold = 3;
    private const int DefaultContractSignWindowHours = 24;
    private const int DefaultExpertMaxActiveProjects = 3;
    private const int DefaultDeliverableReviewWindowHours = 24;
    private const int DefaultDeliverableAutoApproveGraceHours = 6;
    private const int DefaultDeliverableArtifactLimit = 10;
    private const decimal DefaultMinimumWithdrawalAmount = 1000m;
    private const decimal DefaultWithdrawalFeeRate = 0m;
    private const decimal DefaultMinimumDepositAmount = 1000m;
    private const decimal DefaultMaximumDepositAmount = 500000000m;
    private const int DefaultDepositOrderExpireMinutes = 3;
    private const int DefaultWithdrawalApprovalWindowHours = 2;
    private const int DefaultWithdrawalPayoutSyncWarningHours = 24;
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
        policy.ProposalResubmitLimit = request.ProposalResubmitLimit ?? policy.ProposalResubmitLimit;
        policy.ProposalResubmitWindowHours = request.ProposalResubmitWindowHours ?? policy.ProposalResubmitWindowHours;
        policy.ProposalCreditLowWarningThreshold = request.ProposalCreditLowWarningThreshold ?? policy.ProposalCreditLowWarningThreshold;
        policy.ContractSignWindowHours = request.ContractSignWindowHours;
        policy.ExpertMaxActiveProjects = request.ExpertMaxActiveProjects;
        policy.DeliverableReviewWindowHours = request.DeliverableReviewWindowHours;
        policy.DeliverableAutoApproveGraceHours = request.DeliverableAutoApproveGraceHours;
        policy.DeliverableArtifactLimit = request.DeliverableArtifactLimit ?? policy.DeliverableArtifactLimit;
        policy.MinimumWithdrawalAmount = request.MinimumWithdrawalAmount;
        // Withdrawal fee is disabled by business rule. Keep the legacy field at 0.
        policy.WithdrawalFeeRate = 0m;
        policy.MinimumDepositAmount = request.MinimumDepositAmount;
        policy.MaximumDepositAmount = request.MaximumDepositAmount;
        policy.DepositOrderExpireMinutes = request.DepositOrderExpireMinutes ?? policy.DepositOrderExpireMinutes;
        policy.WithdrawalApprovalWindowHours = request.WithdrawalApprovalWindowHours ?? policy.WithdrawalApprovalWindowHours;
        policy.WithdrawalPayoutSyncWarningHours = request.WithdrawalPayoutSyncWarningHours ?? policy.WithdrawalPayoutSyncWarningHours;
        policy.DisputeLostWarningThreshold = request.DisputeLostWarningThreshold;

        ValidateResolvedPolicy(policy);

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
            .SingleOrDefaultAsync(x => x.IsActive);

        if (policy != null)
        {
            NormalizeLegacyDefaultPolicy(policy);
            return policy;
        }

        policy = CreateDefaultPolicy();

        _context.MarketplaceWorkflowPolicies.Add(policy);

        return policy;
    }

    private static void NormalizeLegacyDefaultPolicy(MarketplaceWorkflowPolicy policy)
    {
        var changed = false;

        // Older seed data used 1 free proposal submit while current service/entity defaults use 5.
        // Only normalize untouched default rows so an admin setting of 1 is never overwritten.
        if (policy.UpdatedByAdminId == null &&
            policy.FreeProposalSubmitCount == 1 &&
            string.Equals(policy.UpdateReason, "Default marketplace workflow policy.", StringComparison.OrdinalIgnoreCase))
        {
            policy.FreeProposalSubmitCount = DefaultFreeProposalSubmitCount;
            changed = true;
        }

        if (policy.ProposalMilestoneLimit <= 0) { policy.ProposalMilestoneLimit = DefaultProposalMilestoneLimit; changed = true; }
        if (policy.ResubmitNoteMaxLength <= 0) { policy.ResubmitNoteMaxLength = DefaultResubmitNoteMaxLength; changed = true; }
        if (policy.ProposalResubmitLimit < 0) { policy.ProposalResubmitLimit = DefaultProposalResubmitLimit; changed = true; }
        if (policy.ProposalResubmitWindowHours < 0) { policy.ProposalResubmitWindowHours = DefaultProposalResubmitWindowHours; changed = true; }
        if (policy.ProposalCreditLowWarningThreshold < 0) { policy.ProposalCreditLowWarningThreshold = DefaultProposalCreditLowWarningThreshold; changed = true; }
        if (policy.ContractSignWindowHours <= 0) { policy.ContractSignWindowHours = DefaultContractSignWindowHours; changed = true; }
        if (policy.ExpertMaxActiveProjects <= 0) { policy.ExpertMaxActiveProjects = DefaultExpertMaxActiveProjects; changed = true; }
        if (policy.DeliverableReviewWindowHours <= 0) { policy.DeliverableReviewWindowHours = DefaultDeliverableReviewWindowHours; changed = true; }
        if (policy.DeliverableAutoApproveGraceHours <= 0) { policy.DeliverableAutoApproveGraceHours = DefaultDeliverableAutoApproveGraceHours; changed = true; }
        if (policy.DeliverableArtifactLimit <= 0) { policy.DeliverableArtifactLimit = DefaultDeliverableArtifactLimit; changed = true; }
        if (policy.MinimumDepositAmount <= 0) { policy.MinimumDepositAmount = DefaultMinimumDepositAmount; changed = true; }
        if (policy.MaximumDepositAmount <= policy.MinimumDepositAmount) { policy.MaximumDepositAmount = DefaultMaximumDepositAmount; changed = true; }
        if (policy.WithdrawalFeeRate != 0m) { policy.WithdrawalFeeRate = DefaultWithdrawalFeeRate; changed = true; }
        if (policy.DepositOrderExpireMinutes <= 0) { policy.DepositOrderExpireMinutes = DefaultDepositOrderExpireMinutes; changed = true; }
        if (policy.WithdrawalApprovalWindowHours <= 0) { policy.WithdrawalApprovalWindowHours = DefaultWithdrawalApprovalWindowHours; changed = true; }
        if (policy.WithdrawalPayoutSyncWarningHours <= 0) { policy.WithdrawalPayoutSyncWarningHours = DefaultWithdrawalPayoutSyncWarningHours; changed = true; }
        if (policy.DisputeLostWarningThreshold <= 0) { policy.DisputeLostWarningThreshold = DefaultDisputeLostWarningThreshold; changed = true; }

        if (changed)
        {
            policy.UpdatedAt = DateTime.UtcNow;
        }
    }

    private static MarketplaceWorkflowPolicy CreateDefaultPolicy()
    {
        return new MarketplaceWorkflowPolicy
        {
            ProposalDraftLimit = DefaultProposalDraftLimit,
            ProposalMilestoneLimit = DefaultProposalMilestoneLimit,
            FreeProposalSubmitCount = DefaultFreeProposalSubmitCount,
            ResubmitNoteMaxLength = DefaultResubmitNoteMaxLength,
            ProposalResubmitLimit = DefaultProposalResubmitLimit,
            ProposalResubmitWindowHours = DefaultProposalResubmitWindowHours,
            ProposalCreditLowWarningThreshold = DefaultProposalCreditLowWarningThreshold,
            ContractSignWindowHours = DefaultContractSignWindowHours,
            ExpertMaxActiveProjects = DefaultExpertMaxActiveProjects,
            DeliverableReviewWindowHours = DefaultDeliverableReviewWindowHours,
            DeliverableAutoApproveGraceHours = DefaultDeliverableAutoApproveGraceHours,
            DeliverableArtifactLimit = DefaultDeliverableArtifactLimit,
            MinimumWithdrawalAmount = DefaultMinimumWithdrawalAmount,
            WithdrawalFeeRate = DefaultWithdrawalFeeRate,
            MinimumDepositAmount = DefaultMinimumDepositAmount,
            MaximumDepositAmount = DefaultMaximumDepositAmount,
            DepositOrderExpireMinutes = DefaultDepositOrderExpireMinutes,
            WithdrawalApprovalWindowHours = DefaultWithdrawalApprovalWindowHours,
            WithdrawalPayoutSyncWarningHours = DefaultWithdrawalPayoutSyncWarningHours,
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

        if (request.ProposalResubmitLimit.HasValue &&
            (request.ProposalResubmitLimit.Value < 0 || request.ProposalResubmitLimit.Value > 100))
        {
            throw new InvalidOperationException("Proposal resubmit limit must be between 0 and 100. Use 0 for unlimited.");
        }

        if (request.ProposalResubmitWindowHours.HasValue &&
            (request.ProposalResubmitWindowHours.Value < 0 || request.ProposalResubmitWindowHours.Value > 8760))
        {
            throw new InvalidOperationException("Proposal resubmit window hours must be between 0 and 8760. Use 0 for lifetime counting.");
        }

        if (request.ProposalCreditLowWarningThreshold.HasValue &&
            (request.ProposalCreditLowWarningThreshold.Value < 0 || request.ProposalCreditLowWarningThreshold.Value > 1000))
        {
            throw new InvalidOperationException("Proposal credit low warning threshold must be between 0 and 1000.");
        }

        if (request.ContractSignWindowHours <= 0 || request.ContractSignWindowHours > 720)
        {
            throw new InvalidOperationException("Contract sign window hours must be between 1 and 720.");
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

        if (request.DeliverableArtifactLimit.HasValue &&
            (request.DeliverableArtifactLimit.Value <= 0 || request.DeliverableArtifactLimit.Value > 100))
        {
            throw new InvalidOperationException("Deliverable artifact limit must be between 1 and 100.");
        }

        if (request.MinimumWithdrawalAmount < 0)
        {
            throw new InvalidOperationException("Minimum withdrawal amount cannot be negative.");
        }

        // Withdrawal fee is disabled by business rule. Ignore request.WithdrawalFeeRate.

        if (request.MinimumDepositAmount < 0)
        {
            throw new InvalidOperationException("Minimum deposit amount cannot be negative.");
        }

        if (request.MaximumDepositAmount <= request.MinimumDepositAmount)
        {
            throw new InvalidOperationException("Maximum deposit amount must be greater than minimum deposit amount.");
        }

        if (request.DepositOrderExpireMinutes.HasValue &&
            (request.DepositOrderExpireMinutes.Value <= 0 || request.DepositOrderExpireMinutes.Value > 1440))
        {
            throw new InvalidOperationException("Deposit order expire minutes must be between 1 and 1440.");
        }

        if (request.WithdrawalApprovalWindowHours.HasValue &&
            (request.WithdrawalApprovalWindowHours.Value <= 0 || request.WithdrawalApprovalWindowHours.Value > 720))
        {
            throw new InvalidOperationException("Withdrawal approval window hours must be between 1 and 720.");
        }

        if (request.WithdrawalPayoutSyncWarningHours.HasValue &&
            (request.WithdrawalPayoutSyncWarningHours.Value <= 0 || request.WithdrawalPayoutSyncWarningHours.Value > 720))
        {
            throw new InvalidOperationException("Withdrawal payout sync warning hours must be between 1 and 720.");
        }

        if (request.DisputeLostWarningThreshold <= 0 || request.DisputeLostWarningThreshold > 20)
        {
            throw new InvalidOperationException("Dispute lost warning threshold must be between 1 and 20.");
        }
    }

    private static void ValidateResolvedPolicy(MarketplaceWorkflowPolicy policy)
    {
        if (policy.ProposalResubmitLimit < 0)
        {
            throw new InvalidOperationException("Proposal resubmit limit cannot be negative.");
        }

        if (policy.ProposalResubmitWindowHours < 0)
        {
            throw new InvalidOperationException("Proposal resubmit window hours cannot be negative.");
        }

        if (policy.ProposalCreditLowWarningThreshold < 0)
        {
            throw new InvalidOperationException("Proposal credit low warning threshold cannot be negative.");
        }

        if (policy.DeliverableArtifactLimit <= 0)
        {
            throw new InvalidOperationException("Deliverable artifact limit must be greater than 0.");
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
            ProposalResubmitLimit = policy.ProposalResubmitLimit,
            ProposalResubmitWindowHours = policy.ProposalResubmitWindowHours,
            ProposalCreditLowWarningThreshold = policy.ProposalCreditLowWarningThreshold,
            ContractSignWindowHours = policy.ContractSignWindowHours,
            ExpertMaxActiveProjects = policy.ExpertMaxActiveProjects,
            DeliverableReviewWindowHours = policy.DeliverableReviewWindowHours,
            DeliverableAutoApproveGraceHours = policy.DeliverableAutoApproveGraceHours,
            DeliverableArtifactLimit = policy.DeliverableArtifactLimit,
            MinimumWithdrawalAmount = policy.MinimumWithdrawalAmount,
            WithdrawalFeeRate = policy.WithdrawalFeeRate,
            MinimumDepositAmount = policy.MinimumDepositAmount,
            MaximumDepositAmount = policy.MaximumDepositAmount,
            DepositOrderExpireMinutes = policy.DepositOrderExpireMinutes,
            WithdrawalApprovalWindowHours = policy.WithdrawalApprovalWindowHours,
            WithdrawalPayoutSyncWarningHours = policy.WithdrawalPayoutSyncWarningHours,
            DisputeLostWarningThreshold = policy.DisputeLostWarningThreshold,
            IsActive = policy.IsActive,
            UpdatedByAdminId = policy.UpdatedByAdminId,
            UpdateReason = policy.UpdateReason,
            CreatedAt = policy.CreatedAt,
            UpdatedAt = policy.UpdatedAt
        };
    }
}