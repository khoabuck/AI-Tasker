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

  createDeposit({ amount, transactionRef } = {}) {
    return axiosInstance.post("/wallets/deposit", null, {
      params: {
        amount,
        transactionRef,
      },
    });
  },
};

export default expertWalletApi;