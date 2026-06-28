export const DELIVERABLE_STATUS = {
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  REVISION_REQUESTED: "REVISION_REQUESTED",
  DISPUTED: "DISPUTED",
};

export const DELIVERABLE_STATUS_LABEL = {
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REVISION_REQUESTED: "Revision Requested",
  DISPUTED: "Disputed",
};

export const canSubmitDeliverableRevision = (status) => {
  const normalized = String(status || "").toUpperCase();

  return normalized === DELIVERABLE_STATUS.REVISION_REQUESTED;
};

export const isDeliverableFinal = (status) => {
  const normalized = String(status || "").toUpperCase();

  return [
    DELIVERABLE_STATUS.APPROVED,
    DELIVERABLE_STATUS.DISPUTED,
  ].includes(normalized);
};