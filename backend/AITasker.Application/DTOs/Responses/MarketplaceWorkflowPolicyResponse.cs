namespace AITasker.Application.DTOs.Responses;

public class MarketplaceWorkflowPolicyResponse
{
    public int MarketplaceWorkflowPolicyId { get; set; }

    public int ProposalDraftLimit { get; set; }

    public int ProposalMilestoneLimit { get; set; }

    public int FreeProposalSubmitCount { get; set; }

    public int ResubmitNoteMaxLength { get; set; }

    public int ProposalResubmitLimit { get; set; }

    public int ProposalResubmitWindowHours { get; set; }

    public int ProposalCreditLowWarningThreshold { get; set; }

    public int ContractSignWindowHours { get; set; }

    public int ExpertMaxActiveProjects { get; set; }

    public int DeliverableReviewWindowHours { get; set; }

    public int DeliverableAutoApproveGraceHours { get; set; }

    public int DeliverableArtifactLimit { get; set; }

    public decimal MinimumWithdrawalAmount { get; set; }

    public decimal WithdrawalFeeRate { get; set; }

    public decimal MinimumDepositAmount { get; set; }

    public decimal MaximumDepositAmount { get; set; }

    public int DepositOrderExpireMinutes { get; set; }

    public int WithdrawalApprovalWindowHours { get; set; }

    public int WithdrawalPayoutSyncWarningHours { get; set; }

    public int DisputeLostWarningThreshold { get; set; }

    public bool IsActive { get; set; }

    public int? UpdatedByAdminId { get; set; }

    public string? UpdateReason { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}