import { transactionApi } from "../api/transaction.api";

const unwrap = (res) => res.data?.data || res.data;

const normalizeList = (raw) => {
  return Array.isArray(raw)
    ? raw
    : raw?.items ?? raw?.data ?? [];
};

export const transactionService = {
  async getMyTransactions(config = {}) {
    const res = await transactionApi.getMyTransactions(config);
    const raw = unwrap(res);

    return normalizeList(raw);
  },

  async getTransactionById(id, signal) {
    const list = await this.getMyTransactions({ signal });

    return list.find(
      (tx) => String(tx.transactionId) === String(id)
    );
  },
};