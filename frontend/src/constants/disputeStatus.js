export const DISPUTE_STATUS = {
  OPEN: "OPEN",
  UNDER_REVIEW: "UNDER_REVIEW",
  RESOLVED: "RESOLVED",
};

export const DISPUTE_STATUS_LABEL = {
  OPEN: "Open",
  UNDER_REVIEW: "Under Review",
  RESOLVED: "Resolved",
};

export const RESOLUTION_TYPE = {
  RELEASE_TO_EXPERT: "RELEASE_TO_EXPERT",
  REFUND_TO_CLIENT: "REFUND_TO_CLIENT",
  PARTIAL_SPLIT: "PARTIAL_SPLIT",
};

export const RESOLUTION_TYPE_LABEL = {
  RELEASE_TO_EXPERT: "Release To Expert",
  REFUND_TO_CLIENT: "Refund To Client",
  PARTIAL_SPLIT: "Partial Split",
};

export const isDisputeResolved = (status) => {
  return String(status || "").toUpperCase() === DISPUTE_STATUS.RESOLVED;
};