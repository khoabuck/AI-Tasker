import axiosInstance from "./axiosInstance";

const contractApi = {
  /**
   * CLIENT only.
   * POST /api/contracts/from-proposal/{proposalId}
   */
  createContractFromProposal(proposalId) {
    return axiosInstance.post(`/contracts/from-proposal/${proposalId}`);
  },

  /**
   * CLIENT, EXPERT, ADMIN.
   * GET /api/contracts/{contractId}
   */
  getContractById(contractId) {
    return axiosInstance.get(`/contracts/${contractId}`);
  },

  /**
   * Authenticated contract participant.
   * GET /api/proposals/{proposalId}/contract
   */
  getContractByProposalId(proposalId) {
    return axiosInstance.get(`/proposals/${proposalId}/contract`);
  },

  /**
   * CLIENT, EXPERT, ADMIN.
   * GET /api/contracts/{contractId}/milestone-drafts
   */
  getContractMilestoneDrafts(contractId) {
    return axiosInstance.get(`/contracts/${contractId}/milestone-drafts`);
  },

  /**
   * CLIENT or EXPERT.
   * POST /api/contracts/{contractId}/confirm
   */
  confirmContract(contractId) {
    return axiosInstance.post(`/contracts/${contractId}/confirm`);
  },

  /**
   * CLIENT or EXPERT.
   * POST /api/contracts/{contractId}/cancel
   */
  cancelContract(contractId, data) {
    return axiosInstance.post(`/contracts/${contractId}/cancel`, data);
  },
};

export default contractApi;
