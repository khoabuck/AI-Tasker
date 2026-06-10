import axiosInstance from "./axiosInstance";

const expertWalletApi = {
  getWalletSummary() {
    return axiosInstance.get("/expert/wallet/summary");
  },

  getWalletTransactions() {
    return axiosInstance.get("/expert/wallet/transactions");
  },

  getEscrowRecords() {
    return axiosInstance.get("/expert/wallet/escrows");
  },

  requestWithdraw(data) {
    return axiosInstance.post("/expert/wallet/withdraw", data);
  },
};

export default expertWalletApi;