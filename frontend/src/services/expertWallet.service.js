import expertWalletApi from "../api/expertWallet.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isNaN(number) ? fallback : number;
};

const isInvalidId = (value) => {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "undefined" ||
    value === "null"
  );
};

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.wallet) return data.data.wallet;
  if (data?.data?.depositOrder) return data.data.depositOrder;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data) return data.data;

  if (data?.wallet) return data.wallet;
  if (data?.depositOrder) return data.depositOrder;
  if (data?.item) return data.item;
  if (data?.result) return data.result;

  return data;
};

const unwrapBalanceData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data.balance !== undefined && data.balance !== null) return data.balance;

  if (data.data?.balance !== undefined && data.data?.balance !== null) {
    return data.data.balance;
  }

  return unwrapData(response);
};

const unwrapListData = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.transactions)) return data.transactions;
  if (Array.isArray(data?.depositOrders)) return data.depositOrders;

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.transactions)) return data.data.transactions;
  if (Array.isArray(data?.data?.depositOrders)) return data.data.depositOrders;

  return [];
};

export const normalizeWallet = (wallet) => {
  if (!wallet) return null;

  const raw = wallet.raw || wallet.Raw || wallet;

  const availableBalance = toNumber(
    getValue(
      wallet.availableBalance,
      wallet.AvailableBalance,
      wallet.balance,
      wallet.Balance,
      raw.availableBalance,
      raw.AvailableBalance,
      raw.balance,
      raw.Balance,
      0
    ),
    0
  );

  const lockedBalance = toNumber(
    getValue(
      wallet.lockedBalance,
      wallet.LockedBalance,
      raw.lockedBalance,
      raw.LockedBalance,
      0
    ),
    0
  );

  const totalEarning = toNumber(
    getValue(
      wallet.totalEarning,
      wallet.TotalEarning,
      wallet.totalEarnings,
      wallet.TotalEarnings,
      raw.totalEarning,
      raw.TotalEarning,
      raw.totalEarnings,
      raw.TotalEarnings,
      availableBalance + lockedBalance
    ),
    availableBalance + lockedBalance
  );

  const walletId = getValue(
    wallet.walletId,
    wallet.WalletId,
    wallet.id,
    wallet.Id,
    raw.walletId,
    raw.WalletId,
    raw.id,
    raw.Id,
    ""
  );

  return {
    walletId,
    id: walletId,

    userId: getValue(wallet.userId, wallet.UserId, raw.userId, raw.UserId, ""),

    availableBalance,
    balance: availableBalance,
    lockedBalance,
    totalEarning,
    totalBalance: availableBalance + lockedBalance,

    currency: "VND",

    updatedAt: getValue(
      wallet.updatedAt,
      wallet.UpdatedAt,
      raw.updatedAt,
      raw.UpdatedAt,
      ""
    ),

    raw: wallet,
  };
};

export const normalizeBalance = (balanceData) => {
  if (balanceData === undefined || balanceData === null) {
    return {
      availableBalance: 0,
      lockedBalance: 0,
      totalEarning: 0,
      totalBalance: 0,
      currency: "VND",
    };
  }

  if (typeof balanceData === "number") {
    return {
      availableBalance: balanceData,
      lockedBalance: 0,
      totalEarning: balanceData,
      totalBalance: balanceData,
      currency: "VND",
    };
  }

  const raw = balanceData.raw || balanceData.Raw || balanceData;

  const availableBalance = toNumber(
    getValue(
      balanceData.balance,
      balanceData.Balance,
      balanceData.availableBalance,
      balanceData.AvailableBalance,
      raw.balance,
      raw.Balance,
      raw.availableBalance,
      raw.AvailableBalance,
      0
    ),
    0
  );

  const lockedBalance = toNumber(
    getValue(
      balanceData.lockedBalance,
      balanceData.LockedBalance,
      raw.lockedBalance,
      raw.LockedBalance,
      0
    ),
    0
  );

  const totalEarning = toNumber(
    getValue(
      balanceData.totalEarning,
      balanceData.TotalEarning,
      raw.totalEarning,
      raw.TotalEarning,
      availableBalance + lockedBalance
    ),
    availableBalance + lockedBalance
  );

  return {
    availableBalance,
    balance: availableBalance,
    lockedBalance,
    totalEarning,
    totalBalance: availableBalance + lockedBalance,
    currency: "VND",
    raw: balanceData,
  };
};

export const normalizeTransaction = (transaction) => {
  if (!transaction) return null;

  const raw = transaction.raw || transaction.Raw || transaction;

  const amount = toNumber(
    getValue(transaction.amount, transaction.Amount, raw.amount, raw.Amount, 0),
    0
  );

  const type = String(
    getValue(
      transaction.type,
      transaction.Type,
      raw.type,
      raw.Type,
      "TRANSACTION"
    )
  ).toUpperCase();

  const status = String(
    getValue(
      transaction.status,
      transaction.Status,
      raw.status,
      raw.Status,
      "SUCCESS"
    )
  ).toUpperCase();

  const transactionId = getValue(
    transaction.transactionId,
    transaction.TransactionId,
    transaction.walletTransactionId,
    transaction.WalletTransactionId,
    transaction.id,
    transaction.Id,
    raw.transactionId,
    raw.TransactionId,
    raw.walletTransactionId,
    raw.WalletTransactionId,
    raw.id,
    raw.Id,
    ""
  );

  return {
    transactionId,
    id: transactionId,

    escrowId: getValue(
      transaction.escrowId,
      transaction.EscrowId,
      raw.escrowId,
      raw.EscrowId,
      ""
    ),

    projectId: getValue(
      transaction.projectId,
      transaction.ProjectId,
      raw.projectId,
      raw.ProjectId,
      ""
    ),

    milestoneId: getValue(
      transaction.milestoneId,
      transaction.MilestoneId,
      transaction.projectMilestoneId,
      transaction.ProjectMilestoneId,
      raw.milestoneId,
      raw.MilestoneId,
      raw.projectMilestoneId,
      raw.ProjectMilestoneId,
      ""
    ),

    userId: getValue(
      transaction.userId,
      transaction.UserId,
      raw.userId,
      raw.UserId,
      ""
    ),

    type,
    status,

    amount: Math.abs(amount),
    signedAmount: amount,
    direction: getTransactionDirection(type, amount),

    description: getValue(
      transaction.description,
      transaction.Description,
      raw.description,
      raw.Description,
      ""
    ),

    referenceId: getValue(
      transaction.referenceId,
      transaction.ReferenceId,
      raw.referenceId,
      raw.ReferenceId,
      ""
    ),

    currency: "VND",

    createdAt: getValue(
      transaction.createdAt,
      transaction.CreatedAt,
      raw.createdAt,
      raw.CreatedAt,
      ""
    ),

    raw: transaction,
  };
};

export const normalizeDepositOrder = (order) => {
  if (!order) return null;

  const raw = order.raw || order.Raw || order;

  const depositOrderId = getValue(
    order.depositOrderId,
    order.DepositOrderId,
    order.depositOrderID,
    order.DepositOrderID,
    order.id,
    order.Id,
    raw.depositOrderId,
    raw.DepositOrderId,
    raw.id,
    raw.Id,
    ""
  );

  const amount = toNumber(
    getValue(order.amount, order.Amount, raw.amount, raw.Amount, 0),
    0
  );

  const status = String(
    getValue(order.status, order.Status, raw.status, raw.Status, "PENDING")
  ).toUpperCase();

  const paymentUrl = getValue(
    order.paymentUrl,
    order.PaymentUrl,
    order.checkoutUrl,
    order.CheckoutUrl,
    order.payUrl,
    order.PayUrl,
    order.paymentLink,
    order.PaymentLink,
    raw.paymentUrl,
    raw.PaymentUrl,
    raw.checkoutUrl,
    raw.CheckoutUrl,
    raw.payUrl,
    raw.PayUrl,
    raw.paymentLink,
    raw.PaymentLink,
    ""
  );

  const qrCode = getValue(
    order.qrCode,
    order.QrCode,
    order.QRCode,
    order.qrData,
    order.QrData,
    order.qrContent,
    order.QrContent,
    order.paymentQrCode,
    order.PaymentQrCode,
    raw.qrCode,
    raw.QrCode,
    raw.QRCode,
    raw.qrData,
    raw.QrData,
    raw.qrContent,
    raw.QrContent,
    raw.paymentQrCode,
    raw.PaymentQrCode,
    ""
  );

  const qrImageUrl = getValue(
    order.qrImageUrl,
    order.QrImageUrl,
    order.qrCodeUrl,
    order.QrCodeUrl,
    order.qrUrl,
    order.QrUrl,
    order.paymentQrUrl,
    order.PaymentQrUrl,
    order.vietQrUrl,
    order.VietQrUrl,
    raw.qrImageUrl,
    raw.QrImageUrl,
    raw.qrCodeUrl,
    raw.QrCodeUrl,
    raw.qrUrl,
    raw.QrUrl,
    raw.paymentQrUrl,
    raw.PaymentQrUrl,
    raw.vietQrUrl,
    raw.VietQrUrl,
    ""
  );

  return {
    depositOrderId,
    id: depositOrderId,

    amount,
    currency: "VND",
    status,

    paymentUrl,
    qrCode,
    qrImageUrl,

    bankName: getValue(
      order.bankName,
      order.BankName,
      order.bankCode,
      order.BankCode,
      order.providerName,
      order.ProviderName,
      raw.bankName,
      raw.BankName,
      raw.bankCode,
      raw.BankCode,
      raw.providerName,
      raw.ProviderName,
      ""
    ),

    accountName: getValue(
      order.accountName,
      order.AccountName,
      order.accountHolderName,
      order.AccountHolderName,
      order.bankAccountName,
      order.BankAccountName,
      order.beneficiaryName,
      order.BeneficiaryName,
      order.receiverName,
      order.ReceiverName,
      order.merchantName,
      order.MerchantName,
      order.ownerName,
      order.OwnerName,
      order.virtualAccountName,
      order.VirtualAccountName,
      raw.accountName,
      raw.AccountName,
      raw.accountHolderName,
      raw.AccountHolderName,
      raw.bankAccountName,
      raw.BankAccountName,
      raw.beneficiaryName,
      raw.BeneficiaryName,
      raw.receiverName,
      raw.ReceiverName,
      raw.merchantName,
      raw.MerchantName,
      raw.ownerName,
      raw.OwnerName,
      raw.virtualAccountName,
      raw.VirtualAccountName,
      ""
    ),

    accountNumber: getValue(
      order.accountNumber,
      order.AccountNumber,
      order.bankAccountNumber,
      order.BankAccountNumber,
      order.virtualAccountNumber,
      order.VirtualAccountNumber,
      order.virtualAccountNo,
      order.VirtualAccountNo,
      order.vaNumber,
      order.VaNumber,
      order.bankAccountNo,
      order.BankAccountNo,
      raw.accountNumber,
      raw.AccountNumber,
      raw.bankAccountNumber,
      raw.BankAccountNumber,
      raw.virtualAccountNumber,
      raw.VirtualAccountNumber,
      raw.virtualAccountNo,
      raw.VirtualAccountNo,
      raw.vaNumber,
      raw.VaNumber,
      raw.bankAccountNo,
      raw.BankAccountNo,
      ""
    ),

    transferContent: getValue(
      order.transferContent,
      order.TransferContent,
      order.paymentContent,
      order.PaymentContent,
      order.description,
      order.Description,
      order.addInfo,
      order.AddInfo,
      order.orderCode,
      order.OrderCode,
      raw.transferContent,
      raw.TransferContent,
      raw.paymentContent,
      raw.PaymentContent,
      raw.description,
      raw.Description,
      raw.addInfo,
      raw.AddInfo,
      raw.orderCode,
      raw.OrderCode,
      ""
    ),

    createdAt: getValue(
      order.createdAt,
      order.CreatedAt,
      raw.createdAt,
      raw.CreatedAt,
      ""
    ),

    updatedAt: getValue(
      order.updatedAt,
      order.UpdatedAt,
      raw.updatedAt,
      raw.UpdatedAt,
      ""
    ),

    raw: order,
  };
};

function getTransactionDirection(type, amount) {
  const value = String(type || "").toUpperCase();

  if (
    value.includes("ESCROW_RECEIVE") ||
    value.includes("RECEIVE") ||
    value.includes("RELEASE") ||
    value.includes("EARNING") ||
    value.includes("CREDIT") ||
    value.includes("DEPOSIT") ||
    amount > 0
  ) {
    return "IN";
  }

  if (
    value.includes("WITHDRAW") ||
    value.includes("DEBIT") ||
    value.includes("FEE") ||
    value.includes("PAYMENT") ||
    amount < 0
  ) {
    return "OUT";
  }

  return "NEUTRAL";
}

const expertWalletService = {
  async getMyWallet() {
    const response = await expertWalletApi.getMyWallet();
    return normalizeWallet(unwrapData(response));
  },

  async getBalance() {
    const response = await expertWalletApi.getBalance();
    return normalizeBalance(unwrapBalanceData(response));
  },

  async getMyTransactions() {
    const response = await expertWalletApi.getMyTransactions();

    return unwrapListData(response)
      .map(normalizeTransaction)
      .filter(Boolean)
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
  },

  async getMyDepositOrders() {
    const response = await expertWalletApi.getMyDepositOrders();

    return unwrapListData(response)
      .map(normalizeDepositOrder)
      .filter(Boolean)
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
  },

  async getWalletOverview() {
    const [walletResult, balanceResult, transactionResult, depositOrderResult] =
      await Promise.allSettled([
        this.getMyWallet(),
        this.getBalance(),
        this.getMyTransactions(),
        this.getMyDepositOrders(),
      ]);

    const wallet =
      walletResult.status === "fulfilled" ? walletResult.value : null;

    const balance =
      balanceResult.status === "fulfilled"
        ? balanceResult.value
        : normalizeBalance(null);

    const transactions =
      transactionResult.status === "fulfilled" ? transactionResult.value : [];

    const depositOrders =
      depositOrderResult.status === "fulfilled" ? depositOrderResult.value : [];

    return {
      wallet,
      balance: {
        ...balance,
        availableBalance:
          balance.availableBalance || wallet?.availableBalance || 0,
        lockedBalance: wallet?.lockedBalance || balance.lockedBalance || 0,
        totalEarning: wallet?.totalEarning || balance.totalEarning || 0,
        totalBalance:
          wallet?.totalBalance ||
          balance.totalBalance ||
          Number(wallet?.availableBalance || 0) +
            Number(wallet?.lockedBalance || 0),
        currency: "VND",
      },
      transactions,
      depositOrders,
    };
  },

  async createDepositOrder(payload) {
    const amount = toNumber(payload?.amount, 0);

    if (amount <= 0) {
      throw new Error("Deposit amount must be greater than 0.");
    }

    const response = await expertWalletApi.createDepositOrder({ amount });
    return normalizeDepositOrder(unwrapData(response));
  },

  async getDepositOrderById(depositOrderId) {
    if (isInvalidId(depositOrderId)) {
      throw new Error("Invalid deposit order id.");
    }

    const response = await expertWalletApi.getDepositOrderById(depositOrderId);
    return normalizeDepositOrder(unwrapData(response));
  },
};

export default expertWalletService;