import axiosInstance from "./axiosInstance";

const contractApi = {
  // CLIENT/FE1: create contract after proposal accepted
  createContractFromProposal(proposalId, data) {
    return axiosInstance.post(
      `/contracts/from-proposal/${proposalId}`,
      data ?? undefined
    );
  },

  // CLIENT/FE1: create contract draft manually
  createDraftContract(data) {
    return axiosInstance.post("/contracts/draft", data);
  },

  // Alias giữ tương thích code cũ
  createContractDraft(data) {
    return axiosInstance.post("/contracts/draft", data);
  },

  // CLIENT/FE1: update contract draft
  updateDraftContract(contractId, data) {
    return axiosInstance.put(`/contracts/${contractId}/draft`, data);
  },

  // Alias giữ tương thích code cũ
  updateContractDraft(contractId, data) {
    return axiosInstance.put(`/contracts/${contractId}/draft`, data);
  },

  // EXPERT/FE2 + CLIENT/FE1: get milestone drafts
  getContractMilestoneDrafts(contractId) {
    return axiosInstance.get(`/contracts/${contractId}/milestone-drafts`);
  },

  // CLIENT/FE1: replace/update milestone drafts
  updateContractMilestoneDrafts(contractId, data) {
    return axiosInstance.put(`/contracts/${contractId}/milestone-drafts`, data);
  },

  // Alias giữ tương thích code cũ
  replaceContractMilestoneDrafts(contractId, data) {
    return axiosInstance.put(`/contracts/${contractId}/milestone-drafts`, data);
  },

  // EXPERT/FE2 + CLIENT/FE1: get contract by contractId
  getContractById(contractId) {
    return axiosInstance.get(`/contracts/${contractId}`);
  },

  // Alias giữ tương thích code cũ
  getContract(contractId) {
    return axiosInstance.get(`/contracts/${contractId}`);
  },

  // EXPERT/FE2: get contract from accepted proposal
  getContractByProposalId(proposalId) {
    return axiosInstance.get(`/proposals/${proposalId}/contract`);
  },

  // Alias giữ tương thích code cũ
  getContractByProposal(proposalId) {
    return axiosInstance.get(`/proposals/${proposalId}/contract`);
  },

  // EXPERT/FE2: accept contract
  confirmContract(contractId, data) {
    return axiosInstance.post(
      `/contracts/${contractId}/confirm`,
      data ?? undefined
    );
  },

  // EXPERT/FE2: reject/cancel contract
  cancelContract(contractId, data) {
    return axiosInstance.post(
      `/contracts/${contractId}/cancel`,
      data ?? undefined
    );
  },
};

export default contractApi;