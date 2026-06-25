import axiosInstance from "./axiosInstance";

const disputeApi = {
  createDispute(data) {
    return axiosInstance.post("/disputes", data);
  },

  getMyDisputes() {
    return axiosInstance.get("/disputes/me");
  },

  getDisputeById(disputeId) {
    return axiosInstance.get(`/disputes/${disputeId}`);
  },

  addDisputeEvidence(disputeId, data) {
    return axiosInstance.post(`/disputes/${disputeId}/evidences`, data);
  },
};

export default disputeApi;