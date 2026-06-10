import axiosInstance from "./axiosInstance";

const adminDisputeApi = {
  getAllDisputes() {
    return axiosInstance.get("/admin/disputes");
  },

  resolveDispute(disputeId, data) {
    return axiosInstance.patch(`/admin/disputes/${disputeId}/resolve`, data);
  },
};

export default adminDisputeApi;