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

    amount: toNumber(
      getValue(item.amount, item.Amount, item.requestedAmount, item.RequestedAmount, 0)
    ),

    currency: getValue(item.currency, item.Currency, "VND"),

    status,

    bankName: getValue(item.bankName, item.BankName, ""),

    bankAccountName: getValue(
      item.bankAccountName,
      item.BankAccountName,
      item.bankAccountHolder,
      item.BankAccountHolder,
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

    payosTransferId: getValue(
      item.payosTransferId,
      item.PayosTransferId,
      item.payOsTransferId,
      item.PayOsTransferId,
      item.transferId,
      item.TransferId,
      ""
    ),

    payosPayoutId: getValue(
      item.payosPayoutId,
      item.PayosPayoutId,
      item.payOsPayoutId,
      item.PayOsPayoutId,
      item.payoutId,
      item.PayoutId,
      ""
    ),

    payosStatus: getValue(
      item.payosStatus,
      item.PayosStatus,
      item.payOsStatus,
      item.PayOsStatus,
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

    createdAt: getValue(
      item.createdAt,
      item.CreatedAt,
      item.requestedAt,
      item.RequestedAt,
      ""
    ),

    updatedAt: getValue(item.updatedAt, item.UpdatedAt, ""),
    approvedAt: getValue(item.approvedAt, item.ApprovedAt, ""),
    rejectedAt: getValue(item.rejectedAt, item.RejectedAt, ""),

    raw: item,
  };
};

export const normalizePayosBalance = (item) => {
  if (!item) {
    return {
      availableBalance: 0,
      currentBalance: 0,
      currency: "VND",
      raw: null,
    };
  }

  return {
    availableBalance: toNumber(
      getValue(
        item.availableBalance,
        item.AvailableBalance,
        item.available,
        item.Available,
        item.balance,
        item.Balance,
        0
      )
    ),

    currentBalance: toNumber(
      getValue(
        item.currentBalance,
        item.CurrentBalance,
        item.totalBalance,
        item.TotalBalance,
        item.balance,
        item.Balance,
        0
      )
    ),

    currency: getValue(item.currency, item.Currency, "VND"),
    raw: item,
  };
};

const buildApprovePayosPayload = (formData = {}) => {
  const reason = String(
    formData.reason || formData.adminNote || "Approve withdrawal via PayOS."
  ).trim();

  return {
    reason,
    adminNote: reason,
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

  async getPayosBalance() {
    const response = await adminWithdrawalApi.getPayosBalance();

    return normalizePayosBalance(unwrapData(response));
  },

  async approveWithdrawalPayos(withdrawalRequestId, formData = {}) {
    if (isInvalidId(withdrawalRequestId)) {
      throw new Error("Invalid withdrawal request id.");
    }

    const payload = buildApprovePayosPayload(formData);

    const response = await adminWithdrawalApi.approveWithdrawalPayos(
      withdrawalRequestId,
      payload
    );

    return normalizeAdminWithdrawal(unwrapData(response));
  },

  async syncWithdrawalPayos(withdrawalRequestId, formData = {}) {
    if (isInvalidId(withdrawalRequestId)) {
      throw new Error("Invalid withdrawal request id.");
    }

    const response = await adminWithdrawalApi.syncWithdrawalPayos(
      withdrawalRequestId,
      formData
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

  async approveWithdrawal(withdrawalRequestId, formData = {}) {
    return this.approveWithdrawalPayos(withdrawalRequestId, formData);
  },
};

export default adminWithdrawalService;
