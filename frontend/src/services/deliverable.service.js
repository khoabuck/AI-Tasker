import deliverableApi from "../api/deliverable.api";

const deliverableService = {
  async getDeliverablesByProject(projectId) {
    const response = await deliverableApi.getDeliverablesByProject(projectId);

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

  async submitDeliverable(projectId, formData) {
    const payload = {
      projectId: Number(projectId),
      milestoneId: formData.milestoneId ? Number(formData.milestoneId) : null,
      title: formData.title,
      description: formData.description,
      fileUrl: formData.fileUrl,
      note: formData.note,
    };

    const response = await deliverableApi.submitDeliverable(payload);
    return response.data;
  },

  async deleteDeliverable(deliverableId) {
    const response = await deliverableApi.deleteDeliverable(deliverableId);
    return response.data;
  },
};

export default deliverableService;