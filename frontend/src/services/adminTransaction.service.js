import adminTransactionApi from "../api/adminTransaction.api";

const adminTransactionService = {
  async getAllTransactions() {
    const response = await adminTransactionApi.getAllTransactions();

    if (Array.isArray(response.data)) {
      return response.data;
    }

    if (Array.isArray(response.data?.items)) {
      return response.data.items;
    }

    if (Array.isArray(response.data?.data)) {
      return response.data.data;
    }

    return [];
  },

  async updateTransactionStatus(transactionId, status) {
    const payload = {
      status: status,
    };

    const response = await adminTransactionApi.updateTransactionStatus(
      transactionId,
      payload
    );

    return response.data;
  },
};

export default adminTransactionService;