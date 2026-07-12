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
    /*
     * Do not set Content-Type manually here.
     * The browser/Axios must add the multipart boundary automatically.
     */
    return axiosInstance.post(
      `/disputes/${disputeId}/evidences/image`,
      data
    );
  },
};

export default disputeApi;