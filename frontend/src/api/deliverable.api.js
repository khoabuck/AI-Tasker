import axiosInstance from "./axiosInstance";

const deliverableApi = {
  getDeliverablesByMilestone(milestoneId) {
    return axiosInstance.get(`/milestones/${milestoneId}/deliverables`);
  },

  submitDeliverableToMilestone(milestoneId, data) {
    return axiosInstance.post(`/milestones/${milestoneId}/deliverables`, data);
  },

  submitDeliverable(data) {
    return axiosInstance.post("/deliverables", data);
  },

  getDeliverableById(deliverableId) {
    return axiosInstance.get(`/deliverables/${deliverableId}`);
  },

  approveDeliverable(deliverableId) {
    return axiosInstance.post(`/deliverables/${deliverableId}/approve`);
  },

  requestRevision(deliverableId, data) {
    return axiosInstance.post(
      `/deliverables/${deliverableId}/request-revision`,
      data
    );
  },

  requestRevisionLegacy(deliverableId, data) {
    return axiosInstance.post(`/deliverables/${deliverableId}/revision`, data);
  },
};

export default deliverableApi;