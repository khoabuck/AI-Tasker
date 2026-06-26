import { walletApi } from "../api/wallet.api";

const unwrap = (res) => res.data?.data || res.data;

export const walletService = {
  async getWalletPageData() {
    const [balRes, txRes, doRes] = await Promise.all([
  walletApi.getBalance(),
  walletApi.getTransactions(),
  walletApi.getMyDepositOrders(),
]);

let escrows = [];

    try {
    const projectsRes = await walletApi.getMyProjects();
    const projectsRaw = unwrap(projectsRes);

    const projects = Array.isArray(projectsRaw)
        ? projectsRaw
        : projectsRaw?.items ?? projectsRaw?.data ?? [];

    const escrowResults = await Promise.allSettled(
        projects
        .map((p) => p.projectId ?? p.id)
        .filter(Boolean)
        .map((projectId) => walletApi.getProjectEscrows(projectId))
    );

    escrows = escrowResults.flatMap((result) => {
        if (result.status !== "fulfilled") return [];

        const raw = unwrap(result.value);

        return Array.isArray(raw)
        ? raw
        : raw?.items ?? raw?.data ?? [];
    });
    } catch (err) {
    console.warn("Escrow fetch failed:", err);
    }

    const balRaw = unwrap(balRes);
    const txRaw = unwrap(txRes);
    const doRaw = unwrap(doRes);
    

    const totalEscrowBalance = escrows.reduce((sum, e) => {
    const status = (e.status ?? "").toUpperCase();

    const isActiveEscrow = [
        "LOCKED",
        "FUNDED",
        "ACTIVE",
        "PENDING",
        "PENDING_RELEASE",
        "PARTIALLY_RELEASED",
    ].includes(status);

    if (!isActiveEscrow) return sum;

    return (
        sum +
        Number(
        e.balance ??
        e.remainingAmount ??
        e.lockedAmount ??
        e.amount ??
        e.totalAmount ??
        e.escrowAmount ??
        0
        )
    );
    }, 0);

    return {
      balance: {
        availableBalance:
          balRaw?.availableBalance ??
          balRaw?.available ??
          balRaw?.balance ??
          balRaw?.walletBalance ??
          balRaw?.amount ??
          (typeof balRaw === "number" ? balRaw : 0),

        escrowBalance:
        totalEscrowBalance > 0
            ? totalEscrowBalance
            : (
                balRaw?.escrowBalance ??
                balRaw?.escrow ??
                balRaw?.lockedBalance ??
                balRaw?.lockedAmount ??
                balRaw?.escrowLocked ??
                balRaw?.escrowAmount ??
                balRaw?.totalEscrowBalance ??
                balRaw?.totalEscrowLocked ??
                0
            ),
        totalDeposited: balRaw?.totalDeposited ?? balRaw?.deposited ?? 0,
        totalWithdrawn:
          balRaw?.totalWithdrawn ??
          balRaw?.withdrawn ??
          balRaw?.totalSpent ??
          0,
      },

      transactions: Array.isArray(txRaw)
        ? txRaw
        : txRaw?.items ?? txRaw?.data ?? [],

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