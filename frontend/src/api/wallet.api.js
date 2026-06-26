import axiosInstance from "./axiosInstance";

export const walletApi = {
  getBalance: () => axiosInstance.get("/wallets/balance"),

  getTransactions: () => axiosInstance.get("/transactions/me"),

  getMyProjects: () => axiosInstance.get("/projects/me"),

  getProjectEscrows: (projectId) =>
    axiosInstance.get(`/escrows/projects/${projectId}`),

  createDepositOrder: (amount) =>
    axiosInstance.post("/wallets/deposit-orders", { amount }),

  getMyDepositOrders: () =>
    axiosInstance.get("/wallets/deposit-orders/me"),

  getDepositOrderById: (depositOrderId) =>
    axiosInstance.get(`/wallets/deposit-orders/${depositOrderId}`),

  createWithdrawal: (payload) =>
    axiosInstance.post("/withdrawals", payload),
};