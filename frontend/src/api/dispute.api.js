import axiosInstance from "./axiosInstance";

const disputeApi = {
  getDisputesByProject(projectId) {
    return axiosInstance.get(`/projects/${projectId}/disputes`);
  },

  createDispute(data) {
    return axiosInstance.post("/disputes", data);
  },
};

export default disputeApi;