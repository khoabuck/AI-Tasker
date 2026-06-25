export const PROPOSAL_STATUS = {
  SUBMITTED: "SUBMITTED",
  COUNTER_OFFER: "COUNTER_OFFER",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  WITHDRAWN: "WITHDRAWN",
};

export const PROPOSAL_STATUS_LABEL = {
  SUBMITTED: "Submitted",
  COUNTER_OFFER: "Counter Offer",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

export const FINAL_PROPOSAL_STATUSES = [
  PROPOSAL_STATUS.ACCEPTED,
  PROPOSAL_STATUS.REJECTED,
  PROPOSAL_STATUS.WITHDRAWN,
];

export const canWithdrawProposal = (status) => {
  const normalized = String(status || "").toUpperCase();

  return (
    normalized === PROPOSAL_STATUS.SUBMITTED ||
    normalized === PROPOSAL_STATUS.COUNTER_OFFER
  );
};