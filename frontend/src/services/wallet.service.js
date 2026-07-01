import { walletApi } from "../api/wallet.api";

const unwrapData = (res) => res.data?.data ?? res.data;

export const walletService = {
  async getWalletPageData() {
    const [balRes, txRes, doRes] = await Promise.all([
      walletApi.getBalance(),
      walletApi.getTransactions(),
      walletApi.getMyDepositOrders(),
    ]);

    const balRaw = unwrapData(balRes);
    const txRaw = unwrapData(txRes);
    const doRaw = unwrapData(doRes);

    return {
      // API thật: { success: true, balance: 580000 }
      balance: Number(balRaw?.balance ?? 0),

      // API thật: { success: true, data: [...] }
      transactions: Array.isArray(txRaw) ? txRaw : [],

      // Chưa có response thật nên giữ fallback an toàn
      depositOrders: Array.isArray(doRaw)
        ? doRaw
        : doRaw?.items ?? doRaw?.data ?? [],
    };
  },

  createDepositOrder(amount) {
    return walletApi.createDepositOrder(Number(amount));
  },

  getDepositOrderById(id) {
    return walletApi.getDepositOrderById(id);
  },

  createWithdrawal(form) {
    return walletApi.createWithdrawal({
      amount: Number(form.amount),
      bankName: form.bankName,
      bankAccountNumber: form.bankAccountNumber,
      bankAccountHolder: form.bankAccountHolder,
    });
  },
};