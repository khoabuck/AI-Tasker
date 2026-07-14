import axiosInstance from "./axiosInstance";

const expertWalletApi = {
  getMyWallet() {
    return axiosInstance.get("/wallets/me");
  },

  getBalance() {
    return axiosInstance.get("/wallets/balance");
  },

  getMyTransactions() {
    return axiosInstance.get("/transactions/me");
  },

  createDepositOrder(data) {
    return axiosInstance.post("/wallets/deposit-orders", data);
  },

  getMyDepositOrders() {
    return axiosInstance.get("/wallets/deposit-orders/me");
  },

  getDepositOrderById(depositOrderId) {
    return axiosInstance.get(`/wallets/deposit-orders/${depositOrderId}`);
  },

  createWithdrawal(data) {
    return axiosInstance.post("/withdrawals", data);
  },

  getMyWithdrawals() {
    return axiosInstance.get("/withdrawals/me");
  },
};

export default expertWalletApi;
