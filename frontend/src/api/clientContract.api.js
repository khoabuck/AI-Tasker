import axiosInstance from "./axiosInstance";

export const clientContractApi = {
  // GET /api/proposals/{proposalId}/contract
  getContractByProposal: (proposalId) =>
    axiosInstance.get(`/proposals/${proposalId}/contract`),

  // GET /api/contracts/{contractId}/milestone-drafts
  getMilestoneDrafts: (contractId) =>
    axiosInstance.get(`/contracts/${contractId}/milestone-drafts`),
};