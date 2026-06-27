import adminWithdrawalApi from "../api/adminWithdrawal.api";

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
  return !value || value === "undefined" || value === "null";
};

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.withdrawal) return data.data.withdrawal;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data) return data.data;

  if (data?.withdrawal) return data.withdrawal;
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
  if (Array.isArray(data?.withdrawals)) return data.withdrawals;

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.withdrawals)) return data.data.withdrawals;

  return [];
};

export const normalizeAdminWithdrawal = (item) => {
  if (!item) return null;

  const withdrawalRequestId = getValue(
    item.withdrawalRequestId,
    item.WithdrawalRequestId,
    item.withdrawalId,
    item.WithdrawalId,
    item.id,
    item.Id
  );

  const status = String(getValue(item.status, item.Status, "PENDING"))
    .trim()
    .toUpperCase();

  return {
    withdrawalRequestId,
    id: withdrawalRequestId,

    expertId: getValue(
      item.expertId,
      item.ExpertId,
      item.expertProfileId,
      item.ExpertProfileId,
      item.expert?.expertProfileId,
      item.Expert?.ExpertProfileId,
      null
    ),

    expertName: getValue(
      item.expertName,
      item.ExpertName,
      item.fullName,
      item.FullName,
      item.expert?.fullName,
      item.Expert?.FullName,
      "Expert"
    ),

    expertEmail: getValue(
      item.expertEmail,
      item.ExpertEmail,
      item.email,
      item.Email,
      item.expert?.email,
      item.Expert?.Email,
      ""
    ),

    amount: toNumber(getValue(item.amount, item.Amount, item.requestedAmount, item.RequestedAmount, 0)),

    currency: getValue(item.currency, item.Currency, "USD"),

    status,

    bankName: getValue(item.bankName, item.BankName, ""),
    bankAccountName: getValue(
      item.bankAccountName,
      item.BankAccountName,
      item.accountName,
      item.AccountName,
      ""
    ),
    bankAccountNumber: getValue(
      item.bankAccountNumber,
      item.BankAccountNumber,
      item.accountNumber,
      item.AccountNumber,
      ""
    ),

    paymentMethod: getValue(
      item.paymentMethod,
      item.PaymentMethod,
      item.method,
      item.Method,
      ""
    ),

    adminNote: getValue(item.adminNote, item.AdminNote, item.note, item.Note, ""),
    rejectionReason: getValue(
      item.rejectionReason,
      item.RejectionReason,
      item.rejectReason,
      item.RejectReason,
      ""
    ),

    createdAt: getValue(item.createdAt, item.CreatedAt, item.requestedAt, item.RequestedAt, ""),
    updatedAt: getValue(item.updatedAt, item.UpdatedAt, ""),
    approvedAt: getValue(item.approvedAt, item.ApprovedAt, ""),
    rejectedAt: getValue(item.rejectedAt, item.RejectedAt, ""),

    raw: item,
  };
};

const buildApprovePayload = (formData = {}) => {
  return {
    reason:
      String(formData.reason || formData.adminNote || "Approve withdrawal request.").trim(),
  };
};

const buildRejectPayload = (formData = {}) => {
  return {
    reason: String(formData.reason || formData.rejectionReason || "").trim(),
  };
};

const adminWithdrawalService = {
  async getWithdrawals(params = {}) {
    const response = await adminWithdrawalApi.getWithdrawals(params);

    return unwrapListData(response)
      .map(normalizeAdminWithdrawal)
      .filter(Boolean);
  },

  async approveWithdrawal(withdrawalRequestId, formData = {}) {
    if (isInvalidId(withdrawalRequestId)) {
      throw new Error("Invalid withdrawal request id.");
    }

    const payload = buildApprovePayload(formData);
    const response = await adminWithdrawalApi.approveWithdrawal(
      withdrawalRequestId,
      payload
    );

    return normalizeAdminWithdrawal(unwrapData(response));
  },

  async rejectWithdrawal(withdrawalRequestId, formData = {}) {
    if (isInvalidId(withdrawalRequestId)) {
      throw new Error("Invalid withdrawal request id.");
    }

    const payload = buildRejectPayload(formData);
    const response = await adminWithdrawalApi.rejectWithdrawal(
      withdrawalRequestId,
      payload
    );

    return normalizeAdminWithdrawal(unwrapData(response));
  },
};

export default adminWithdrawalService;