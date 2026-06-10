import axiosInstance from "./axiosInstance";

const deliverableApi = {
  getDeliverablesByProject(projectId) {
    return axiosInstance.get(`/projects/${projectId}/deliverables`);
  },

  submitDeliverable(data) {
    return axiosInstance.post("/deliverables", data);
  },

  deleteDeliverable(deliverableId) {
    return axiosInstance.delete(`/deliverables/${deliverableId}`);
  },
};

export default deliverableApi;