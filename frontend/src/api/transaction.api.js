import axiosInstance from "./axiosInstance";

export const transactionApi = {
  getMyTransactions: (config = {}) =>
    axiosInstance.get("/transactions/me", config),
};