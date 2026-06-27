import axiosInstance from "./axiosInstance";

const proposalApi = {
  submitProposal(data) {
    return axiosInstance.post("/proposals/submit", data);
  },

  getMyProposals() {
    return axiosInstance.get("/proposals/me");
  },

  getJobProposals(jobId) {
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

  decideProposal(proposalId, decision) {
    return axiosInstance.post(`/proposals/${proposalId}/decision`, null, {
      params: { decision },
    });
  },

  withdrawProposal(proposalId) {
    return axiosInstance.patch(`/proposals/${proposalId}/withdraw`);
  },
};

export default proposalApi;