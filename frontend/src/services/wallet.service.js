import { walletApi } from "../api/wallet.api";

const unwrap = (res) => res.data?.data ?? res.data;

export const walletService = {
  async getWallet() {
    const res = await walletApi.getWallet();
    const data = unwrap(res);

    // Lưu ý: object này phụ thuộc walletApi.getWallet() trả về đúng shape có
    // availableBalance/lockedBalance (tức phải gọi /wallets/me, không phải
    // /wallets/balance — endpoint đó chỉ có field `balance` đơn lẻ).
    return {
      availableBalance: Number(data?.availableBalance ?? 0),
      lockedBalance: Number(data?.lockedBalance ?? 0),
    };
  },

  async getTransactions() {
    const res = await walletApi.getTransactions();
    const data = unwrap(res);
    return Array.isArray(data) ? data : [];
  },

  async getDepositOrders() {
    const res = await walletApi.getMyDepositOrders();
    const data = unwrap(res);
    return Array.isArray(data) ? data : [];
  },

  async getEscrows(projectId) {
    const res = await walletApi.getEscrows(projectId);
    const data = unwrap(res);
    return Array.isArray(data) ? data : [];
  },

  // Lịch sử yêu cầu rút tiền — GET /api/withdrawals/me
  // Response thật (đã test qua Swagger):
  // { success: true, data: [ { withdrawalRequestId, userId, amount, feeAmount,
  //   netAmount, bankCode, bankBin, bankName, bankAccountNumber,
  //   bankAccountHolder, bankVerificationStatus, bankVerificationMessage,
  //   payoutReferenceCode, status, adminNote, failureReason, createdAt,
  //   processedAt, processedByAdminId, ... } ] }
  async getWithdrawals() {
    const res = await walletApi.getMyWithdrawals();
    const data = unwrap(res);
    return Array.isArray(data) ? data : [];
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