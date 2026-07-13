// src/services/escrow.service.js
import escrowApi from "../api/escrow.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isNaN(number) ? fallback : number;
};

const isInvalidId = (value) => {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "undefined" ||
    value === "null" ||
    Number.isNaN(Number(value)) ||
    Number(value) <= 0
  );
};

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.escrow) return data.data.escrow;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;

  if (data?.data !== undefined) {
    return data.data;
  }

  if (data?.escrow) return data.escrow;
  if (data?.item) return data.item;
  if (data?.result) return data.result;

  return data;
};

const unwrapListData = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.escrows)) return data.escrows;

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.escrows)) {
    return data.data.escrows;
  }

  return [];
};

export const normalizeEscrow = (escrow) => {
  if (!escrow) return null;

  const escrowId = getValue(
    escrow.escrowId,
    escrow.EscrowId,
    escrow.id,
    escrow.Id,
    null
  );

  const projectId = getValue(
    escrow.projectId,
    escrow.ProjectId,
    null
  );

  const milestoneId = getValue(
    escrow.milestoneId,
    escrow.MilestoneId,
    null
  );

  const amount = toNumber(
    getValue(
      escrow.amount,
      escrow.Amount,
      escrow.escrowAmount,
      escrow.EscrowAmount,
      escrow.lockedAmount,
      escrow.LockedAmount,
      escrow.totalAmount,
      escrow.TotalAmount,
      0
    )
  );

  const status = String(
    getValue(
      escrow.status,
      escrow.Status,
      escrow.escrowStatus,
      escrow.EscrowStatus,
      "PENDING"
    )
  )
    .trim()
    .toUpperCase();

  return {
    escrowId,
    id: escrowId,

    projectId,
    milestoneId,

    amount,
    status,

    transactionId: getValue(
      escrow.transactionId,
      escrow.TransactionId,
      null
    ),

    walletId: getValue(
      escrow.walletId,
      escrow.WalletId,
      null
    ),

    lockedAt: getValue(
      escrow.lockedAt,
      escrow.LockedAt,
      escrow.createdAt,
      escrow.CreatedAt,
      ""
    ),

    releasedAt: getValue(
      escrow.releasedAt,
      escrow.ReleasedAt,
      ""
    ),

    refundedAt: getValue(
      escrow.refundedAt,
      escrow.RefundedAt,
      ""
    ),

    createdAt: getValue(
      escrow.createdAt,
      escrow.CreatedAt,
      ""
    ),

    updatedAt: getValue(
      escrow.updatedAt,
      escrow.UpdatedAt,
      ""
    ),

    raw: escrow,
  };
};

/**
 * The project lock endpoint may return a project-level result rather than
 * a single escrow entity. Keep the useful lock result fields while also
 * normalizing escrow-compatible fields.
 */
export const normalizeProjectEscrowLockResult = (result) => {
  if (!result) return null;

  const normalizedEscrow = normalizeEscrow(result);

  return {
    ...normalizedEscrow,

    success: Boolean(
      getValue(
        result.success,
        result.Success,
        true
      )
    ),

    message: getValue(
      result.message,
      result.Message,
      ""
    ),

    projectId: getValue(
      result.projectId,
      result.ProjectId,
      normalizedEscrow?.projectId,
      null
    ),

    lockedAmount: toNumber(
      getValue(
        result.lockedAmount,
        result.LockedAmount,
        result.amount,
        result.Amount,
        normalizedEscrow?.amount,
        0
      )
    ),

    totalEscrowAmount: toNumber(
      getValue(
        result.totalEscrowAmount,
        result.TotalEscrowAmount,
        result.requiredAmount,
        result.RequiredAmount,
        result.lockedAmount,
        result.LockedAmount,
        normalizedEscrow?.amount,
        0
      )
    ),

    projectStatus: String(
      getValue(
        result.projectStatus,
        result.ProjectStatus,
        ""
      )
    )
      .trim()
      .toUpperCase(),

    raw: result,
  };
};

const escrowService = {
  async getProjectEscrows(projectId) {
    if (isInvalidId(projectId)) {
      throw new Error("Invalid project id.");
    }

    const response = await escrowApi.getProjectEscrows(
      Number(projectId)
    );

    return unwrapListData(response)
      .map(normalizeEscrow)
      .filter(Boolean);
  },

  async lockProjectEscrow(projectId) {
    if (isInvalidId(projectId)) {
      throw new Error("Invalid project id.");
    }

    const response = await escrowApi.lockProjectEscrow(
      Number(projectId)
    );

    const result = unwrapData(response);

    if (!result) {
      throw new Error("Project escrow lock result is unavailable.");
    }

    return normalizeProjectEscrowLockResult(result);
  },

  normalizeEscrow,
  normalizeProjectEscrowLockResult,
};

export default escrowService;