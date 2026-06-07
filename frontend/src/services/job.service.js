import jobApi from "../api/job.api";

const jobService = {
  async getOpenJobs() {
    const response = await jobApi.getOpenJobs();

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
  },

  async getJobById(jobId) {
    const response = await jobApi.getJobById(jobId);
    return response.data;
  },
};

export default jobService;