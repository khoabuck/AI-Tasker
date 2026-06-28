export const PROJECT_STATUS = {
  DRAFT: "DRAFT",
  INITIALIZED: "INITIALIZED",
  ACTIVE: "ACTIVE",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  DISPUTED: "DISPUTED",
};

export const PROJECT_STATUS_LABEL = {
  DRAFT: "Draft",
  INITIALIZED: "Initialized",
  ACTIVE: "Active",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed",
};

export const MILESTONE_STATUS = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  IN_PROGRESS: "IN_PROGRESS",
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  REVISION_REQUESTED: "REVISION_REQUESTED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

export const MILESTONE_STATUS_LABEL = {
  PENDING: "Pending",
  ACTIVE: "Active",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REVISION_REQUESTED: "Revision Requested",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const canUpdateMilestone = (status) => {
  const normalized = String(status || "").toUpperCase();

  return [
    MILESTONE_STATUS.PENDING,
    MILESTONE_STATUS.ACTIVE,
    MILESTONE_STATUS.IN_PROGRESS,
    MILESTONE_STATUS.REVISION_REQUESTED,
  ].includes(normalized);
};