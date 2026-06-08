import adminJobApi from "../api/adminJob.api";

const adminJobService = {
  async getAllJobs() {
    const response = await adminJobApi.getAllJobs();

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

  async updateJobStatus(jobId, status) {
    const payload = {
      status: status,
    };

    const response = await adminJobApi.updateJobStatus(jobId, payload);
    return response.data;
  },
};

export default adminJobService;