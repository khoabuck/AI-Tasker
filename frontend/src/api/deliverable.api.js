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

  submitRevision(deliverableId, data) {
    return axiosInstance.post(`/deliverables/${deliverableId}/revision`, data);
  },

  // CLIENT/FE1 dùng
  approveDeliverable(deliverableId) {
    return axiosInstance.post(`/deliverables/${deliverableId}/approve`);
  },

  // CLIENT/FE1 dùng
  requestRevision(deliverableId, data) {
    return axiosInstance.post(
      `/deliverables/${deliverableId}/request-revision`,
      data
    );
  },
};

export default deliverableApi;