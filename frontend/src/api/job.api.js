// src/api/job.api.js
import axiosInstance from "./axiosInstance";

/**
 * CLIENT: Create a draft job.
 * POST /api/jobs/draft
 */
export const saveJobDraftApi = (data) => {
  return axiosInstance.post("/jobs/draft", data);
};

/**
 * CLIENT: Create and submit a new job immediately.
 * POST /api/jobs/submit
 */
export const submitJobApi = (data) => {
  return axiosInstance.post("/jobs/submit", data);
};

/**
 * CLIENT: Submit an existing draft.
 * PUT /api/jobs/{id}/submit
 */
export const submitJobDraftApi = (jobId) => {
  return axiosInstance.put(`/jobs/${jobId}/submit`);
};

/**
 * Public: Get open jobs.
 * GET /api/jobs/open
 *
 * Backend currently supports:
 * - keyword
 * - skillId
 */
export const getJobsApi = (params = {}) => {
  return axiosInstance.get("/jobs/open", { params });
};

/**
 * CLIENT: Get jobs owned by the current client.
 * GET /api/jobs/my
 */
export const getMyJobsApi = () => {
  return axiosInstance.get("/jobs/my");
};

/**
 * Public/Authenticated: Get job detail.
 * GET /api/jobs/{id}
 */
export const getJobByIdApi = (jobId) => {
  return axiosInstance.get(`/jobs/${jobId}`);
};

/**
 * CLIENT: Update a job.
 * PUT /api/jobs/{id}
 */
export const updateJobApi = (jobId, data) => {
  return axiosInstance.put(`/jobs/${jobId}`, data);
};

/**
 * CLIENT: Cancel a job owned by the current client.
 * PUT /api/jobs/{id}/cancel
 *
 * Backend does not require a request body.
 */
export const cancelJobApi = (jobId) => {
  return axiosInstance.put(`/jobs/${jobId}/cancel`);
};

const jobApi = {
  createDraft(data) {
    return saveJobDraftApi(data);
  },

  saveJobDraft(data) {
    return saveJobDraftApi(data);
  },

  submitJob(data) {
    return submitJobApi(data);
  },

  submitDraft(jobId) {
    return submitJobDraftApi(jobId);
  },

  getOpenJobs(params = {}) {
    return getJobsApi(params);
  },

  getJobById(jobId) {
    return getJobByIdApi(jobId);
  },

  getMyJobs() {
    return getMyJobsApi();
  },

  updateJob(jobId, data) {
    return updateJobApi(jobId, data);
  },

  cancelJob(jobId) {
    return cancelJobApi(jobId);
  },

  getRecommendedJobs(limit = 10) {
    return axiosInstance.get("/recommendations/experts/me/jobs", {
      params: { limit },
    });
  },
};

export default jobApi;