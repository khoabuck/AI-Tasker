import expertWalletApi from "../api/expertWallet.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const trim = (value) => String(value || "").trim();

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.wallet) return data.data.wallet;
  if (data?.data?.balance !== undefined) return data.data.balance;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data) return data.data;

  if (data?.wallet) return data.wallet;
  if (data?.balance !== undefined) return data.balance;
  if (data?.item) return data.item;
  if (data?.result) return data.result;

  return data;
};

const unwrapListData = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.transactions)) return data.transactions;
  if (Array.isArray(data?.withdrawals)) return data.withdrawals;
  if (Array.isArray(data?.withdrawalRequests)) return data.withdrawalRequests;

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.transactions)) return data.data.transactions;
  if (Array.isArray(data?.data?.withdrawals)) return data.data.withdrawals;

  if (Array.isArray(data?.data?.withdrawalRequests)) {
    return data.data.withdrawalRequests;
  }

  return [];
};

const normalizeWallet = (wallet) => {
  if (!wallet) {
    return {
      walletId: null,
      userId: null,
      balance: 0,
      availableBalance: 0,
      lockedBalance: 0,
      pendingBalance: 0,
      totalEarning: 0,
      totalEarned: 0,
      createdAt: "",
      updatedAt: "",
      raw: null,
    };
  }

  const availableBalance = Number(
    getValue(
      wallet.availableBalance,
      wallet.AvailableBalance,
      wallet.balance,
      wallet.Balance,
      0
    )
  );

  const lockedBalance = Number(
    getValue(
      wallet.lockedBalance,
      wallet.LockedBalance,
      wallet.escrowAmount,
      wallet.EscrowAmount,
      wallet.lockedAmount,
      wallet.LockedAmount,
      0
    )
  );

  const pendingBalance = Number(
    getValue(wallet.pendingBalance, wallet.PendingBalance, 0)
  );

  const totalEarning = Number(
    getValue(
      wallet.totalEarning,
      wallet.TotalEarning,
      wallet.totalEarned,
      wallet.TotalEarned,
      wallet.totalIncome,
      wallet.TotalIncome,
      0
    )
  );

  return {
    walletId: getValue(wallet.walletId, wallet.WalletId, wallet.id, wallet.Id),
    userId: getValue(wallet.userId, wallet.UserId),

    balance: availableBalance,
    availableBalance,
    lockedBalance,
    pendingBalance,

    totalEarning,
    totalEarned: totalEarning,

    createdAt: getValue(wallet.createdAt, wallet.CreatedAt, ""),
    updatedAt: getValue(wallet.updatedAt, wallet.UpdatedAt, ""),

    raw: wallet,
  };
};

const normalizeBalance = (balanceData) => {
  if (balanceData === null || balanceData === undefined) {
    return {
      balance: 0,
      availableBalance: 0,
    };
  }

  if (typeof balanceData === "number") {
    return {
      balance: balanceData,
      availableBalance: balanceData,
    };
  }

  const balance = Number(
    getValue(
      balanceData.balance,
      balanceData.Balance,
      balanceData.availableBalance,
      balanceData.AvailableBalance,
      balanceData.amount,
      balanceData.Amount,
      0
    )
  );

  return {
    balance,
    availableBalance: balance,
    raw: balanceData,
  };
};

const normalizeTransaction = (transaction) => {
  if (!transaction) return null;

  const transactionId = getValue(
    transaction.transactionId,
    transaction.TransactionId,
    transaction.id,
    transaction.Id
  );

  return {
    transactionId,
    id: transactionId,

    escrowId: getValue(transaction.escrowId, transaction.EscrowId),
    projectId: getValue(transaction.projectId, transaction.ProjectId),
    milestoneId: getValue(transaction.milestoneId, transaction.MilestoneId),
    userId: getValue(transaction.userId, transaction.UserId),

    type: getValue(transaction.type, transaction.Type, "TRANSACTION"),

    amount: Number(getValue(transaction.amount, transaction.Amount, 0)),

    status: String(getValue(transaction.status, transaction.Status, "PENDING"))
      .trim()
      .toUpperCase(),

    description: getValue(
      transaction.description,
      transaction.Description,
      ""
    ),

    referenceId: getValue(
      transaction.referenceId,
      transaction.ReferenceId,
      ""
    ),

    createdAt: getValue(transaction.createdAt, transaction.CreatedAt, ""),

    raw: transaction,
  };
};

const normalizeWithdrawal = (withdrawal) => {
  if (!withdrawal) return null;

  const withdrawalRequestId = getValue(
    withdrawal.withdrawalRequestId,
    withdrawal.WithdrawalRequestId,
    withdrawal.withdrawalId,
    withdrawal.WithdrawalId,
    withdrawal.id,
    withdrawal.Id
  );

  return {
    withdrawalRequestId,
    id: withdrawalRequestId,

    userId: getValue(withdrawal.userId, withdrawal.UserId),
    userFullName: getValue(withdrawal.userFullName, withdrawal.UserFullName, ""),
    userEmail: getValue(withdrawal.userEmail, withdrawal.UserEmail, ""),

    amount: Number(getValue(withdrawal.amount, withdrawal.Amount, 0)),

    bankName: getValue(withdrawal.bankName, withdrawal.BankName, ""),

    bankAccountNumber: getValue(
      withdrawal.bankAccountNumber,
      withdrawal.BankAccountNumber,
      ""
    ),

    bankAccountHolder: getValue(
      withdrawal.bankAccountHolder,
      withdrawal.BankAccountHolder,
      withdrawal.bankAccountName,
      withdrawal.BankAccountName,
      ""
    ),

    status: String(getValue(withdrawal.status, withdrawal.Status, "PENDING"))
      .trim()
      .toUpperCase(),

    adminNote: getValue(withdrawal.adminNote, withdrawal.AdminNote, ""),

    createdAt: getValue(withdrawal.createdAt, withdrawal.CreatedAt, ""),

    processedAt: getValue(withdrawal.processedAt, withdrawal.ProcessedAt, ""),

    processedByAdminId: getValue(
      withdrawal.processedByAdminId,
      withdrawal.ProcessedByAdminId
    ),

    raw: withdrawal,
  };
};

const buildWithdrawalPayload = (formData) => {
  return {
    amount: Number(formData.amount),
    bankName: trim(formData.bankName),
    bankAccountNumber: trim(formData.bankAccountNumber),
    bankAccountHolder: trim(formData.bankAccountHolder),
  };
};

const expertWalletService = {
  async getWalletOverview() {
    /*
      Gọi /wallets/me trước để backend tạo wallet nếu account chưa có wallet.
      Sau đó mới gọi balance / transactions / withdrawals song song.
      Cách này tránh lỗi duplicate Wallet UserId khi account mới vào wallet lần đầu.
    */
    const walletResponse = await expertWalletApi.getMyWallet();
    const wallet = normalizeWallet(unwrapData(walletResponse));

    const [balanceResponse, transactionsResponse, withdrawalsResponse] =
      await Promise.all([
        expertWalletApi.getWalletBalance(),
        expertWalletApi.getMyTransactions(),
        expertWalletApi.getMyWithdrawals(),
      ]);

    const balance = normalizeBalance(unwrapData(balanceResponse));

    const transactions = unwrapListData(transactionsResponse)
      .map(normalizeTransaction)
      .filter(Boolean);

    const withdrawals = unwrapListData(withdrawalsResponse)
      .map(normalizeWithdrawal)
      .filter(Boolean);

    return {
      wallet: {
        ...wallet,
        ...balance,
        lockedBalance: wallet.lockedBalance,
        pendingBalance: wallet.pendingBalance,
        totalEarning: wallet.totalEarning,
        totalEarned: wallet.totalEarned,
      },
      transactions,
      withdrawals,
    };
  },

  async getMyWallet() {
    const response = await expertWalletApi.getMyWallet();

    return normalizeWallet(unwrapData(response));
  },

  async getWalletBalance() {
    const response = await expertWalletApi.getWalletBalance();

    return normalizeBalance(unwrapData(response));
  },

  async getMyTransactions() {
    const response = await expertWalletApi.getMyTransactions();

    return unwrapListData(response).map(normalizeTransaction).filter(Boolean);
  },

  async getMyWithdrawals() {
    const response = await expertWalletApi.getMyWithdrawals();

    return unwrapListData(response).map(normalizeWithdrawal).filter(Boolean);
  },

  async requestWithdraw(formData) {
    const payload = buildWithdrawalPayload(formData);
    const response = await expertWalletApi.createWithdrawal(payload);

    return normalizeWithdrawal(unwrapData(response));
  },

  async createDeposit(data) {
    const response = await expertWalletApi.createDeposit(data);

    return unwrapData(response);
  },

  normalizeWallet,
  normalizeBalance,
  normalizeTransaction,
  normalizeWithdrawal,
};

export default expertWalletService;