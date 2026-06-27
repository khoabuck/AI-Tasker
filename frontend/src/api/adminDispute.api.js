import axiosInstance from "./axiosInstance";

const adminDisputeApi = {
  getAllDisputes() {
    return axiosInstance.get("/admin/disputes");
  },

  getDisputeById(disputeId) {
    return axiosInstance.get(`/admin/disputes/${disputeId}`);
  },

  resolveDispute(disputeId, data) {
    return axiosInstance.post(`/admin/disputes/${disputeId}/resolve`, data);
  },
};

export default adminDisputeApi;