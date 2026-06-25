export const TRANSACTION_STATUS = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
};

export const TRANSACTION_STATUS_LABEL = {
  PENDING: "Pending",
  SUCCESS: "Success",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export const WITHDRAWAL_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  COMPLETED: "COMPLETED",
};

export const WITHDRAWAL_STATUS_LABEL = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
};

export const getMoneyStatusClass = (status) => {
  const normalized = String(status || "").toUpperCase();

  if (
    normalized === TRANSACTION_STATUS.SUCCESS ||
    normalized === TRANSACTION_STATUS.COMPLETED ||
    normalized === WITHDRAWAL_STATUS.APPROVED ||
    normalized === WITHDRAWAL_STATUS.COMPLETED
  ) {
    return "border-green-400/30 bg-green-400/10 text-green-300";
  }

  if (normalized === TRANSACTION_STATUS.PENDING || normalized === WITHDRAWAL_STATUS.PENDING) {
    return "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";
  }

  if (
    normalized === TRANSACTION_STATUS.FAILED ||
    normalized === TRANSACTION_STATUS.CANCELLED ||
    normalized === WITHDRAWAL_STATUS.REJECTED
  ) {
    return "border-red-400/30 bg-red-400/10 text-red-300";
  }

  return "border-gray-400/30 bg-gray-400/10 text-gray-300";
};