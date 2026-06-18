import axiosInstance from "./axiosInstance";

const expertWalletApi = {
  getMyWallet() {
    return axiosInstance.get("/wallets/me");
  },

  getWalletBalance() {
    return axiosInstance.get("/wallets/balance");
  },

  getMyTransactions() {
    return axiosInstance.get("/transactions/me");
  },

  getMyWithdrawals() {
    return axiosInstance.get("/withdrawals/me");
  },

  createWithdrawal(data) {
    return axiosInstance.post("/withdrawals", data);
  },

  createDepositOrder(data) {
    return axiosInstance.post("/wallets/deposit-orders", data);
  },

  getMyDepositOrders() {
    return axiosInstance.get("/wallets/deposit-orders/me");
  },

  getDepositOrder(depositOrderId) {
    return axiosInstance.get(`/wallets/deposit-orders/${depositOrderId}`);
  },

  simulateDepositPaid(depositOrderId) {
    return axiosInstance.post(
      `/wallets/deposit-orders/${depositOrderId}/simulate-paid`
    );
  },
};

export default expertWalletApi;