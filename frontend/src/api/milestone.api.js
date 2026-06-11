import axiosInstance from "./axiosInstance";

const milestoneApi = {
  getMilestonesByProject(projectId) {
    return axiosInstance.get(`/projects/${projectId}/milestones`);
  },
};

export default milestoneApi;