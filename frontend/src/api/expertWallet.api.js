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

  createWithdrawal(data) {
    return axiosInstance.post("/withdrawals", data);
  },

  getMyWithdrawals() {
    return axiosInstance.get("/withdrawals/me");
  },

  createDeposit(data) {
    return axiosInstance.post("/wallets/deposit", data);
  },
};

export default expertWalletApi;