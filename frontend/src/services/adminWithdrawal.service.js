import adminWithdrawalApi from "../api/adminWithdrawal.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data !== undefined) return data.data;
  if (data?.result !== undefined) return data.result;
  if (data?.item !== undefined) return data.item;

  return data;
};

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.result)) return value.result;

  return [];
};

const normalizeWithdrawal = (item) => {
  if (!item) return null;

  const withdrawalRequestId = getValue(
    item.withdrawalRequestId,
    item.WithdrawalRequestId,
    item.id,
    item.Id
  );

  return {
    withdrawalRequestId,
    id: withdrawalRequestId,

    userId: getValue(item.userId, item.UserId),

    userFullName: getValue(
      item.userFullName,
      item.UserFullName,
      item.fullName,
      item.FullName,
      item.userName,
      item.UserName,
      "Unknown User"
    ),

    userEmail: getValue(
      item.userEmail,
      item.UserEmail,
      item.email,
      item.Email,
      "No email"
    ),

    amount: Number(getValue(item.amount, item.Amount, 0)),

    bankName: getValue(item.bankName, item.BankName, "N/A"),

    bankAccountNumber: getValue(
      item.bankAccountNumber,
      item.BankAccountNumber,
      "N/A"
    ),

    bankAccountHolder: getValue(
      item.bankAccountHolder,
      item.BankAccountHolder,
      "N/A"
    ),

    status: String(getValue(item.status, item.Status, "PENDING"))
      .trim()
      .toUpperCase(),

    adminNote: getValue(item.adminNote, item.AdminNote, ""),

    createdAt: getValue(item.createdAt, item.CreatedAt, ""),

    processedAt: getValue(item.processedAt, item.ProcessedAt, ""),

    processedByAdminId: getValue(
      item.processedByAdminId,
      item.ProcessedByAdminId,
      null
    ),

    raw: item,
  };
};

const buildProcessPayload = (adminNote) => {
  return {
    adminNote: String(adminNote || "").trim(),
  };
};

const adminWithdrawalService = {
  async getAllWithdrawals(status = "ALL") {
    const response = await adminWithdrawalApi.getAllWithdrawals(status);
    const raw = unwrapData(response);

    return normalizeArray(raw).map(normalizeWithdrawal).filter(Boolean);
  },

  async approveWithdrawal(withdrawalRequestId, adminNote = "") {
    const response = await adminWithdrawalApi.approveWithdrawal(
      withdrawalRequestId,
      buildProcessPayload(adminNote)
    );

    return normalizeWithdrawal(unwrapData(response));
  },

  async rejectWithdrawal(withdrawalRequestId, adminNote = "") {
    const response = await adminWithdrawalApi.rejectWithdrawal(
      withdrawalRequestId,
      buildProcessPayload(adminNote)
    );

    return normalizeWithdrawal(unwrapData(response));
  },
};

export default adminWithdrawalService;