import { transactionApi } from "../api/transaction.api";
import { compareDateDesc } from "../utils/dateTime.utils";

const unwrap = (response) => response?.data?.data ?? response?.data;

const normalizeList = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.result)) return raw.result;
  if (Array.isArray(raw?.transactions)) return raw.transactions;
  return [];
};

const getTransactionId = (transaction) => {
  return (
    transaction?.transactionId ||
    transaction?.TransactionId ||
    transaction?.walletTransactionId ||
    transaction?.WalletTransactionId ||
    transaction?.id ||
    transaction?.Id ||
    ""
  );
};

export const transactionService = {
  async getMyTransactions(config = {}) {
    const response = await transactionApi.getMyTransactions(config);
    const list = normalizeList(unwrap(response));

    return [...list].sort((a, b) =>
      compareDateDesc(
        a?.updatedAt ||
          a?.processedAt ||
          a?.paidAt ||
          a?.createdAt,

        b?.updatedAt ||
          b?.processedAt ||
          b?.paidAt ||
          b?.createdAt
      )
    );
  },

  async getTransactionById(id, signal) {
    if (
      id === undefined ||
      id === null ||
      id === ""
    ) {
      throw new Error("Transaction id is required.");
    }

    const list = await this.getMyTransactions({
      signal,
    });

    return (
      list.find(
        (transaction) =>
          String(getTransactionId(transaction)) ===
          String(id)
      ) || null
    );
  },

  async getProjectMilestones(projectId, signal) {
    if (
      projectId === undefined ||
      projectId === null ||
      projectId === ""
    ) {
      throw new Error("Project id is required.");
    }

    const response =
      await transactionApi.getProjectMilestones(
        projectId,
        {
          signal,
        }
      );

    const raw = unwrap(response);

    return normalizeList(raw);
  },
};