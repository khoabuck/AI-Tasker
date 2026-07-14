import axiosInstance from "./axiosInstance";

const adminApi = {
  getDashboardSummary() {
    return axiosInstance.get("/admin/dashboard/summary");
  },

  getDashboardRevenue() {
    return axiosInstance.get("/admin/dashboard/revenue");
  },

  getDashboardProjects() {
    return axiosInstance.get("/admin/dashboard/projects");
  },

  getDashboardFinance() {
    return axiosInstance.get("/admin/dashboard/finance");
  },

  getPlatformWallet() {
    return axiosInstance.get("/admin/dashboard/platform-wallet");
  },

  getPlatformTransactions(params = {}) {
    return axiosInstance.get("/admin/dashboard/platform-transactions", {
      params,
    });
  },

  getUserWallets(params = {}) {
    return axiosInstance.get("/admin/dashboard/user-wallets", {
      params,
    });
  },

  getDashboardTransactions(params = {}) {
    return axiosInstance.get("/admin/dashboard/transactions", {
      params,
    });
  },

  getDashboardEscrows(params = {}) {
    return axiosInstance.get("/admin/dashboard/escrows", {
      params,
    });
  },
};

export default adminApi;