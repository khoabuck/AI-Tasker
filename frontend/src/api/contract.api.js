import axiosInstance from "./axiosInstance";

const contractApi = {
  // CLIENT/FE1 thường dùng: tạo contract từ proposal đã accepted
  createContractFromProposal(proposalId) {
    return axiosInstance.post(`/contracts/from-proposal/${proposalId}`);
  },

  // CLIENT/FE1 thường dùng: tạo contract draft thủ công
  createDraftContract(data) {
    return axiosInstance.post("/contracts/draft", data);
  },

  // FE2 dùng: xem contract detail
  getContractById(contractId) {
    return axiosInstance.get(`/contracts/${contractId}`);
  },

  // FE2 dùng: lấy contract từ proposal accepted
  getContractByProposalId(proposalId) {
    return axiosInstance.get(`/proposals/${proposalId}/contract`);
  },

  // FE2 dùng: expert confirm contract
  confirmContract(contractId) {
    return axiosInstance.post(`/contracts/${contractId}/confirm`);
  },
};

export default contractApi;