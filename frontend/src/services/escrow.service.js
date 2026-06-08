import escrowApi from "../api/escrow.api";

const normalizeList = (response) => {
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.data?.items)) return response.data.items;
  if (Array.isArray(response.data?.data)) return response.data.data;
  return [];
};

const escrowService = {
  async getMyWalletSummary() {
    const response = await escrowApi.getMyWalletSummary();
    return response.data;
  },

  async getMyEscrows() {
    const response = await escrowApi.getMyEscrows();
    return normalizeList(response);
  },

  async getMyTransactions() {
    const response = await escrowApi.getMyTransactions();
    return normalizeList(response);
  },
};

export default escrowService;