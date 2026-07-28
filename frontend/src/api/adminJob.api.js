import axiosInstance from "./axiosInstance";

const adminJobApi = {
  getAllJobs(params = {}) {
    return axiosInstance.get("/admin/jobs", { params });
  },

  getJobById(jobId) {
    return axiosInstance.get(`/admin/jobs/${jobId}`);
  },

  getJobProposals(jobId) {
    return axiosInstance.get(`/admin/jobs/${jobId}/proposals`);
  },

  cancelJob(jobId, data = {}) {
    return axiosInstance.patch(`/admin/jobs/${jobId}/cancel`, data);
  },
};

export default adminJobApi; 