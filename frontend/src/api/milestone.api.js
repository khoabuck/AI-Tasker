import axiosInstance from "./axiosInstance";

const milestoneApi = {
  getMilestoneById(milestoneId) {
    return axiosInstance.get(`/milestones/${milestoneId}`);
  },

  updateMilestone(milestoneId, data) {
    return axiosInstance.patch(`/milestones/${milestoneId}`, data);
  },
};

export default milestoneApi;