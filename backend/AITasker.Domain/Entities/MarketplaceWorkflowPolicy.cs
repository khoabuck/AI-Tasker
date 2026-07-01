namespace AITasker.Domain.Entities;

public class MarketplaceWorkflowPolicy
{
    public int MarketplaceWorkflowPolicyId { get; set; }

    public int ProposalDraftLimit { get; set; } = 10;

    public int ProposalMilestoneLimit { get; set; } = 10;

    public int FreeProposalSubmitCount { get; set; } = 5;

    public int ResubmitNoteMaxLength { get; set; } = 1000;

    public int ContractSignWindowHours { get; set; } = 24;

    public int EscrowLockWindowHours { get; set; } = 24;

    public int ExpertMaxActiveProjects { get; set; } = 3;

    public int DeliverableReviewWindowHours { get; set; } = 24;

    public int DeliverableAutoApproveGraceHours { get; set; } = 6;

    public decimal MinimumWithdrawalAmount { get; set; } = 1000m;

    public decimal WithdrawalFeeRate { get; set; } = 0.10m;

    public decimal MinimumDepositAmount { get; set; } = 1000m;

    public decimal MaximumDepositAmount { get; set; } = 500000000m;

    public int DisputeLostWarningThreshold { get; set; } = 3;

    public bool IsActive { get; set; } = true;

    public int? UpdatedByAdminId { get; set; }

    public string? UpdateReason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User? UpdatedByAdmin { get; set; }
}