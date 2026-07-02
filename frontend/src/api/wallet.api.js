import axiosInstance from "./axiosInstance";

export const walletApi = {
  // FIX: /wallets/balance chỉ trả về { success, balance } — KHÔNG có
  // availableBalance / lockedBalance, khiến walletService.getWallet() luôn
  // fallback về 0 cho cả 2 field (ví hiển thị 0₫ dù có tiền thật).
  // /wallets/me trả về đầy đủ: availableBalance, lockedBalance, totalEarning...
  getWallet: () => axiosInstance.get("/wallets/me"),

  getTransactions: () => axiosInstance.get("/transactions/me"),

  getMyProjects: () => axiosInstance.get("/projects/me"),

  getEscrows: (projectId) =>
    axiosInstance.get(`/escrows/projects/${projectId}`),

  createDepositOrder: (amount) =>
    axiosInstance.post("/wallets/deposit-orders", { amount }),

  getMyDepositOrders: () =>
    axiosInstance.get("/wallets/deposit-orders/me"),

  getDepositOrderById: (id) =>
    axiosInstance.get(`/wallets/deposit-orders/${id}`),

  createWithdrawal: (payload) =>
    axiosInstance.post("/withdrawals", payload),

  getMyWithdrawals: () =>
    axiosInstance.get("/withdrawals/me"),
};