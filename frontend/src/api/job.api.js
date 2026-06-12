import axiosInstance from "./axiosInstance";

export const saveJobDraftApi = (data) => axiosInstance.post("/jobs/draft", data);

export const submitJobApi = (data) => axiosInstance.post("/jobs/submit", data);

export const getJobsApi = (params = {}) =>
  axiosInstance.get("/jobs/open", { params });

export const getMyJobsApi = () => axiosInstance.get("/jobs/my");

export const getJobByIdApi = (id) => axiosInstance.get(`/jobs/${id}`);

const jobApi = {
  getOpenJobs(params = {}) {
    return axiosInstance.get("/jobs/open", { params });
  },

  getJobById(jobId) {
    return axiosInstance.get(`/jobs/${jobId}`);
  },

  getMyJobs() {
    return axiosInstance.get("/jobs/my");
  },

  getRecommendedJobs(limit = 10) {
    return axiosInstance.get("/recommendations/experts/me/jobs", {
      params: { limit },
    });
  },
};

export default jobApi;