import axiosInstance from "./axiosInstance";

const adminWithdrawalApi = {
  getWithdrawals(params = {}) {
    return axiosInstance.get("/withdrawals/admin", { params });
  },

  approveWithdrawal(withdrawalRequestId, data = {}) {
    return axiosInstance.post(
      `/withdrawals/admin/${withdrawalRequestId}/approve`,
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