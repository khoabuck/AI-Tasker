import expertWalletApi from "../api/expertWallet.api";

const normalizeList = (response) => {
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.data?.items)) return response.data.items;
  if (Array.isArray(response.data?.data)) return response.data.data;
  return [];
};

const expertWalletService = {
  async getWalletSummary() {
    const response = await expertWalletApi.getWalletSummary();
    return response.data;
  },

  async getWalletTransactions() {
    const response = await expertWalletApi.getWalletTransactions();
    return normalizeList(response);
  },

  async getEscrowRecords() {
    const response = await expertWalletApi.getEscrowRecords();
    return normalizeList(response);
  },

  async requestWithdraw(formData) {
    const payload = {
      amount: Number(formData.amount),
      bankName: formData.bankName,
      bankAccountNumber: formData.bankAccountNumber,
      bankAccountName: formData.bankAccountName,
      note: formData.note,
    };

    const response = await expertWalletApi.requestWithdraw(payload);
    return response.data;
  },
};

export default expertWalletService;