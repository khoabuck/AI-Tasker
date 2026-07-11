import axiosInstance from "./axiosInstance";

const multipartConfig = {
  headers: {
    "Content-Type": "multipart/form-data",
  },
};

const disputeApi = {
  createDispute(data) {
    return axiosInstance.post("/disputes", data, multipartConfig);
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

  addDisputeImageEvidence(disputeId, data) {
    return axiosInstance.post(
      `/disputes/${disputeId}/evidences/images`,
      data,
      multipartConfig
    );
  },
};

export default disputeApi;