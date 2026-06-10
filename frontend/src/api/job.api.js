import axiosInstance from "./axiosInstance";

const jobApi = {
  getOpenJobs() {
    return axiosInstance.get("/jobs/open");
  },

   getRecommendedJobs() {
    return axiosInstance.get("/jobs/recommended");
  },

  getJobById(jobId) {
    return axiosInstance.get(`/jobs/${jobId}`);
  },
};

export default jobApi;