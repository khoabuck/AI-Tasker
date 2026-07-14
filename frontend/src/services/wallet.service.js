import { walletApi } from "../api/wallet.api";
import { compareDateDesc } from "../utils/dateTime.utils";

const unwrap = (response) => response?.data?.data ?? response?.data;

const normalizeList = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.result)) return raw.result;
  return [];
};

const sortNewestFirst = (items) => {
  return [...items].sort((a, b) =>
    compareDateDesc(
      a?.updatedAt || a?.processedAt || a?.paidAt || a?.createdAt,
      b?.updatedAt || b?.processedAt || b?.paidAt || b?.createdAt
    )
  );
};

export const walletService = {
  async getWallet() {
    const response = await walletApi.getWallet();
    const data = unwrap(response);

    return {
      ...data,
      availableBalance: Number(data?.availableBalance ?? 0),
      lockedBalance: Number(data?.lockedBalance ?? 0),
      pendingEarningsBalance: Number(data?.pendingEarningsBalance ?? 0),
      withdrawableBalance: Number(
        data?.withdrawableBalance ?? data?.availableBalance ?? 0
      ),
      totalEarnings: Number(
        data?.totalEarnings ?? data?.totalEarning ?? 0
      ),
    };
  },

  async getTransactions() {
    const response = await walletApi.getTransactions();
    return sortNewestFirst(normalizeList(unwrap(response)));
  },

  async getDepositOrders() {
    const response = await walletApi.getMyDepositOrders();
    return sortNewestFirst(normalizeList(unwrap(response)));
  },

  async getEscrows(projectId) {
    const response = await walletApi.getEscrows(projectId);
    return sortNewestFirst(normalizeList(unwrap(response)));
  },

  async getWithdrawals() {
    const response = await walletApi.getMyWithdrawals();
    return sortNewestFirst(normalizeList(unwrap(response)));
  },

  async createDepositOrder(amount) {
    const response = await walletApi.createDepositOrder(Number(amount));
    return unwrap(response);
  },

  async getDepositOrderById(id) {
    const response = await walletApi.getDepositOrderById(id);
    return unwrap(response);
  },

  async createWithdrawal(form) {
    const response = await walletApi.createWithdrawal({
      amount: Number(form.amount),
      bankName: String(form.bankName || "").trim(),
      bankAccountNumber: String(form.bankAccountNumber || "").trim(),
      bankAccountHolder: String(form.bankAccountHolder || "").trim(),
    });

    return unwrap(response);
  },
};
