import disputeApi from "../api/dispute.api";

const disputeService = {
  async getDisputesByProject(projectId) {
    const response = await disputeApi.getDisputesByProject(projectId);

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

  async createDispute(projectId, formData) {
    const payload = {
      projectId: Number(projectId),
      title: formData.title,
      description: formData.description,
      evidenceUrl: formData.evidenceUrl,
      requestedResolution: formData.requestedResolution,
    };

    const response = await disputeApi.createDispute(payload);
    return response.data;
  },
};

export default disputeService;