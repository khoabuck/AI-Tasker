import axiosInstance from "./axiosInstance";

const expertWalletApi = {
  // GET /api/wallets/me
  getMyWallet() {
    return axiosInstance.get("/wallets/me");
  },

  // GET /api/wallets/balance
  getWalletBalance() {
    return axiosInstance.get("/wallets/balance");
  },

  // GET /api/transactions/me
  getMyTransactions() {
    return axiosInstance.get("/transactions/me");
  },

  // POST /api/wallets/deposit-orders
  createDepositOrder(data) {
    return axiosInstance.post("/wallets/deposit-orders", data);
  },

  // GET /api/wallets/deposit-orders/me
  getMyDepositOrders() {
    return axiosInstance.get("/wallets/deposit-orders/me");
  },

  // GET /api/wallets/deposit-orders/{depositOrderId}
  getDepositOrder(depositOrderId) {
    return axiosInstance.get(`/wallets/deposit-orders/${depositOrderId}`);
  },

  // POST /api/wallets/deposit-orders/{depositOrderId}/simulate-paid
  simulateDepositPaid(depositOrderId) {
    return axiosInstance.post(
      `/wallets/deposit-orders/${depositOrderId}/simulate-paid`
    );
  },
};

export default expertWalletApi;