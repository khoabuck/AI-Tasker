import axiosInstance from "./axiosInstance";

const adminTransactionApi = {
  getAllTransactions() {
    return axiosInstance.get("/admin/transactions");
  },

  updateTransactionStatus(transactionId, data) {
    return axiosInstance.patch(
      `/admin/transactions/${transactionId}/status`,
      data
    );
  },
};

export default adminTransactionApi;