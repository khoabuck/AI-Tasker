import axiosInstance from "./axiosInstance";

const escrowApi = {
  getMyWalletSummary() {
    return axiosInstance.get("/wallet/me");
  },

  getMyEscrows() {
    return axiosInstance.get("/escrows/me");
  },

  getMyTransactions() {
    return axiosInstance.get("/transactions/me");
  },
};

export default escrowApi;