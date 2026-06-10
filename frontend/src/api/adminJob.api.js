import axiosInstance from "./axiosInstance";

const adminJobApi = {
  getAllJobs() {
    return axiosInstance.get("/admin/jobs");
  },

  updateJobStatus(jobId, data) {
    return axiosInstance.patch(`/admin/jobs/${jobId}/status`, data);
  },
};

export default adminJobApi;