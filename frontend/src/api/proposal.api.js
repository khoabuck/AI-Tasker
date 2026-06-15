import axiosInstance from "./axiosInstance";

const proposalApi = {
  // EXPERT: submit proposal
  submitProposal(data) {
    return axiosInstance.post("/proposals/submit", data);
  },

  // EXPERT: get my proposals
  getMyProposals() {
    return axiosInstance.get("/proposals/me");
  },

  // EXPERT + CLIENT: get proposal detail
  getProposalById(proposalId) {
    return axiosInstance.get(`/proposals/${proposalId}`);
  },

  // EXPERT: withdraw proposal
  withdrawProposal(proposalId) {
    return axiosInstance.patch(`/proposals/${proposalId}/withdraw`);
  },

  // CLIENT/FE1: get proposals of one job
  getJobProposals(jobId) {
    return axiosInstance.get(`/jobs/${jobId}/proposals`);
  },

  // CLIENT/FE1: send counter offer
  counterProposal(proposalId, data) {
    return axiosInstance.post(`/proposals/${proposalId}/counter`, data);
  },

  // CLIENT/FE1: accept/reject proposal
  decideProposal(proposalId, decision) {
    return axiosInstance.post(`/proposals/${proposalId}/decision`, null, {
      params: { decision },
    });
  },
};

export default proposalApi;