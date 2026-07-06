namespace AITasker.Application.DTOs.Requests;

public class UpdateMarketplaceWorkflowPolicyRequest
{
    public int ProposalDraftLimit { get; set; }

    public int ProposalMilestoneLimit { get; set; }

    public int FreeProposalSubmitCount { get; set; }

    public int ResubmitNoteMaxLength { get; set; }

    public int ContractSignWindowHours { get; set; }


    public int ExpertMaxActiveProjects { get; set; }

    public int DeliverableReviewWindowHours { get; set; }

    public int DeliverableAutoApproveGraceHours { get; set; }

    public decimal MinimumWithdrawalAmount { get; set; }

    public decimal WithdrawalFeeRate { get; set; }

    public decimal MinimumDepositAmount { get; set; }

    public decimal MaximumDepositAmount { get; set; }

    public int? DepositOrderExpireMinutes { get; set; }

    public int? WithdrawalApprovalWindowHours { get; set; }

    public int? WithdrawalPayoutSyncWarningHours { get; set; }

    public int DisputeLostWarningThreshold { get; set; }

    public string? Reason { get; set; }
}