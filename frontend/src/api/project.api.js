import axiosInstance from "./axiosInstance";

const projectApi = {
  createProjectFromContract(contractId) {
    return axiosInstance.post(`/projects/from-contract/${contractId}`);
  },

  initializeProject(contractId) {
    return axiosInstance.post(`/projects/initialize/${contractId}`);
  },

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
};

export default projectApi;