// src/api/milestone.api.js
import axiosInstance from "./axiosInstance";

const milestoneApi = {
  /**
   * Get milestone detail.
   * GET /api/milestones/{milestoneId}
   */
  getMilestoneById(milestoneId) {
    return axiosInstance.get(`/milestones/${milestoneId}`);
  },
};

export default milestoneApi;