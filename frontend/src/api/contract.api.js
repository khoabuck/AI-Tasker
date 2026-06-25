import axiosInstance from "./axiosInstance";

const contractApi = {
  createContractFromProposal(proposalId, data = {}) {
    return axiosInstance.post(`/contracts/from-proposal/${proposalId}`, data);
  },

  createContractDraft(data) {
    return axiosInstance.post("/contracts/draft", data);
  },

  updateContractDraft(contractId, data) {
    return axiosInstance.put(`/contracts/${contractId}/draft`, data);
  },

  getContractMilestoneDrafts(contractId) {
    return axiosInstance.get(`/contracts/${contractId}/milestone-drafts`);
  },

  replaceContractMilestoneDrafts(contractId, data) {
    return axiosInstance.put(`/contracts/${contractId}/milestone-drafts`, data);
  },

  getContract(contractId) {
    return axiosInstance.get(`/contracts/${contractId}`);
  },

  getContractByProposal(proposalId) {
    return axiosInstance.get(`/proposals/${proposalId}/contract`);
  },

  confirmContract(contractId, data = {}) {
    return axiosInstance.post(`/contracts/${contractId}/confirm`, data);
  },

  cancelContract(contractId, data = {}) {
    return axiosInstance.post(`/contracts/${contractId}/cancel`, data);
  },
};

export default contractApi;