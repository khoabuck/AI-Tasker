export const CONTRACT_STATUS = {
  DRAFT: "DRAFT",
  PENDING: "PENDING",
  PENDING_EXPERT_CONFIRMATION: "PENDING_EXPERT_CONFIRMATION",
  WAITING_FOR_EXPERT: "WAITING_FOR_EXPERT",
  SENT_TO_EXPERT: "SENT_TO_EXPERT",
  CONFIRMATION_PENDING: "CONFIRMATION_PENDING",

  CONFIRMED: "CONFIRMED",
  ACTIVE: "ACTIVE",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",

  CANCELLED: "CANCELLED",
  REJECTED: "REJECTED",
};

export const CONTRACT_STATUS_LABEL = {
  DRAFT: "Draft",
  PENDING: "Pending",
  PENDING_EXPERT_CONFIRMATION: "Pending Expert Confirmation",
  WAITING_FOR_EXPERT: "Waiting For Expert",
  SENT_TO_EXPERT: "Sent To Expert",
  CONFIRMATION_PENDING: "Confirmation Pending",

  CONFIRMED: "Confirmed",
  ACTIVE: "Active",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",

  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
};

export const CONTRACT_RESPONDABLE_STATUSES = [
  CONTRACT_STATUS.DRAFT,
  CONTRACT_STATUS.PENDING,
  CONTRACT_STATUS.PENDING_EXPERT_CONFIRMATION,
  CONTRACT_STATUS.WAITING_FOR_EXPERT,
  CONTRACT_STATUS.SENT_TO_EXPERT,
  CONTRACT_STATUS.CONFIRMATION_PENDING,
];

export const CONTRACT_FINAL_STATUSES = [
  CONTRACT_STATUS.CONFIRMED,
  CONTRACT_STATUS.ACTIVE,
  CONTRACT_STATUS.IN_PROGRESS,
  CONTRACT_STATUS.COMPLETED,
  CONTRACT_STATUS.CANCELLED,
  CONTRACT_STATUS.REJECTED,
];

export const getContractStatusLabel = (status) => {
  const normalized = String(status || "").toUpperCase();

  return CONTRACT_STATUS_LABEL[normalized] || normalized || "Unknown";
};

export const canRespondToContract = (status) => {
  const normalized = String(status || "").toUpperCase();

  return CONTRACT_RESPONDABLE_STATUSES.includes(normalized);
};

export const canAcceptContract = (status) => {
  return canRespondToContract(status);
};

export const canRejectContract = (status) => {
  return canRespondToContract(status);
};

export const isContractAccepted = (status) => {
  const normalized = String(status || "").toUpperCase();

  return [
    CONTRACT_STATUS.CONFIRMED,
    CONTRACT_STATUS.ACTIVE,
    CONTRACT_STATUS.IN_PROGRESS,
    CONTRACT_STATUS.COMPLETED,
  ].includes(normalized);
};

export const isContractRejected = (status) => {
  const normalized = String(status || "").toUpperCase();

  return [
    CONTRACT_STATUS.CANCELLED,
    CONTRACT_STATUS.REJECTED,
  ].includes(normalized);
};