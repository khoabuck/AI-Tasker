import adminWorkflowPolicyApi from "../api/adminWorkflowPolicy.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;
  if (data?.data) return data.data;
  if (data?.result) return data.result;
  if (data?.item) return data.item;

  return data;
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isNaN(number) ? fallback : number;
};

export const normalizeWorkflowPolicy = (policy) => {
  if (!policy) return null;

  return {
    marketplaceWorkflowPolicyId: getValue(
      policy.marketplaceWorkflowPolicyId,
      policy.MarketplaceWorkflowPolicyId,
      0
    ),

    proposalDraftLimit: toNumber(
      getValue(policy.proposalDraftLimit, policy.ProposalDraftLimit, 0)
    ),

    proposalMilestoneLimit: toNumber(
      getValue(policy.proposalMilestoneLimit, policy.ProposalMilestoneLimit, 0)
    ),

    freeProposalSubmitCount: toNumber(
      getValue(policy.freeProposalSubmitCount, policy.FreeProposalSubmitCount, 0)
    ),

    resubmitNoteMaxLength: toNumber(
      getValue(policy.resubmitNoteMaxLength, policy.ResubmitNoteMaxLength, 0)
    ),

    proposalResubmitLimit: toNumber(
      getValue(policy.proposalResubmitLimit, policy.ProposalResubmitLimit, 0)
    ),

    proposalResubmitWindowHours: toNumber(
      getValue(
        policy.proposalResubmitWindowHours,
        policy.ProposalResubmitWindowHours,
        0
      )
    ),

    proposalCreditLowWarningThreshold: toNumber(
      getValue(
        policy.proposalCreditLowWarningThreshold,
        policy.ProposalCreditLowWarningThreshold,
        0
      )
    ),

    contractSignWindowHours: toNumber(
      getValue(policy.contractSignWindowHours, policy.ContractSignWindowHours, 0)
    ),

    contractSignMissLimit: toNumber(
      getValue(policy.contractSignMissLimit, policy.ContractSignMissLimit, 0)
    ),

    expertMaxActiveProjects: toNumber(
      getValue(policy.expertMaxActiveProjects, policy.ExpertMaxActiveProjects, 0)
    ),

    deliverableReviewWindowHours: toNumber(
      getValue(
        policy.deliverableReviewWindowHours,
        policy.DeliverableReviewWindowHours,
        0
      )
    ),

    deliverableAutoApproveGraceHours: toNumber(
      getValue(
        policy.deliverableAutoApproveGraceHours,
        policy.DeliverableAutoApproveGraceHours,
        0
      )
    ),

    deliverableArtifactLimit: toNumber(
      getValue(
        policy.deliverableArtifactLimit,
        policy.DeliverableArtifactLimit,
        0
      )
    ),

    minimumWithdrawalAmount: toNumber(
      getValue(policy.minimumWithdrawalAmount, policy.MinimumWithdrawalAmount, 0)
    ),

    withdrawalFeeRate: toNumber(
      getValue(policy.withdrawalFeeRate, policy.WithdrawalFeeRate, 0)
    ),

    minimumDepositAmount: toNumber(
      getValue(policy.minimumDepositAmount, policy.MinimumDepositAmount, 0)
    ),

    maximumDepositAmount: toNumber(
      getValue(policy.maximumDepositAmount, policy.MaximumDepositAmount, 0)
    ),

    depositOrderExpireMinutes: toNumber(
      getValue(
        policy.depositOrderExpireMinutes,
        policy.DepositOrderExpireMinutes,
        0
      )
    ),

    withdrawalApprovalWindowHours: toNumber(
      getValue(
        policy.withdrawalApprovalWindowHours,
        policy.WithdrawalApprovalWindowHours,
        0
      )
    ),

    withdrawalPayoutSyncWarningHours: toNumber(
      getValue(
        policy.withdrawalPayoutSyncWarningHours,
        policy.WithdrawalPayoutSyncWarningHours,
        0
      )
    ),

    disputeLostWarningThreshold: toNumber(
      getValue(
        policy.disputeLostWarningThreshold,
        policy.DisputeLostWarningThreshold,
        0
      )
    ),

    isActive: Boolean(getValue(policy.isActive, policy.IsActive, true)),

    updatedByAdminId: getValue(
      policy.updatedByAdminId,
      policy.UpdatedByAdminId,
      null
    ),

    updateReason: getValue(policy.updateReason, policy.UpdateReason, ""),

    createdAt: getValue(policy.createdAt, policy.CreatedAt, ""),
    updatedAt: getValue(policy.updatedAt, policy.UpdatedAt, ""),

    raw: policy,
  };
};

const buildPayload = (form) => ({
  proposalDraftLimit: toNumber(form.proposalDraftLimit),
  proposalMilestoneLimit: toNumber(form.proposalMilestoneLimit),
  freeProposalSubmitCount: toNumber(form.freeProposalSubmitCount),
  resubmitNoteMaxLength: toNumber(form.resubmitNoteMaxLength),
  proposalResubmitLimit: toNumber(form.proposalResubmitLimit),
  proposalResubmitWindowHours: toNumber(form.proposalResubmitWindowHours),
  proposalCreditLowWarningThreshold: toNumber(
    form.proposalCreditLowWarningThreshold
  ),
  contractSignWindowHours: toNumber(form.contractSignWindowHours),
  contractSignMissLimit: toNumber(form.contractSignMissLimit),
  expertMaxActiveProjects: toNumber(form.expertMaxActiveProjects),
  deliverableReviewWindowHours: toNumber(form.deliverableReviewWindowHours),
  deliverableAutoApproveGraceHours: toNumber(
    form.deliverableAutoApproveGraceHours
  ),
  deliverableArtifactLimit: toNumber(form.deliverableArtifactLimit),
  minimumWithdrawalAmount: toNumber(form.minimumWithdrawalAmount),
  withdrawalFeeRate: 0,
  minimumDepositAmount: toNumber(form.minimumDepositAmount),
  maximumDepositAmount: toNumber(form.maximumDepositAmount),
  depositOrderExpireMinutes: toNumber(form.depositOrderExpireMinutes),
  withdrawalApprovalWindowHours: toNumber(form.withdrawalApprovalWindowHours),
  withdrawalPayoutSyncWarningHours: toNumber(
    form.withdrawalPayoutSyncWarningHours
  ),
  disputeLostWarningThreshold: toNumber(form.disputeLostWarningThreshold),
  reason: String(form.reason || "").trim(),
});

const adminWorkflowPolicyService = {
  async getPolicy() {
    const response = await adminWorkflowPolicyApi.getPolicy();
    return normalizeWorkflowPolicy(unwrapData(response));
  },

  async updatePolicy(form) {
    const response = await adminWorkflowPolicyApi.updatePolicy(
      buildPayload(form)
    );

    return normalizeWorkflowPolicy(unwrapData(response));
  },
};

export default adminWorkflowPolicyService;