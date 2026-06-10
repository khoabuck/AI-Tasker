import axiosInstance from "./axiosInstance";

const proposalApi = {
  submitProposal(data) {
    return axiosInstance.post("/proposals", data);
  },

  getMyProposals() {
    return axiosInstance.get("/proposals/me");
  },

  withdrawProposal(proposalId) {
    return axiosInstance.patch(`/proposals/${proposalId}/withdraw`);
  },
};

export default proposalApi;