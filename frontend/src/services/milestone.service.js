import milestoneApi from "../api/milestone.api";

const milestoneService = {
  async getMilestonesByProject(projectId) {
    const response = await milestoneApi.getMilestonesByProject(projectId);

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
};

export default milestoneService;