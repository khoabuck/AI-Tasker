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
  if (data?.data?.withdrawal) return data.data.withdrawal;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data) return data.data;

  if (data?.wallet) return data.wallet;
  if (data?.depositOrder) return data.depositOrder;
  if (data?.withdrawal) return data.withdrawal;
  if (data?.item) return data.item;
  if (data?.result) return data.result;

  return data;
};

const unwrapBalanceData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data.balance !== undefined && data.balance !== null) {
    return data.balance;
  }

  if (
    data.data?.balance !== undefined &&
    data.data?.balance !== null
  ) {
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
  if (Array.isArray(data?.withdrawals)) return data.withdrawals;

  if (Array.isArray(data?.data?.items)) {
    return data.data.items;
  }

  if (Array.isArray(data?.data?.result)) {
    return data.data.result;
  }

  if (Array.isArray(data?.data?.transactions)) {
    return data.data.transactions;
  }

  if (Array.isArray(data?.data?.depositOrders)) {
    return data.data.depositOrders;
  }

  if (Array.isArray(data?.data?.withdrawals)) {
    return data.data.withdrawals;
  }

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

  const pendingEarningsBalance = toNumber(
    getValue(
      wallet.pendingEarningsBalance,
      wallet.PendingEarningsBalance,
      wallet.pendingEarnings,
      wallet.PendingEarnings,
      wallet.pendingBalance,
      wallet.PendingBalance,
      raw.pendingEarningsBalance,
      raw.PendingEarningsBalance,
      raw.pendingEarnings,
      raw.PendingEarnings,
      raw.pendingBalance,
      raw.PendingBalance,
      0
    ),
    0
  );

  const lockedBalance = toNumber(
    getValue(
      wallet.lockedBalance,
      wallet.LockedBalance,
      wallet.escrowBalance,
      wallet.EscrowBalance,
      raw.lockedBalance,
      raw.LockedBalance,
      raw.escrowBalance,
      raw.EscrowBalance,
      0
    ),
    0
  );

  const withdrawableBalance = toNumber(
    getValue(
      wallet.withdrawableBalance,
      wallet.WithdrawableBalance,
      wallet.availableBalance,
      wallet.AvailableBalance,
      wallet.balance,
      wallet.Balance,
      raw.withdrawableBalance,
      raw.WithdrawableBalance,
      raw.availableBalance,
      raw.AvailableBalance,
      raw.balance,
      raw.Balance,
      availableBalance
    ),
    availableBalance
  );

  /*
   * Không tự tính:
   *
   * availableBalance + pendingEarningsBalance
   *
   * vì Available Balance có thể chứa tiền deposit và Expert
   * có thể đã thực hiện withdrawal trước đó.
   *
   * Total Earning phải ưu tiên lấy trực tiếp từ Backend.
   */
  const totalEarning = toNumber(
    getValue(
      wallet.totalEarning,
      wallet.TotalEarning,
      wallet.totalEarnings,
      wallet.TotalEarnings,
      wallet.totalEarned,
      wallet.TotalEarned,
      raw.totalEarning,
      raw.TotalEarning,
      raw.totalEarnings,
      raw.TotalEarnings,
      raw.totalEarned,
      raw.TotalEarned,
      0
    ),
    0
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

    userId: getValue(
      wallet.userId,
      wallet.UserId,
      raw.userId,
      raw.UserId,
      ""
    ),

    availableBalance,
    balance: availableBalance,
    withdrawableBalance,
    pendingEarningsBalance,
    lockedBalance,

    totalEarning,
    totalEarnings: totalEarning,

    totalBalance:
      availableBalance +
      lockedBalance +
      pendingEarningsBalance,

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
      balance: 0,
      withdrawableBalance: 0,
      pendingEarningsBalance: 0,
      lockedBalance: 0,
      totalEarning: 0,
      totalEarnings: 0,
      totalBalance: 0,
      currency: "VND",
    };
  }

  if (typeof balanceData === "number") {
    return {
      availableBalance: balanceData,
      balance: balanceData,
      withdrawableBalance: balanceData,
      pendingEarningsBalance: 0,
      lockedBalance: 0,
      totalEarning: 0,
      totalEarnings: 0,
      totalBalance: balanceData,
      currency: "VND",
    };
  }

  const raw =
    balanceData.raw ||
    balanceData.Raw ||
    balanceData;

  const availableBalance = toNumber(
    getValue(
      balanceData.availableBalance,
      balanceData.AvailableBalance,
      balanceData.balance,
      balanceData.Balance,
      raw.availableBalance,
      raw.AvailableBalance,
      raw.balance,
      raw.Balance,
      0
    ),
    0
  );

  const pendingEarningsBalance = toNumber(
    getValue(
      balanceData.pendingEarningsBalance,
      balanceData.PendingEarningsBalance,
      balanceData.pendingEarnings,
      balanceData.PendingEarnings,
      balanceData.pendingBalance,
      balanceData.PendingBalance,
      raw.pendingEarningsBalance,
      raw.PendingEarningsBalance,
      raw.pendingEarnings,
      raw.PendingEarnings,
      raw.pendingBalance,
      raw.PendingBalance,
      0
    ),
    0
  );

  const lockedBalance = toNumber(
    getValue(
      balanceData.lockedBalance,
      balanceData.LockedBalance,
      balanceData.escrowBalance,
      balanceData.EscrowBalance,
      raw.lockedBalance,
      raw.LockedBalance,
      raw.escrowBalance,
      raw.EscrowBalance,
      0
    ),
    0
  );

  const withdrawableBalance = toNumber(
    getValue(
      balanceData.withdrawableBalance,
      balanceData.WithdrawableBalance,
      balanceData.availableBalance,
      balanceData.AvailableBalance,
      balanceData.balance,
      balanceData.Balance,
      raw.withdrawableBalance,
      raw.WithdrawableBalance,
      raw.availableBalance,
      raw.AvailableBalance,
      raw.balance,
      raw.Balance,
      availableBalance
    ),
    availableBalance
  );

  const totalEarning = toNumber(
    getValue(
      balanceData.totalEarning,
      balanceData.TotalEarning,
      balanceData.totalEarnings,
      balanceData.TotalEarnings,
      balanceData.totalEarned,
      balanceData.TotalEarned,
      raw.totalEarning,
      raw.TotalEarning,
      raw.totalEarnings,
      raw.TotalEarnings,
      raw.totalEarned,
      raw.TotalEarned,
      0
    ),
    0
  );

  return {
    availableBalance,
    balance: availableBalance,
    withdrawableBalance,
    pendingEarningsBalance,
    lockedBalance,

    totalEarning,
    totalEarnings: totalEarning,

    totalBalance:
      availableBalance +
      lockedBalance +
      pendingEarningsBalance,

    currency: "VND",

    raw: balanceData,
  };
};

export const normalizeTransaction = (transaction) => {
  if (!transaction) return null;

  const raw =
    transaction.raw ||
    transaction.Raw ||
    transaction;

  const amount = toNumber(
    getValue(
      transaction.amount,
      transaction.Amount,
      raw.amount,
      raw.Amount,
      0
    ),
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

  const category = String(
    getValue(
      transaction.category,
      transaction.Category,
      raw.category,
      raw.Category,
      ""
    )
  ).toUpperCase();

  const statusGroup = String(
    getValue(
      transaction.statusGroup,
      transaction.StatusGroup,
      raw.statusGroup,
      raw.StatusGroup,
      ""
    )
  ).toUpperCase();

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

    projectTitle: getValue(
      transaction.projectTitle,
      transaction.ProjectTitle,
      raw.projectTitle,
      raw.ProjectTitle,
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

    milestoneTitle: getValue(
      transaction.milestoneTitle,
      transaction.MilestoneTitle,
      raw.milestoneTitle,
      raw.MilestoneTitle,
      ""
    ),

    disputeId: getValue(
      transaction.disputeId,
      transaction.DisputeId,
      raw.disputeId,
      raw.DisputeId,
      ""
    ),

    userId: getValue(
      transaction.userId,
      transaction.UserId,
      raw.userId,
      raw.UserId,
      ""
    ),

    referenceId: getValue(
      transaction.referenceId,
      transaction.ReferenceId,
      raw.referenceId,
      raw.ReferenceId,
      ""
    ),

    type,
    status,
    category,
    statusGroup,

    amount,

    direction: getTransactionDirection(type, amount),

    description: getValue(
      transaction.description,
      transaction.Description,
      raw.description,
      raw.Description,
      ""
    ),

    displayTitle: getValue(
      transaction.displayTitle,
      transaction.DisplayTitle,
      raw.displayTitle,
      raw.DisplayTitle,
      ""
    ),

    displaySubtitle: getValue(
      transaction.displaySubtitle,
      transaction.DisplaySubtitle,
      raw.displaySubtitle,
      raw.DisplaySubtitle,
      ""
    ),

    createdAt: getValue(
      transaction.createdAt,
      transaction.CreatedAt,
      raw.createdAt,
      raw.CreatedAt,
      ""
    ),

    updatedAt: getValue(
      transaction.updatedAt,
      transaction.UpdatedAt,
      raw.updatedAt,
      raw.UpdatedAt,
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
    order.id,
    order.Id,
    raw.depositOrderId,
    raw.DepositOrderId,
    raw.id,
    raw.Id,
    ""
  );

  return {
    depositOrderId,
    id: depositOrderId,

    orderCode: getValue(
      order.orderCode,
      order.OrderCode,
      raw.orderCode,
      raw.OrderCode,
      ""
    ),

    amount: toNumber(
      getValue(
        order.amount,
        order.Amount,
        raw.amount,
        raw.Amount,
        0
      ),
      0
    ),

    status: String(
      getValue(
        order.status,
        order.Status,
        raw.status,
        raw.Status,
        "PENDING"
      )
    ).toUpperCase(),

    checkoutUrl: getValue(
      order.checkoutUrl,
      order.CheckoutUrl,
      order.paymentUrl,
      order.PaymentUrl,
      raw.checkoutUrl,
      raw.CheckoutUrl,
      raw.paymentUrl,
      raw.PaymentUrl,
      ""
    ),

    qrCode: getValue(
      order.qrCode,
      order.QrCode,
      order.qrCodeUrl,
      order.QrCodeUrl,
      order.qrUrl,
      order.QrUrl,
      raw.qrCode,
      raw.QrCode,
      raw.qrCodeUrl,
      raw.QrCodeUrl,
      raw.qrUrl,
      raw.QrUrl,
      ""
    ),

    bankName: getValue(
      order.bankName,
      order.BankName,
      raw.bankName,
      raw.BankName,
      ""
    ),

    accountName: getValue(
      order.accountName,
      order.AccountName,
      order.bankAccountName,
      order.BankAccountName,
      order.virtualAccountName,
      order.VirtualAccountName,
      raw.accountName,
      raw.AccountName,
      raw.bankAccountName,
      raw.BankAccountName,
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

    /*
     * Ưu tiên thời gian hết hạn Backend trả về.
     * ExpertWalletPage chỉ dùng 120 giây làm fallback
     * nếu Backend không có expiresAt.
     */
    expiresAt: getValue(
      order.expiresAt,
      order.ExpiresAt,
      order.expiredAt,
      order.ExpiredAt,
      order.expireAt,
      order.ExpireAt,
      raw.expiresAt,
      raw.ExpiresAt,
      raw.expiredAt,
      raw.ExpiredAt,
      raw.expireAt,
      raw.ExpireAt,
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

export const normalizeWithdrawal = (withdrawal) => {
  if (!withdrawal) return null;

  const raw =
    withdrawal.raw ||
    withdrawal.Raw ||
    withdrawal;

  const withdrawalId = getValue(
    withdrawal.withdrawalId,
    withdrawal.WithdrawalId,
    withdrawal.withdrawalRequestId,
    withdrawal.WithdrawalRequestId,
    withdrawal.id,
    withdrawal.Id,
    raw.withdrawalId,
    raw.WithdrawalId,
    raw.withdrawalRequestId,
    raw.WithdrawalRequestId,
    raw.id,
    raw.Id,
    ""
  );

  return {
    withdrawalId,
    id: withdrawalId,

    amount: toNumber(
      getValue(
        withdrawal.amount,
        withdrawal.Amount,
        raw.amount,
        raw.Amount,
        0
      ),
      0
    ),

    status: String(
      getValue(
        withdrawal.status,
        withdrawal.Status,
        raw.status,
        raw.Status,
        "PENDING"
      )
    ).toUpperCase(),

    bankName: getValue(
      withdrawal.bankName,
      withdrawal.BankName,
      raw.bankName,
      raw.BankName,
      ""
    ),

    bankAccountNumber: getValue(
      withdrawal.bankAccountNumber,
      withdrawal.BankAccountNumber,
      raw.bankAccountNumber,
      raw.BankAccountNumber,
      ""
    ),

    bankAccountHolder: getValue(
      withdrawal.bankAccountHolder,
      withdrawal.BankAccountHolder,
      raw.bankAccountHolder,
      raw.BankAccountHolder,
      ""
    ),

    rejectReason: getValue(
      withdrawal.rejectReason,
      withdrawal.RejectReason,
      withdrawal.rejectionReason,
      withdrawal.RejectionReason,
      raw.rejectReason,
      raw.RejectReason,
      raw.rejectionReason,
      raw.RejectionReason,
      ""
    ),

    createdAt: getValue(
      withdrawal.createdAt,
      withdrawal.CreatedAt,
      raw.createdAt,
      raw.CreatedAt,
      ""
    ),

    updatedAt: getValue(
      withdrawal.updatedAt,
      withdrawal.UpdatedAt,
      raw.updatedAt,
      raw.UpdatedAt,
      ""
    ),

    raw: withdrawal,
  };
};

function getTransactionDirection(type, amount) {
  const value = String(type || "").toUpperCase();

  /*
   * Các transaction làm giảm số dư của Expert.
   */
  if (
    [
      "EXPERT_PENDING_EARNING_REFUND",
      "EXPERT_SERVICE_FEE",
      "WITHDRAWAL_HOLD",
      "WITHDRAWAL_PAID",
      "WITHDRAWAL_COMPLETED",
      "PROPOSAL_CREDIT_PACKAGE_PURCHASE",
    ].includes(value)
  ) {
    return "OUT";
  }

  /*
   * HOLD:
   * Milestone được approve và tiền ròng vào Pending Earnings.
   *
   * RELEASE:
   * Pending Earnings được chuyển sang Available Balance.
   *
   * REJECTED/FAILED/EXPIRED:
   * Tiền withdrawal bị giữ được trả lại Available Balance.
   */
  if (
    [
      "EXPERT_PENDING_EARNING_HOLD",
      "EXPERT_PENDING_EARNING_RELEASE",
      "WITHDRAWAL_REJECTED",
      "WITHDRAWAL_FAILED",
      "WITHDRAWAL_EXPIRED",
    ].includes(value)
  ) {
    return "IN";
  }

  /*
   * Processing chỉ là trạng thái trung gian.
   * Không xem là cộng hoặc trừ thêm tiền.
   */
  if (value === "WITHDRAWAL_PAYOUT_PROCESSING") {
    return "NEUTRAL";
  }

  if (
    value.includes("DEPOSIT") ||
    value.includes("TOP_UP") ||
    value.includes("ESCROW_RECEIVE") ||
    value.includes("CREDIT") ||
    amount > 0
  ) {
    return "IN";
  }

  if (
    value.includes("WITHDRAW") ||
    value.includes("DEBIT") ||
    value.includes("FEE") ||
    value.includes("PAYMENT") ||
    value.includes("PURCHASE") ||
    amount < 0
  ) {
    return "OUT";
  }

  return "NEUTRAL";
}

const expertWalletService = {
  async getMyWallet() {
    const response = await expertWalletApi.getMyWallet();

    return normalizeWallet(
      unwrapData(response)
    );
  },

  async getBalance() {
    const response = await expertWalletApi.getBalance();

    return normalizeBalance(
      unwrapBalanceData(response)
    );
  },

  async getMyTransactions() {
    const response =
      await expertWalletApi.getMyTransactions();

    return unwrapListData(response)
      .map(normalizeTransaction)
      .filter(Boolean)
      .sort((a, b) => {
        const dateA = new Date(
          a.createdAt || 0
        ).getTime();

        const dateB = new Date(
          b.createdAt || 0
        ).getTime();

        return dateB - dateA;
      });
  },

  async getMyDepositOrders() {
    const response =
      await expertWalletApi.getMyDepositOrders();

    return unwrapListData(response)
      .map(normalizeDepositOrder)
      .filter(Boolean)
      .sort((a, b) => {
        const dateA = new Date(
          a.createdAt || 0
        ).getTime();

        const dateB = new Date(
          b.createdAt || 0
        ).getTime();

        return dateB - dateA;
      });
  },

  async getMyWithdrawals() {
    const response =
      await expertWalletApi.getMyWithdrawals();

    return unwrapListData(response)
      .map(normalizeWithdrawal)
      .filter(Boolean)
      .sort((a, b) => {
        const dateA = new Date(
          a.createdAt || 0
        ).getTime();

        const dateB = new Date(
          b.createdAt || 0
        ).getTime();

        return dateB - dateA;
      });
  },

  async getWalletOverview() {
    const [
      walletResult,
      balanceResult,
      transactionResult,
      depositOrderResult,
      withdrawalResult,
    ] = await Promise.allSettled([
      this.getMyWallet(),
      this.getBalance(),
      this.getMyTransactions(),
      this.getMyDepositOrders(),
      this.getMyWithdrawals(),
    ]);

    const wallet =
      walletResult.status === "fulfilled"
        ? walletResult.value
        : null;

    const balance =
      balanceResult.status === "fulfilled"
        ? balanceResult.value
        : normalizeBalance(null);

    const transactions =
      transactionResult.status === "fulfilled"
        ? transactionResult.value
        : [];

    const depositOrders =
      depositOrderResult.status === "fulfilled"
        ? depositOrderResult.value
        : [];

    const withdrawals =
      withdrawalResult.status === "fulfilled"
        ? withdrawalResult.value
        : [];

    return {
      wallet,

      balance: (() => {
        const availableBalance = toNumber(
          getValue(
            balance.availableBalance,
            wallet?.availableBalance,
            0
          ),
          0
        );

        const withdrawableBalance = toNumber(
          getValue(
            balance.withdrawableBalance,
            wallet?.withdrawableBalance,
            availableBalance
          ),
          availableBalance
        );

        /*
         * GET /wallets/balance của Backend hiện chỉ trả AvailableBalance dạng số.
         * normalizeBalance(number) sẽ tạo Pending/Locked = 0 để đủ shape.
         * Vì vậy Pending và Locked phải ưu tiên dữ liệu từ GET /wallets/me,
         * nếu ưu tiên balance trước thì số 0 giả sẽ che mất số thật của Backend.
         */
        const pendingEarningsBalance = toNumber(
          getValue(
            wallet?.pendingEarningsBalance,
            balance.pendingEarningsBalance,
            0
          ),
          0
        );

        const lockedBalance = toNumber(
          getValue(
            wallet?.lockedBalance,
            balance.lockedBalance,
            0
          ),
          0
        );

        /*
         * Chỉ lấy Total Earning Backend trả về.
         * Không cộng Available + Pending.
         */
        const totalEarning = toNumber(
          getValue(
            wallet?.totalEarning,
            wallet?.totalEarnings,
            balance.totalEarning,
            balance.totalEarnings,
            0
          ),
          0
        );

        return {
          ...balance,

          availableBalance,
          balance: availableBalance,

          withdrawableBalance,
          pendingEarningsBalance,
          lockedBalance,

          totalEarning,
          totalEarnings: totalEarning,

          totalBalance:
            availableBalance +
            lockedBalance +
            pendingEarningsBalance,

          currency: "VND",
        };
      })(),

      transactions,
      depositOrders,
      withdrawals,
    };
  },

  async createDepositOrder(payload) {
    const amount = toNumber(
      payload?.amount,
      0
    );

    if (amount <= 0) {
      throw new Error(
        "Deposit amount must be greater than 0."
      );
    }

    const response =
      await expertWalletApi.createDepositOrder({
        amount,
      });

    return normalizeDepositOrder(
      unwrapData(response)
    );
  },

  async getDepositOrderById(depositOrderId) {
    if (isInvalidId(depositOrderId)) {
      throw new Error(
        "Invalid deposit order id."
      );
    }

    const response =
      await expertWalletApi.getDepositOrderById(
        depositOrderId
      );

    return normalizeDepositOrder(
      unwrapData(response)
    );
  },

  async createWithdrawal(form) {
    const amount = toNumber(
      form?.amount,
      0
    );

    if (amount <= 0) {
      throw new Error(
        "Withdrawal amount must be greater than 0."
      );
    }

    const bankName = String(
      form?.bankName || ""
    ).trim();

    const bankAccountNumber = String(
      form?.bankAccountNumber || ""
    ).trim();

    const bankAccountHolder = String(
      form?.bankAccountHolder || ""
    ).trim();

    if (
      !bankName ||
      !bankAccountNumber ||
      !bankAccountHolder
    ) {
      throw new Error(
        "Please fill in all bank information."
      );
    }

    const response =
      await expertWalletApi.createWithdrawal({
        amount,
        bankName,
        bankAccountNumber,
        bankAccountHolder,
      });

    return normalizeWithdrawal(
      unwrapData(response)
    );
  },
};

export default expertWalletService;