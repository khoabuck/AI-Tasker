import axiosInstance from "./axiosInstance";

const projectApi = {
  getMyProjects() {
    return axiosInstance.get("/projects/me");
  },

  getProjectById(projectId) {
    return axiosInstance.get(`/projects/${projectId}`);
  },
};

export default projectApi;