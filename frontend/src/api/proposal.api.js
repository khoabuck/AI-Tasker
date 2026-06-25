import axiosInstance from "./axiosInstance";

const proposalApi = {
  submitProposal(data) {
    return axiosInstance.post("/proposals/submit", data);
  },

  getMyProposals(params = {}) {
    return axiosInstance.get("/proposals/me", { params });
  },

  getJobProposals(jobId, params = {}) {
    return axiosInstance.get(`/jobs/${jobId}/proposals`, { params });
  },

  getProposal(proposalId) {
    return axiosInstance.get(`/proposals/${proposalId}`);
  },

  getProposalVersions(proposalId) {
    return axiosInstance.get(`/proposals/${proposalId}/versions`);
  },

  resubmitProposal(proposalId, data) {
    return axiosInstance.post(`/proposals/${proposalId}/resubmit`, data);
  },

  decideProposal(proposalId, data) {
    return axiosInstance.post(`/proposals/${proposalId}/decision`, data);
  },

  withdrawProposal(proposalId) {
    return axiosInstance.patch(`/proposals/${proposalId}/withdraw`);
  },
};

export default proposalApi;