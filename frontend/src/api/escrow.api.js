import axiosInstance from "./axiosInstance";

const escrowApi = {
  getProjectEscrows(projectId) {
    return axiosInstance.get(`/escrows/projects/${projectId}`);
  },

  lockProjectEscrow(projectId) {
    return axiosInstance.post(`/escrows/projects/${projectId}/lock`);
  },

  lockMilestoneEscrow(milestoneId) {
    return axiosInstance.post(`/escrows/milestones/${milestoneId}/lock`);
  },

  releaseMilestoneEscrow(milestoneId) {
    return axiosInstance.post(`/escrows/milestones/${milestoneId}/release`);
  },

  refundMilestoneEscrow(milestoneId) {
    return axiosInstance.post(`/escrows/milestones/${milestoneId}/refund`);
  },

  freezeMilestoneEscrow(milestoneId) {
    return axiosInstance.post(`/escrows/milestones/${milestoneId}/freeze`);
  },
};

export default escrowApi;