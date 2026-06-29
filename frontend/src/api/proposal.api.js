import axiosInstance from "./axiosInstance";

const proposalApi = {
  submitProposal(data) {
    return axiosInstance.post("/proposals/submit", data);
  },

  getMyProposals() {
    return axiosInstance.get("/proposals/me");
  },

  getMyProposalCredits() {
    return axiosInstance.get("/proposals/me/credits");
  },

  getMyDraftProposals() {
    return axiosInstance.get("/proposals/drafts/me");
  },

  createDraftProposal(data) {
    return axiosInstance.post("/proposals/drafts", data);
  },

  updateDraftProposal(proposalId, data) {
    return axiosInstance.put(`/proposals/drafts/${proposalId}`, data);
  },

  deleteDraftProposal(proposalId) {
    return axiosInstance.delete(`/proposals/drafts/${proposalId}`);
  },

  submitDraftProposal(proposalId) {
    return axiosInstance.post(`/proposals/drafts/${proposalId}/submit`);
  },

  getProposalsByJob(jobId) {
    return axiosInstance.get(`/jobs/${jobId}/proposals`);
  },

  getProposalById(proposalId) {
    return axiosInstance.get(`/proposals/${proposalId}`);
  },

  getProposalVersions(proposalId) {
    return axiosInstance.get(`/proposals/${proposalId}/versions`);
  },

  resubmitProposal(proposalId, data) {
    return axiosInstance.post(`/proposals/${proposalId}/resubmit`, data);
  },

  decisionProposal(proposalId, data) {
    return axiosInstance.post(`/proposals/${proposalId}/decision`, data);
  },

  withdrawProposal(proposalId, data = {}) {
    return axiosInstance.patch(`/proposals/${proposalId}/withdraw`, data);
  },
};

export default proposalApi;