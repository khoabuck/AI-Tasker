import projectApi from "../api/project.api";

const projectService = {
  async getMyProjects() {
    const response = await projectApi.getMyProjects();

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

  async getProjectById(projectId) {
    const response = await projectApi.getProjectById(projectId);
    return response.data;
  },
};

export default projectService;