import escrowApi from "../api/escrow.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.escrow) return data.data.escrow;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data) return data.data;

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
  if (Array.isArray(data?.data?.escrows)) return data.data.escrows;

  return [];
};

const normalizeEscrow = (escrow) => {
  if (!escrow) return null;

  const escrowId = getValue(
    escrow.escrowId,
    escrow.EscrowId,
    escrow.id,
    escrow.Id
  );

  const status = String(getValue(escrow.status, escrow.Status, "PENDING"))
    .trim()
    .toUpperCase();

  return {
    escrowId,
    id: escrowId,

    projectId: getValue(escrow.projectId, escrow.ProjectId, null),
    milestoneId: getValue(escrow.milestoneId, escrow.MilestoneId, null),

    amount: Number(
      getValue(
        escrow.amount,
        escrow.Amount,
        escrow.escrowAmount,
        escrow.EscrowAmount,
        escrow.lockedAmount,
        escrow.LockedAmount,
        0
      )
    ),

    status,

    createdAt: getValue(escrow.createdAt, escrow.CreatedAt, ""),
    updatedAt: getValue(escrow.updatedAt, escrow.UpdatedAt, ""),

    raw: escrow,
  };
};

const escrowService = {
  async getProjectEscrows(projectId) {
    const response = await escrowApi.getProjectEscrows(projectId);

    console.log("GET PROJECT ESCROWS RESPONSE:", response?.data);

    return unwrapListData(response).map(normalizeEscrow).filter(Boolean);
  },

  async lockProjectEscrow(projectId) {
    const response = await escrowApi.lockProjectEscrow(projectId);

    console.log("LOCK PROJECT ESCROW RESPONSE:", response?.data);

    return normalizeEscrow(unwrapData(response));
  },

  async lockMilestoneEscrow(milestoneId) {
    const response = await escrowApi.lockMilestoneEscrow(milestoneId);

    console.log("LOCK MILESTONE ESCROW RESPONSE:", response?.data);

    return normalizeEscrow(unwrapData(response));
  },

  async releaseMilestoneEscrow(milestoneId) {
    const response = await escrowApi.releaseMilestoneEscrow(milestoneId);

    console.log("RELEASE MILESTONE ESCROW RESPONSE:", response?.data);

    return normalizeEscrow(unwrapData(response));
  },

  async refundMilestoneEscrow(milestoneId) {
    const response = await escrowApi.refundMilestoneEscrow(milestoneId);

    console.log("REFUND MILESTONE ESCROW RESPONSE:", response?.data);

    return normalizeEscrow(unwrapData(response));
  },

  async freezeMilestoneEscrow(milestoneId) {
    const response = await escrowApi.freezeMilestoneEscrow(milestoneId);

    console.log("FREEZE MILESTONE ESCROW RESPONSE:", response?.data);

    return normalizeEscrow(unwrapData(response));
  },

  normalizeEscrow,
};

export default escrowService;