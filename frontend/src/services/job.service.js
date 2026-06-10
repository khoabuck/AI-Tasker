import { createJobApi, getJobsApi } from "../api/job.api";

const normalizeList = (response) => {
  if (Array.isArray(response.data)) {
    return response.data;
  }

  if (Array.isArray(response.data?.items)) {
    return response.data.items;
  }

  if (Array.isArray(response.data?.data)) {
    return response.data.data;
  }

  return [];
};

const jobService = {
  async getOpenJobs() {
    const response = await jobApi.getOpenJobs();
    return normalizeList(response);
  },

  async getRecommendedJobs() {
    const response = await jobApi.getRecommendedJobs();
    return normalizeList(response);
  },

  async getJobById(jobId) {
    const response = await jobApi.getJobById(jobId);
    return response.data;
  },
};

export default jobService;