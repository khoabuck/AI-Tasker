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
  if (data?.data?.balance) return data.data.balance;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data) return data.data;

  if (data?.wallet) return data.wallet;
  if (data?.balance) return data.balance;
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
      balance: 0,
      availableBalance: 0,
      pendingBalance: 0,
      lockedBalance: 0,
      totalEarned: 0,
      currency: "USD",
    };
  }

  const balance = Number(
    getValue(
      wallet.balance,
      wallet.Balance,
      wallet.availableBalance,
      wallet.AvailableBalance,
      wallet.amount,
      wallet.Amount,
      0
    )
  );

  return {
    walletId: getValue(wallet.walletId, wallet.WalletId, wallet.id, wallet.Id),
    userId: getValue(wallet.userId, wallet.UserId, null),

    balance,
    availableBalance: Number(
      getValue(
        wallet.availableBalance,
        wallet.AvailableBalance,
        wallet.availableAmount,
        wallet.AvailableAmount,
        balance,
        0
      )
    ),

    pendingBalance: Number(
      getValue(
        wallet.pendingBalance,
        wallet.PendingBalance,
        wallet.pendingAmount,
        wallet.PendingAmount,
        0
      )
    ),

    lockedBalance: Number(
      getValue(
        wallet.lockedBalance,
        wallet.LockedBalance,
        wallet.escrowAmount,
        wallet.EscrowAmount,
        wallet.lockedAmount,
        wallet.LockedAmount,
        0
      )
    ),

    totalEarned: Number(
      getValue(
        wallet.totalEarned,
        wallet.TotalEarned,
        wallet.totalIncome,
        wallet.TotalIncome,
        0
      )
    ),

    currency: getValue(wallet.currency, wallet.Currency, "USD"),

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
      pendingBalance: 0,
      lockedBalance: 0,
    };
  }

  if (typeof balanceData === "number") {
    return {
      balance: balanceData,
      availableBalance: balanceData,
      pendingBalance: 0,
      lockedBalance: 0,
    };
  }

  return {
    balance: Number(
      getValue(
        balanceData.balance,
        balanceData.Balance,
        balanceData.availableBalance,
        balanceData.AvailableBalance,
        balanceData.amount,
        balanceData.Amount,
        0
      )
    ),

    availableBalance: Number(
      getValue(
        balanceData.availableBalance,
        balanceData.AvailableBalance,
        balanceData.availableAmount,
        balanceData.AvailableAmount,
        balanceData.balance,
        balanceData.Balance,
        0
      )
    ),

    pendingBalance: Number(
      getValue(
        balanceData.pendingBalance,
        balanceData.PendingBalance,
        balanceData.pendingAmount,
        balanceData.PendingAmount,
        0
      )
    ),

    lockedBalance: Number(
      getValue(
        balanceData.lockedBalance,
        balanceData.LockedBalance,
        balanceData.escrowAmount,
        balanceData.EscrowAmount,
        balanceData.lockedAmount,
        balanceData.LockedAmount,
        0
      )
    ),

    raw: balanceData,
  };
};

const normalizeTransaction = (transaction) => {
  if (!transaction) return null;

  const transactionId = getValue(
    transaction.transactionId,
    transaction.TransactionId,
    transaction.paymentTransactionId,
    transaction.PaymentTransactionId,
    transaction.id,
    transaction.Id
  );

  const status = String(
    getValue(transaction.status, transaction.Status, "PENDING")
  )
    .trim()
    .toUpperCase();

  return {
    transactionId,
    id: transactionId,

    type: getValue(
      transaction.type,
      transaction.Type,
      transaction.transactionType,
      transaction.TransactionType,
      "TRANSACTION"
    ),

    title: getValue(
      transaction.title,
      transaction.Title,
      transaction.description,
      transaction.Description,
      transaction.type,
      transaction.Type,
      "Wallet Transaction"
    ),

    description: getValue(
      transaction.description,
      transaction.Description,
      ""
    ),

    amount: Number(
      getValue(
        transaction.amount,
        transaction.Amount,
        transaction.totalAmount,
        transaction.TotalAmount,
        transaction.value,
        transaction.Value,
        0
      )
    ),

    status,

    createdAt: getValue(
      transaction.createdAt,
      transaction.CreatedAt,
      transaction.paidAt,
      transaction.PaidAt,
      transaction.date,
      transaction.Date,
      ""
    ),

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

  const status = String(
    getValue(withdrawal.status, withdrawal.Status, "PENDING")
  )
    .trim()
    .toUpperCase();

  return {
    withdrawalRequestId,
    id: withdrawalRequestId,

    amount: Number(getValue(withdrawal.amount, withdrawal.Amount, 0)),

    bankName: getValue(withdrawal.bankName, withdrawal.BankName, ""),
    bankAccountNumber: getValue(
      withdrawal.bankAccountNumber,
      withdrawal.BankAccountNumber,
      ""
    ),
    bankAccountName: getValue(
      withdrawal.bankAccountName,
      withdrawal.BankAccountName,
      withdrawal.accountHolderName,
      withdrawal.AccountHolderName,
      ""
    ),

    note: getValue(withdrawal.note, withdrawal.Note, ""),
    adminNote: getValue(
      withdrawal.adminNote,
      withdrawal.AdminNote,
      withdrawal.rejectReason,
      withdrawal.RejectReason,
      ""
    ),

    status,

    createdAt: getValue(withdrawal.createdAt, withdrawal.CreatedAt, ""),
    processedAt: getValue(
      withdrawal.processedAt,
      withdrawal.ProcessedAt,
      withdrawal.approvedAt,
      withdrawal.ApprovedAt,
      ""
    ),

    raw: withdrawal,
  };
};

const buildWithdrawalPayload = (formData) => {
  const amount = Number(formData.amount);

  return {
    amount,
    bankName: trim(formData.bankName),
    bankAccountNumber: trim(formData.bankAccountNumber),

    // Giữ cả 2 tên field để tránh lệch tên DTO BE.
    bankAccountName: trim(formData.bankAccountName),
    accountHolderName: trim(formData.bankAccountName),

    note: trim(formData.note) || null,
  };
};

const expertWalletService = {
  async getWalletOverview() {
    const [walletResponse, balanceResponse, transactionsResponse, withdrawalsResponse] =
      await Promise.all([
        expertWalletApi.getMyWallet(),
        expertWalletApi.getWalletBalance(),
        expertWalletApi.getMyTransactions(),
        expertWalletApi.getMyWithdrawals(),
      ]);

    console.log("GET WALLET RESPONSE:", walletResponse?.data);
    console.log("GET WALLET BALANCE RESPONSE:", balanceResponse?.data);
    console.log("GET TRANSACTIONS RESPONSE:", transactionsResponse?.data);
    console.log("GET WITHDRAWALS RESPONSE:", withdrawalsResponse?.data);

    const wallet = normalizeWallet(unwrapData(walletResponse));
    const balance = normalizeBalance(unwrapData(balanceResponse));

    return {
      wallet: {
        ...wallet,
        ...balance,
      },
      transactions: unwrapListData(transactionsResponse)
        .map(normalizeTransaction)
        .filter(Boolean),
      withdrawals: unwrapListData(withdrawalsResponse)
        .map(normalizeWithdrawal)
        .filter(Boolean),
    };
  },

  async getMyWallet() {
    const response = await expertWalletApi.getMyWallet();

    console.log("GET MY WALLET RESPONSE:", response?.data);

    return normalizeWallet(unwrapData(response));
  },

  async getWalletBalance() {
    const response = await expertWalletApi.getWalletBalance();

    console.log("GET WALLET BALANCE RESPONSE:", response?.data);

    return normalizeBalance(unwrapData(response));
  },

  async getMyTransactions() {
    const response = await expertWalletApi.getMyTransactions();

    console.log("GET MY TRANSACTIONS RESPONSE:", response?.data);

    return unwrapListData(response).map(normalizeTransaction).filter(Boolean);
  },

  async getMyWithdrawals() {
    const response = await expertWalletApi.getMyWithdrawals();

    console.log("GET MY WITHDRAWALS RESPONSE:", response?.data);

    return unwrapListData(response).map(normalizeWithdrawal).filter(Boolean);
  },

  async requestWithdraw(formData) {
    const payload = buildWithdrawalPayload(formData);

    console.log("CREATE WITHDRAWAL PAYLOAD:", payload);

    const response = await expertWalletApi.createWithdrawal(payload);

    console.log("CREATE WITHDRAWAL RESPONSE:", response?.data);

    return normalizeWithdrawal(unwrapData(response));
  },

  normalizeWallet,
  normalizeBalance,
  normalizeTransaction,
  normalizeWithdrawal,
};

export default expertWalletService;