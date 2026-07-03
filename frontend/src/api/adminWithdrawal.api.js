import axiosInstance from "./axiosInstance";

const adminWithdrawalApi = {
  getWithdrawals(params = {}) {
    return axiosInstance.get("/withdrawals/admin", { params });
  },

  getPayosBalance() {
    return axiosInstance.get("/withdrawals/admin/payos/balance");
  },

  approveWithdrawalPayos(withdrawalRequestId, data = {}) {
    return axiosInstance.post(
      `/withdrawals/admin/${withdrawalRequestId}/approve-payos`,
      data
    );
  },

  syncWithdrawalPayos(withdrawalRequestId, data = {}) {
    return axiosInstance.post(
      `/withdrawals/admin/${withdrawalRequestId}/sync-payos`,
      data
    );
  },

  rejectWithdrawal(withdrawalRequestId, data = {}) {
    return axiosInstance.post(
      `/withdrawals/admin/${withdrawalRequestId}/reject`,
      data
    );
  },
};

export default adminWithdrawalApi;
