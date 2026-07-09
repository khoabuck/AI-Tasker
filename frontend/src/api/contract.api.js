import axiosInstance from "./axiosInstance";

const contractApi = {
  createContractFromProposal(proposalId, data) {
    return axiosInstance.post(
      `/contracts/from-proposal/${proposalId}`,
      data ?? undefined
    );
  },

  createDraftContract(data) {
    return axiosInstance.post("/contracts/draft", data);
  },

  createContractDraft(data) {
    return axiosInstance.post("/contracts/draft", data);
  },

  updateDraftContract(contractId, data) {
    return axiosInstance.put(`/contracts/${contractId}/draft`, data);
  },

  updateContractDraft(contractId, data) {
    return axiosInstance.put(`/contracts/${contractId}/draft`, data);
  },

  getContractById(contractId) {
    return axiosInstance.get(`/contracts/${contractId}`);
  },

  getContract(contractId) {
    return axiosInstance.get(`/contracts/${contractId}`);
  },

  getContractByProposalId(proposalId) {
    return axiosInstance.get(`/proposals/${proposalId}/contract`);
  },

  getContractByProposal(proposalId) {
    return axiosInstance.get(`/proposals/${proposalId}/contract`);
  },

  getContractMilestoneDrafts(contractId) {
    return axiosInstance.get(`/contracts/${contractId}/milestone-drafts`);
  },

  updateContractMilestoneDrafts(contractId, data) {
    return axiosInstance.put(`/contracts/${contractId}/milestone-drafts`, data);
  },

  replaceContractMilestoneDrafts(contractId, data) {
    return axiosInstance.put(`/contracts/${contractId}/milestone-drafts`, data);
  },

  confirmContract(contractId, data) {
    return axiosInstance.post(
      `/contracts/${contractId}/confirm`,
      data ?? undefined
    );
  },

  cancelContract(contractId, data) {
    return axiosInstance.post(
      `/contracts/${contractId}/cancel`,
      data ?? undefined
    );
  },
};

export default contractApi;