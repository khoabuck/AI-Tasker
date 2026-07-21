import axiosInstance from "./axiosInstance";

const projectApi = {
  getMyProjects() {
    return axiosInstance.get("/projects/me");
  },

  getProjectById(projectId) {
    return axiosInstance.get(`/projects/${projectId}`);
  },

  getProjectMilestones(projectId) {
    return axiosInstance.get(`/projects/${projectId}/milestones`);
  },

  createMilestone(projectId, data) {
    return axiosInstance.post(`/projects/${projectId}/milestones`, data);
  },

  completeCheck(projectId) {
    return axiosInstance.post(`/projects/${projectId}/complete-check`);
  },

  continueAfterDispute(projectId) {
    return axiosInstance.post(`/projects/${projectId}/continue-after-dispute`);
  },

  endAfterDispute(projectId) {
    return axiosInstance.post(`/projects/${projectId}/end-after-dispute`);
  },
};

export default projectApi;