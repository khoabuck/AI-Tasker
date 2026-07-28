import axiosInstance from "./axiosInstance";

const disputeApi = {
  createDispute(data) {
    // Do not set Content-Type manually.
    // axiosInstance removes JSON Content-Type for FormData and lets the browser
    // attach the multipart boundary required by ASP.NET Core.
    return axiosInstance.post("/disputes", data);
  },

  getMyDisputes() {
    return axiosInstance.get("/disputes/me");
  },

  getDisputeById(disputeId) {
    return axiosInstance.get(`/disputes/${disputeId}`);
  },

  addDisputeEvidence(disputeId, data) {
    // Backend endpoint consumes JSON CreateDisputeEvidenceRequest.
    return axiosInstance.post(`/disputes/${disputeId}/evidences`, data);
  },

  addDisputeImageEvidence(disputeId, data) {
    // Backend endpoint consumes multipart/form-data:
    // EvidenceText + repeated Images fields.
    return axiosInstance.post(
      `/disputes/${disputeId}/evidences/images`,
      data
    );
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
