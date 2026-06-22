export const PROPOSAL_STATUS = {
  SUBMITTED: "SUBMITTED",
  REVISION_REQUESTED: "REVISION_REQUESTED",
  NEEDS_REVISION: "NEEDS_REVISION",
  RESUBMISSION_REQUESTED: "RESUBMISSION_REQUESTED",
  COUNTER_OFFER: "COUNTER_OFFER",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  WITHDRAWN: "WITHDRAWN",
  CANCELLED: "CANCELLED",
};

export const PROPOSAL_STATUS_LABEL = {
  SUBMITTED: "Submitted",
  REVISION_REQUESTED: "Revision Requested",
  NEEDS_REVISION: "Needs Revision",
  RESUBMISSION_REQUESTED: "Resubmission Requested",
  COUNTER_OFFER: "Counter Offer",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  CANCELLED: "Cancelled",
};

export const FINAL_PROPOSAL_STATUSES = [
  PROPOSAL_STATUS.ACCEPTED,
  PROPOSAL_STATUS.REJECTED,
  PROPOSAL_STATUS.WITHDRAWN,
  PROPOSAL_STATUS.CANCELLED,
];

export const REVISION_PROPOSAL_STATUSES = [
  PROPOSAL_STATUS.REVISION_REQUESTED,
  PROPOSAL_STATUS.NEEDS_REVISION,
  PROPOSAL_STATUS.RESUBMISSION_REQUESTED,
  PROPOSAL_STATUS.COUNTER_OFFER,
];

export const canWithdrawProposal = (status) => {
  const normalized = String(status || "").toUpperCase();

  return [
    PROPOSAL_STATUS.SUBMITTED,
    PROPOSAL_STATUS.REVISION_REQUESTED,
    PROPOSAL_STATUS.NEEDS_REVISION,
    PROPOSAL_STATUS.RESUBMISSION_REQUESTED,
    PROPOSAL_STATUS.COUNTER_OFFER,
  ].includes(normalized);
};

export const canResubmitProposal = (status) => {
  const normalized = String(status || "").toUpperCase();

  return REVISION_PROPOSAL_STATUSES.includes(normalized);
};

export const canViewContractFromProposal = (status, contractId) => {
  const normalized = String(status || "").toUpperCase();

  return normalized === PROPOSAL_STATUS.ACCEPTED && Boolean(contractId);
};

export const canOpenContractFromProposal = (status) => {
  const normalized = String(status || "").toUpperCase();

  return normalized === PROPOSAL_STATUS.ACCEPTED;
};

export const getProposalStatusLabel = (status) => {
  const normalized = String(status || "").toUpperCase();

  return PROPOSAL_STATUS_LABEL[normalized] || normalized || "Unknown";
};

export const isFinalProposalStatus = (status) => {
  const normalized = String(status || "").toUpperCase();

  return FINAL_PROPOSAL_STATUSES.includes(normalized);
};