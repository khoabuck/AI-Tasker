namespace AITasker.Application.DTOs.Responses;

public class MarketplaceWorkflowPolicyResponse
{
    public int MarketplaceWorkflowPolicyId { get; set; }

    public int ProposalDraftLimit { get; set; }

    public int ProposalMilestoneLimit { get; set; }

    public int FreeProposalSubmitCount { get; set; }

    public int ResubmitNoteMaxLength { get; set; }

    public int EscrowLockWindowHours { get; set; }

    public int ExpertMaxActiveProjects { get; set; }

    public int DeliverableReviewWindowHours { get; set; }

    public int DeliverableAutoApproveGraceHours { get; set; }

    public decimal MinimumWithdrawalAmount { get; set; }

    public decimal WithdrawalFeeRate { get; set; }

    public decimal MinimumDepositAmount { get; set; }

    public decimal MaximumDepositAmount { get; set; }

    public int DisputeLostWarningThreshold { get; set; }

    public bool IsActive { get; set; }

    public int? UpdatedByAdminId { get; set; }

    public string? UpdateReason { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}