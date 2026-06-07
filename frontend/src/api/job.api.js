import axiosInstance from "./axiosInstance";

const jobApi = {
  getOpenJobs() {
    return axiosInstance.get("/jobs/open");
  },

  getJobById(jobId) {
    return axiosInstance.get(`/jobs/${jobId}`);
  },
};

export default jobApi;