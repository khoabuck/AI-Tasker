import axiosInstance from "./axiosInstance";

const adminWithdrawalApi = {
  getAllWithdrawals(status = "") {
    const params = {};

    if (status && status !== "ALL") {
      params.status = status;
    }

    return axiosInstance.get("/withdrawals/admin", { params });
  },

  approveWithdrawal(withdrawalRequestId, data) {
    return axiosInstance.post(
      `/withdrawals/admin/${withdrawalRequestId}/approve`,
      data
    );
  },

  rejectWithdrawal(withdrawalRequestId, data) {
    return axiosInstance.post(
      `/withdrawals/admin/${withdrawalRequestId}/reject`,
      data
    );
  },
};

export default adminWithdrawalApi;