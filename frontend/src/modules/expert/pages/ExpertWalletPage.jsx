import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import expertWalletService from "../../../services/expertWallet.service";

const quickAmounts = [50000, 100000, 200000, 500000];
const PAYMENT_CHECK_INTERVAL_MS = 5000;
const DEPOSIT_EXPIRE_SECONDS = 120;

const popularBanks = [
  "Vietcombank",
  "Techcombank",
  "BIDV",
  "VietinBank",
  "MB Bank",
  "ACB",
  "VPBank",
  "TPBank",
  "Sacombank",
  "Agribank",
  "HDBank",
  "SHB",
  "VIB",
  "OCB",
  "Other",
];

const emptyWithdrawalForm = {
  amount: "",
  bankName: "",
  customBankName: "",
  bankAccountNumber: "",
  bankAccountHolder: "",
};

export default function ExpertWalletPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const returnTo =
    location.state?.returnTo || "/expert/proposal-credit-packages";
  const returnReason = location.state?.reason || "";
  const returnPackageId = location.state?.packageId || "";
  const autoOpenDeposit = Boolean(location.state?.autoOpenDeposit);
  const requestedDepositAmount = location.state?.depositAmount || "";

  const shouldShowCreditReturn =
    returnReason === "BUY_PROPOSAL_CREDITS" ||
    returnTo === "/expert/proposal-credit-packages";

  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [depositOrders, setDepositOrders] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);

  const [depositAmount, setDepositAmount] = useState("");
  const [activeDepositOrder, setActiveDepositOrder] = useState(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositCountdown, setDepositCountdown] = useState(0);
  const [depositMinimized, setDepositMinimized] = useState(false);

  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState(emptyWithdrawalForm);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingDeposit, setCreatingDeposit] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [creatingWithdrawal, setCreatingWithdrawal] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    loadWallet();
  }, []);

  useEffect(() => {
    const hasActiveDeposit = depositOrders.some((order) =>
      isActiveDepositOrder(order)
    );

    if (!hasActiveDeposit) return;

    const intervalId = window.setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [depositOrders]);



  useEffect(() => {
    const orderId = activeDepositOrder?.depositOrderId;

    if (!showDepositModal || !orderId) return;
    if (isFinalDepositStatus(activeDepositOrder.status)) return;

    const intervalId = window.setInterval(() => {
      checkDepositStatus(orderId, { silent: true });
    }, PAYMENT_CHECK_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    showDepositModal,
    activeDepositOrder?.depositOrderId,
    activeDepositOrder?.status,
  ]);

  useEffect(() => {
    if (!activeDepositOrder?.depositOrderId) return;

    if (isFinalDepositStatus(activeDepositOrder.status)) {
      setDepositMinimized(false);
      return;
    }

    if (depositCountdown <= 0) {
      setDepositMinimized(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDepositCountdown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [
    activeDepositOrder?.depositOrderId,
    activeDepositOrder?.status,
    depositCountdown,
  ]);

  const normalizedTransactions = useMemo(() => {
    return transactions.map((transaction) => ({
      ...transaction,
      ui: getTransactionPresentation(transaction),
    }));
  }, [transactions]);

  const totalDeposited = useMemo(() => {
    const depositFromTransactions = normalizedTransactions
      .filter((item) => item.ui.group === "DEPOSIT")
      .reduce((total, item) => total + Number(item.amount || 0), 0);

    if (depositFromTransactions > 0) return depositFromTransactions;

    return depositOrders
      .filter((item) => isPaidDepositStatus(item.status))
      .reduce((total, item) => total + Number(item.amount || 0), 0);
  }, [normalizedTransactions, depositOrders]);

  const totalWithdrawn = useMemo(() => {
    const fromTransactions = normalizedTransactions
      .filter((item) => item.ui.group === "WITHDRAW")
      .reduce((total, item) => total + Number(item.amount || 0), 0);

    if (fromTransactions > 0) return fromTransactions;

    return withdrawals
      .filter((item) => isSuccessStatus(item.status))
      .reduce((total, item) => total + Number(item.amount || 0), 0);
  }, [normalizedTransactions, withdrawals]);

  const activeDepositOrderForPayment = useMemo(() => {
    return depositOrders.find((order) => isActiveDepositOrder(order)) || null;
  }, [depositOrders, nowTick]);

  useEffect(() => {
  if (!autoOpenDeposit) return;

  setError("");
  setMessage("");

  if (activeDepositOrderForPayment) {
    openDepositOrder(activeDepositOrderForPayment);

    setMessage(
      "You already have an active deposit QR. Please complete it before creating a new one."
    );

    return;
  }

  setDepositAmount(String(requestedDepositAmount || ""));
  setActiveDepositOrder(null);
  setDepositCountdown(0);
  setDepositMinimized(false);
  setShowDepositModal(true);
}, [autoOpenDeposit, requestedDepositAmount, activeDepositOrderForPayment]);

  const latestDepositOrders = useMemo(() => depositOrders, [depositOrders]);

  const latestWithdrawals = useMemo(() => withdrawals, [withdrawals]);

  const withdrawableBalance = Number(
    balance?.withdrawableBalance ?? balance?.availableBalance ?? 0
  );

  const goToProposalCredits = () => {
    navigate(returnTo || "/expert/proposal-credit-packages", {
      state: { packageId: returnPackageId },
    });
  };

  const updateDepositOrderInList = (order) => {
    if (!order?.depositOrderId) return;

    setDepositOrders((prev) => {
      const exists = prev.some(
        (item) => String(item.depositOrderId) === String(order.depositOrderId)
      );

      if (!exists) return [order, ...prev];

      return prev.map((item) =>
        String(item.depositOrderId) === String(order.depositOrderId)
          ? order
          : item
      );
    });
  };

  const loadWallet = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await expertWalletService.getWalletOverview();

      setWallet(data.wallet);
      setBalance(data.balance);
      setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
      setDepositOrders(
        Array.isArray(data.depositOrders) ? data.depositOrders : []
      );
      setWithdrawals(Array.isArray(data.withdrawals) ? data.withdrawals : []);
    } catch (err) {
      console.error("LOAD EXPERT WALLET ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load wallet."));
      setWallet(null);
      setBalance(null);
      setTransactions([]);
      setDepositOrders([]);
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshWallet = async ({ keepMessage = false } = {}) => {
    try {
      setRefreshing(true);
      setError("");
      if (!keepMessage) setMessage("");

      const data = await expertWalletService.getWalletOverview();

      setWallet(data.wallet);
      setBalance(data.balance);
      setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
      setDepositOrders(
        Array.isArray(data.depositOrders) ? data.depositOrders : []
      );
      setWithdrawals(Array.isArray(data.withdrawals) ? data.withdrawals : []);
    } catch (err) {
      console.error("REFRESH EXPERT WALLET ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot refresh wallet."));
    } finally {
      setRefreshing(false);
    }
  };

  const openDepositModal = () => {
    setError("");
    setMessage("");

    if (activeDepositOrderForPayment) {
      openDepositOrder(activeDepositOrderForPayment);
      setMessage(
        "You already have an active payment QR. Please complete it or wait until it expires before creating a new one."
      );
      return;
    }

    setActiveDepositOrder(null);
    setDepositAmount("");
    setDepositCountdown(0);
    setDepositMinimized(false);
    setShowDepositModal(true);
  };

  const closeDepositModal = () => {
    if (creatingDeposit || checkingPayment) return;

    setShowDepositModal(false);

    if (
      activeDepositOrder &&
      !isFinalDepositStatus(activeDepositOrder.status) &&
      depositCountdown > 0
    ) {
      setDepositMinimized(true);
      return;
    }

    setActiveDepositOrder(null);
    setDepositAmount("");
    setDepositCountdown(0);
    setDepositMinimized(false);
  };

  const handleCreateDepositOrder = async (event) => {
    event.preventDefault();

    const amount = Number(depositAmount);

    if (activeDepositOrderForPayment) {
      setError(
        "You already have an active payment QR. Please complete it or wait until it expires before creating a new one."
      );
      openDepositOrder(activeDepositOrderForPayment);
      return;
    }

    if (!amount || amount <= 0) {
      setError("Please enter a valid deposit amount.");
      return;
    }

    try {
      setCreatingDeposit(true);
      setError("");
      setMessage("");

      const order = await expertWalletService.createDepositOrder({ amount });

      if (order) {
        setActiveDepositOrder(order);
        setDepositCountdown(getDepositRemainingSeconds(order.createdAt));
        setDepositMinimized(false);
        updateDepositOrderInList(order);
      }

      setMessage("Payment QR created. Please transfer the exact amount.");
    } catch (err) {
      console.error("CREATE DEPOSIT ORDER ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot create deposit order."));
    } finally {
      setCreatingDeposit(false);
    }
  };

  const checkDepositStatus = async (
    depositOrderId,
    options = { silent: false }
  ) => {
    if (!depositOrderId) return;

    try {
      if (!options.silent) setCheckingPayment(true);

      setError("");

      const previousStatus = String(
        activeDepositOrder?.status || ""
      ).toUpperCase();

      const detail = await expertWalletService.getDepositOrderById(
        depositOrderId
      );

      if (detail) {
        setActiveDepositOrder(detail);
        updateDepositOrderInList(detail);

        const currentStatus = String(detail.status || "").toUpperCase();

        if (isPaidDepositStatus(currentStatus)) {
          setDepositMinimized(false);
          setDepositCountdown(0);

          await refreshWallet({ keepMessage: true });

          if (!isPaidDepositStatus(previousStatus)) {
            setMessage(
              shouldShowCreditReturn
                ? "Payment confirmed. Your wallet balance has been updated. You can continue buying proposal credits now."
                : "Payment confirmed. Your wallet balance has been updated."
            );
          }
        } else if (!options.silent) {
          setMessage(
            "Payment is still pending. Your wallet will update after the provider confirms the transfer."
          );
        }
      }
    } catch (err) {
      if (!options.silent) {
        console.error("CHECK DEPOSIT STATUS ERROR:", err?.response?.data || err);
        setError(getFriendlyError(err, "Cannot check payment status."));
      }
    } finally {
      if (!options.silent) setCheckingPayment(false);
    }
  };

  const openDepositOrder = async (order) => {
    if (!order?.depositOrderId) return;

    const isExpired =
      String(order.status || "").toUpperCase() === "PENDING" &&
      getDepositRemainingSeconds(order.createdAt) <= 0;

    if (isExpired) return;

    try {
      setError("");
      setMessage("");

      const detail = await expertWalletService.getDepositOrderById(
        order.depositOrderId
      );

      const selectedOrder = detail || order;
      const selectedExpired =
        String(selectedOrder.status || "").toUpperCase() === "PENDING" &&
        getDepositRemainingSeconds(selectedOrder.createdAt) <= 0;

      if (selectedExpired) return;

      setActiveDepositOrder(selectedOrder);
      setDepositCountdown(getDepositRemainingSeconds(selectedOrder?.createdAt));
      setDepositMinimized(false);
      setShowDepositModal(true);
    } catch {
      setActiveDepositOrder(order);
      setDepositCountdown(getDepositRemainingSeconds(order?.createdAt));
      setDepositMinimized(false);
      setShowDepositModal(true);
    }
  };

  const copyToClipboard = async (text) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copied to clipboard.");
    } catch {
      setError("Cannot copy to clipboard.");
    }
  };

  const openWithdrawalModal = () => {
    setMessage("");
    setError("");
    setWithdrawalForm(emptyWithdrawalForm);
    setShowWithdrawalModal(true);
  };

  const closeWithdrawalModal = () => {
    if (creatingWithdrawal) return;
    setShowWithdrawalModal(false);
    setWithdrawalForm(emptyWithdrawalForm);
  };

  const updateWithdrawalField = (field, value) => {
    setError("");

    setWithdrawalForm((prev) => {
      if (field === "bankName") {
        return {
          ...prev,
          bankName: value,
          customBankName: value === "Other" ? prev.customBankName : "",
        };
      }

      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const getFinalBankName = () => {
    if (withdrawalForm.bankName === "Other") {
      return withdrawalForm.customBankName.trim();
    }

    return withdrawalForm.bankName.trim();
  };

  const handleCreateWithdrawal = async (event) => {
    event.preventDefault();

    const amount = Number(withdrawalForm.amount);
    const finalBankName = getFinalBankName();

    if (!amount || amount <= 0) {
      setError("Please enter a valid withdrawal amount.");
      return;
    }

    if (amount > withdrawableBalance) {
      setError("Withdrawal amount cannot exceed your withdrawable balance.");
      return;
    }

    if (
      !finalBankName ||
      !withdrawalForm.bankAccountNumber.trim() ||
      !withdrawalForm.bankAccountHolder.trim()
    ) {
      setError("Please fill in all bank information.");
      return;
    }

    try {
      setCreatingWithdrawal(true);
      setError("");
      setMessage("");

      await expertWalletService.createWithdrawal({
        amount,
        bankName: finalBankName,
        bankAccountNumber: withdrawalForm.bankAccountNumber,
        bankAccountHolder: withdrawalForm.bankAccountHolder,
      });

      setShowWithdrawalModal(false);
      setWithdrawalForm(emptyWithdrawalForm);
      setMessage(
        "Withdrawal request submitted successfully. The amount is now on hold while the payout is processed."
      );

      await refreshWallet({ keepMessage: true });
    } catch (err) {
      console.error("CREATE WITHDRAWAL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot create withdrawal request."));
    } finally {
      setCreatingWithdrawal(false);
    }
  };

  const openMilestone = (milestoneId) => {
    if (!milestoneId) return;
    navigate(`/expert/milestones/${milestoneId}`);
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading wallet...
        </div>
      </ExpertLayout>
    );
  }

  return (
    <ExpertLayout>
      <style>
        {`
          .wallet-scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }

          .wallet-scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>

      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="mb-8 rounded-[2rem] border border-cyan-400/20 bg-gradient-to-br from-[#151a22] via-[#111823] to-[#0b1018] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.35)] md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                  <span className="material-symbols-outlined text-[17px]">
                    account_balance_wallet
                  </span>
                  Expert Wallet
                </div>

                <h1 className="text-4xl font-black text-white md:text-5xl">
                  Wallet Overview
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-400 md:text-base">
                  Track your balance, deposits, proposal credit payments, and
                  withdrawal requests in one place.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={openWithdrawalModal}
                  disabled={withdrawableBalance <= 0}
                  className="flex items-center gap-2 rounded-2xl border border-green-400/60 bg-green-400/10 px-6 py-4 text-sm font-black text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[22px]">
                    account_balance
                  </span>
                  Withdraw
                </button>

                <button
                  type="button"
                  onClick={openDepositModal}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-400 px-6 py-4 text-sm font-black text-white shadow-[0_18px_45px_rgba(0,240,255,0.2)] transition hover:scale-[1.01]"
                >
                  <span className="material-symbols-outlined text-[22px]">
                    add_card
                  </span>
                  Deposit
                </button>

                <button
                  type="button"
                  onClick={goToProposalCredits}
                  className="flex items-center gap-2 rounded-2xl border border-purple-400/50 bg-purple-400/10 px-6 py-4 text-sm font-black text-purple-300 transition hover:bg-purple-400 hover:text-black"
                >
                  <span className="material-symbols-outlined text-[22px]">
                    workspace_premium
                  </span>
                  Buy Proposal Credits
                </button>
              </div>
            </div>
          </section>

          {message && <Alert type="success" message={message} />}
          {error && <Alert type="danger" message={error} />}

          <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <BalanceCard
              label="Available Balance"
              value={formatMoney(balance?.availableBalance)}
              icon="account_balance_wallet"
              tone="cyan"
              description="Money currently available in your wallet."
            />

            <BalanceCard
              label="Pending Earnings"
              value={formatMoney(balance?.pendingEarningsBalance)}
              icon="hourglass_top"
              tone="yellow"
              description="Net milestone earnings after service fee, waiting for project completion."
            />

            <BalanceCard
              label="Total Withdrawn"
              value={formatMoney(totalWithdrawn)}
              icon="logout"
              tone="green"
              description="Total amount successfully withdrawn from your wallet."
            />

            <BalanceCard
              label="Total Earnings"
              value={formatMoney(balance?.totalEarnings)}
              icon="trending_up"
              tone="purple"
              description="Total net earnings tracked for your Expert account."
            />
          </section>

          <section className="mb-8 rounded-[1.5rem] border border-yellow-400/20 bg-yellow-400/10 p-5">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-yellow-300">info</span>
              <div>
                <h2 className="font-black text-white">How expert earnings work</h2>
                <p className="mt-2 text-sm leading-6 text-yellow-100/80">
                  When a milestone is released, the expert service fee is deducted immediately. The net amount goes to pending earnings and becomes available for withdrawal after the project is completed.
                </p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_430px]">
            <div className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#151a22] shadow-[0_18px_55px_rgba(0,0,0,0.28)]">
              <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">
                    Transaction History
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    {normalizedTransactions.length} transaction(s)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => refreshWallet()}
                  disabled={refreshing}
                  className="w-fit rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:opacity-50"
                >
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              {normalizedTransactions.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="wallet-scrollbar-hide max-h-[520px] overflow-auto">
                  <table className="w-full min-w-[850px] text-left">
                    <thead className="sticky top-0 z-10 border-b border-white/10 bg-[#151a22]">
                      <tr>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </tr>
                    </thead>

                    <tbody>
                      {normalizedTransactions.map((transaction, index) => (
                        <TransactionRow
                          key={transaction.transactionId || index}
                          transaction={transaction}
                          onOpenMilestone={openMilestone}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <aside className="space-y-6">
              <HistoryPanel
                title="Withdrawal Requests"
                subtitle="Payout status and bank transfer requests"
                empty="No withdrawal requests yet."
                bodyClassName="max-h-[390px]"
              >
                {latestWithdrawals.map((item, index) => (
                  <WithdrawalHistoryItem
                    key={item.withdrawalId || index}
                    withdrawal={item}
                  />
                ))}
              </HistoryPanel>

              <HistoryPanel
                title="Deposit History"
                subtitle="Recent QR payment orders"
                empty="No deposit orders yet."
                bodyClassName="max-h-[390px]"
              >
                {latestDepositOrders.map((order, index) => (
                  <DepositHistoryItem
                    key={order.depositOrderId || index}
                    order={order}
                    checking={checkingPayment}
                    onOpen={() => openDepositOrder(order)}
                    onCheck={() => checkDepositStatus(order.depositOrderId)}
                  />
                ))}
              </HistoryPanel>
            </aside>
          </section>
        </div>
      </div>

      {showWithdrawalModal && (
        <WithdrawalModal
          form={withdrawalForm}
          withdrawableBalance={withdrawableBalance}
          creating={creatingWithdrawal}
          onChange={updateWithdrawalField}
          onClose={closeWithdrawalModal}
          onSubmit={handleCreateWithdrawal}
        />
      )}

      {showDepositModal && (
        <DepositModal
          amount={depositAmount}
          setAmount={setDepositAmount}
          order={activeDepositOrder}
          remainingSeconds={depositCountdown}
          creating={creatingDeposit}
          checking={checkingPayment}
          onClose={closeDepositModal}
          onSubmit={handleCreateDepositOrder}
          onCheckStatus={() =>
            checkDepositStatus(activeDepositOrder?.depositOrderId)
          }
          onCopy={copyToClipboard}
          onGenerateNew={() => {
            setDepositAmount(
              String(activeDepositOrder?.amount || depositAmount || "")
            );
            setActiveDepositOrder(null);
            setDepositCountdown(0);
            setDepositMinimized(false);
          }}
          onContinueCredits={shouldShowCreditReturn ? goToProposalCredits : null}
        />
      )}

      {depositMinimized &&
        !showDepositModal &&
        activeDepositOrder &&
        !isFinalDepositStatus(activeDepositOrder.status) &&
        depositCountdown > 0 && (
          <FloatingDepositButton
            order={activeDepositOrder}
            remainingSeconds={depositCountdown}
            onOpen={() => {
              setDepositMinimized(false);
              setShowDepositModal(true);
            }}
          />
        )}
    </ExpertLayout>
  );
}

function WithdrawalModal({
  form,
  withdrawableBalance,
  creating,
  onChange,
  onClose,
  onSubmit,
}) {
  const isOtherBank = form.bankName === "Other";

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 px-4 py-4 backdrop-blur-sm">
      <div className="wallet-scrollbar-hide max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[1.4rem] border border-green-400/30 bg-[#0f141d] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.78)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-green-300">
              Bank Payout
            </p>

            <h2 className="mt-2 text-xl font-black text-white">
              Withdraw Earnings
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Available to withdraw:{" "}
              <span className="font-black text-green-300">
                {formatMoney(withdrawableBalance)}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        <div className="mb-5 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4">
          <p className="text-sm font-bold text-yellow-200">
            Your money will be held after submitting
          </p>

          <p className="mt-1 text-xs leading-5 text-yellow-100/80">
            The requested amount moves from available balance to locked balance
            while payout is processed.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <WalletInput
            label="Amount"
            type="number"
            min="1"
            value={form.amount}
            disabled={creating}
            onChange={(value) => onChange("amount", value)}
            placeholder="Enter amount in VND"
          />

          <BankSelect
            value={form.bankName}
            disabled={creating}
            onChange={(value) => onChange("bankName", value)}
          />

          {isOtherBank && (
            <WalletInput
              label="Other Bank Name"
              value={form.customBankName}
              disabled={creating}
              onChange={(value) => onChange("customBankName", value)}
              placeholder="Enter your bank name"
            />
          )}

          <WalletInput
            label="Bank Account Number"
            value={form.bankAccountNumber}
            disabled={creating}
            onChange={(value) => onChange("bankAccountNumber", value)}
            placeholder="Account number"
          />

          <WalletInput
            label="Account Holder"
            value={form.bankAccountHolder}
            disabled={creating}
            onChange={(value) => onChange("bankAccountHolder", value)}
            placeholder="Account holder name"
          />

          <button
            type="submit"
            disabled={creating}
            className="w-full rounded-2xl bg-green-400 px-5 py-3.5 text-sm font-black text-black transition hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? "Submitting..." : "Submit Withdrawal Request"}
          </button>
        </form>
      </div>
    </div>
  );
}

function BankSelect({ value, disabled, onChange }) {
  const [open, setOpen] = useState(false);

  const selectedLabel = value || "Select your bank";

  return (
    <div className="relative">
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-gray-400">
          Bank Name
        </span>

        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-left text-base font-bold text-white outline-none transition focus:border-green-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className={value ? "text-white" : "text-gray-600"}>
            {selectedLabel}
          </span>

          <span
            className={`material-symbols-outlined text-[22px] text-gray-400 transition ${
              open ? "rotate-180" : ""
            }`}
          >
            expand_more
          </span>
        </button>
      </label>

      {open && !disabled && (
        <div className="wallet-scrollbar-hide absolute left-0 right-0 top-[calc(100%+8px)] z-[1200] max-h-[230px] overflow-y-auto rounded-2xl border border-green-400/30 bg-[#111823] p-2 shadow-[0_22px_70px_rgba(0,0,0,0.65)]">
          {popularBanks.map((bank) => {
            const active = bank === value;

            return (
              <button
                key={bank}
                type="button"
                onClick={() => {
                  onChange(bank);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold transition ${
                  active
                    ? "bg-green-400 text-black"
                    : "text-gray-200 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <span>{bank}</span>

                {active && (
                  <span className="material-symbols-outlined text-[18px]">
                    check
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WalletInput({
  label,
  value,
  disabled,
  onChange,
  placeholder,
  type = "text",
  min,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-gray-400">
        {label}
      </span>

      <input
        type={type}
        min={min}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-base font-bold text-white outline-none transition placeholder:text-gray-600 focus:border-green-400 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function HistoryPanel({
  title,
  subtitle,
  empty,
  children,
  bodyClassName = "",
}) {
  const hasChildren = Array.isArray(children)
    ? children.length > 0
    : Boolean(children);

  return (
    <aside className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#151a22] shadow-[0_18px_55px_rgba(0,0,0,0.28)]">
      <div className="border-b border-white/10 px-6 py-5">
        <h2 className="text-xl font-black text-white">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </div>

      {!hasChildren ? (
        <div className="p-6 text-sm text-gray-400">{empty}</div>
      ) : (
        <div
          className={`wallet-scrollbar-hide divide-y divide-white/10 overflow-y-auto ${bodyClassName}`}
        >
          {children}
        </div>
      )}
    </aside>
  );
}

function WithdrawalHistoryItem({ withdrawal }) {
  return (
    <article className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-black text-white">
            {formatMoney(withdrawal.amount)}
          </p>

          <p className="mt-2 text-sm text-gray-500">
            {withdrawal.bankName || "Bank"} •{" "}
            {formatShortDate(withdrawal.createdAt)}
          </p>

          {withdrawal.bankAccountNumber && (
            <p className="mt-2 max-w-[260px] truncate text-xs text-gray-600">
              {maskBankAccount(withdrawal.bankAccountNumber)}
            </p>
          )}

          <p className="mt-2 text-xs text-gray-500">
            {getWithdrawalStatusMessage(withdrawal.status)}
          </p>

          {withdrawal.rejectReason && (
            <p className="mt-2 text-xs text-red-300">
              {withdrawal.rejectReason}
            </p>
          )}
        </div>

        <StatusBadge status={withdrawal.status} />
      </div>
    </article>
  );
}

function DepositModal({
  amount,
  setAmount,
  order,
  remainingSeconds,
  creating,
  checking,
  onClose,
  onSubmit,
  onCheckStatus,
  onCopy,
  onGenerateNew,
  onContinueCredits,
}) {
  const isPaid = isPaidDepositStatus(order?.status);
  const isFailed = isFailedDepositStatus(order?.status);
  const isExpired = order && !isPaid && !isFailed && remainingSeconds <= 0;
  const qrSource = getQrSource(order);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 px-4 py-4 backdrop-blur-sm">
      <div className="wallet-scrollbar-hide relative max-h-[92vh] w-full max-w-[420px] overflow-y-auto rounded-[1.4rem] border border-cyan-400/30 bg-[#0f141d] shadow-[0_35px_120px_rgba(0,0,0,0.78)]">
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div>
            <h2 className="text-xl font-black text-white">Scan QR to pay</h2>
            <p className="mt-1.5 text-xs leading-5 text-gray-500">
              Complete this payment within 2 minutes.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={creating || checking}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[24px]">
              close
            </span>
          </button>
        </div>

        <div className="px-6 pb-6 pt-5">
          {!order ? (
            <form onSubmit={onSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-gray-400">
                  Amount
                </span>

                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Enter amount in VND"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-base font-bold text-white outline-none transition placeholder:text-gray-600 focus:border-cyan-400"
                />
              </label>

              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setAmount(String(item))}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2 text-xs font-bold text-gray-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
                  >
                    {formatCompactMoney(item)}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-2xl bg-cyan-400 px-5 py-3.5 text-sm font-black text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? "Creating payment..." : "Generate Payment QR"}
              </button>
            </form>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
                <div>
                  <p className="text-xs text-gray-500">Payment time left</p>
                  <p className="mt-1 text-lg font-black text-cyan-300">
                    {formatRemainingTime(remainingSeconds)}
                  </p>
                </div>

                <StatusBadge status={order.status} />
              </div>

              {!isExpired ? (
  <div className="mx-auto mb-4 flex h-[220px] w-[220px] items-center justify-center rounded-xl bg-white p-3">
    {qrSource ? (
      <img
        src={qrSource}
        alt="Payment QR Code"
        className="h-full w-full object-contain"
      />
    ) : (
      <div className="text-center text-gray-700">
        <span className="material-symbols-outlined mb-2 block text-4xl">
          qr_code_2
        </span>
        <p className="text-sm font-bold">QR is not available</p>
      </div>
    )}
  </div>
) : (
  <div className="mx-auto mb-4 flex h-[220px] w-[220px] flex-col items-center justify-center rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-center">
    <span className="material-symbols-outlined mb-3 text-5xl text-red-300">
      timer_off
    </span>

    <p className="text-base font-black text-red-300">
      QR code expired
    </p>

    <p className="mt-2 text-xs leading-5 text-red-100/80">
      This QR code is no longer shown. Please generate a new QR for the same amount.
    </p>
  </div>
)}

              <div className="mb-4 text-center">
                <p className="text-xs text-gray-500">Amount</p>
                <p className="mt-1 text-2xl font-black text-cyan-300">
                  {formatMoney(order.amount)}
                </p>
              </div>

              <PaymentInformation order={order} onCopy={onCopy} />

              {order.paymentUrl && !isExpired && (
                <a
                  href={order.paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 flex w-full items-center justify-center rounded-2xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-3 text-sm font-black text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                >
                  Open PayOS Payment Page
                </a>
              )}

              {!isPaid && !isFailed && !isExpired && (
                <button
                  type="button"
                  onClick={onCheckStatus}
                  disabled={checking}
                  className="mt-4 w-full rounded-2xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-3 text-sm font-bold text-yellow-300 transition hover:bg-yellow-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {checking ? "Checking payment..." : "Check Payment Status"}
                </button>
              )}

              {isPaid && (
                <div className="mt-4 rounded-2xl border border-green-400/30 bg-green-400/10 p-3 text-sm font-bold text-green-300">
                  Payment confirmed. Your wallet balance has been updated.
                </div>
              )}

              {isFailed && (
                <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm font-bold text-red-300">
                  This payment order failed or expired.
                </div>
              )}

              {isExpired && (
                <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 p-3">
                  <p className="text-sm font-bold text-red-300">
                    Payment time ended
                  </p>
                  <p className="mt-1 text-xs leading-5 text-red-100/80">
                    Please generate a new QR code to continue.
                  </p>
                </div>
              )}

              {isPaid && onContinueCredits && (
                <button
                  type="button"
                  onClick={onContinueCredits}
                  className="mt-4 w-full rounded-2xl bg-purple-400 px-4 py-3 text-sm font-black text-black transition hover:bg-purple-300"
                >
                  Continue Buying Credits
                </button>
              )}

              {isExpired ? (
                <button
                  type="button"
                  onClick={onGenerateNew}
                  className="mt-4 w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-black text-black transition hover:bg-cyan-300"
                >
                  Generate New QR
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={creating || checking}
                  className="mt-4 w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-gray-300 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Back to Wallet
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FloatingDepositButton({ order, remainingSeconds, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed bottom-6 right-6 z-[900] flex items-center gap-3 rounded-2xl border border-cyan-400/40 bg-[#111823] px-5 py-4 text-left shadow-[0_18px_60px_rgba(0,0,0,0.45)] transition hover:-translate-y-0.5 hover:border-cyan-300"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
        <span className="material-symbols-outlined">qr_code_2</span>
      </div>

      <div>
        <p className="text-sm font-black text-white">Payment Pending</p>
        <p className="mt-0.5 text-xs font-bold text-cyan-300">
          {formatMoney(order?.amount)} • {formatRemainingTime(remainingSeconds)}
        </p>
      </div>
    </button>
  );
}

function PaymentInformation({ order, onCopy }) {
  const accountName = order?.accountName || "";
  const accountNumber = order?.accountNumber || "";
  const transferContent = order?.transferContent || "";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      {accountName && (
        <PaymentInfoRow
          label="Account holder"
          value={accountName}
          copyable={false}
          onCopy={onCopy}
        />
      )}

      {accountNumber && (
        <PaymentInfoRow
          label="Account number"
          value={accountNumber}
          copyable
          onCopy={onCopy}
        />
      )}

      <PaymentInfoRow
        label="Amount"
        value={formatMoney(order?.amount)}
        copyable
        onCopy={onCopy}
      />

      {transferContent && (
        <PaymentInfoRow
          label="Transfer content"
          value={transferContent}
          copyable
          onCopy={onCopy}
          last
        />
      )}
    </div>
  );
}

function PaymentInfoRow({ label, value, copyable, onCopy, last = false }) {
  return (
    <div
      className={`flex items-start justify-between gap-4 ${last ? "" : "mb-3"}`}
    >
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}:</p>
        <p className="mt-1 break-words text-sm font-black text-white">
          {value}
        </p>
      </div>

      {copyable && (
        <button
          type="button"
          onClick={() => onCopy(value)}
          className="shrink-0 rounded-xl bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
        >
          Copy
        </button>
      )}
    </div>
  );
}

function BalanceCard({ label, value, icon, tone, description }) {
  const toneClass =
    tone === "cyan"
      ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
      : tone === "purple"
      ? "border-purple-400/20 bg-purple-400/10 text-purple-300"
      : tone === "green"
      ? "border-green-400/20 bg-green-400/10 text-green-300"
      : tone === "yellow"
      ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
      : "border-red-400/20 bg-red-400/10 text-red-300";

  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-[#151a22] p-7 shadow-[0_15px_45px_rgba(0,0,0,0.22)]">
      <div
        className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border ${toneClass}`}
      >
        <span className="material-symbols-outlined text-[28px]">{icon}</span>
      </div>

      <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">
        {label}
      </p>

      <p className="mt-4 text-3xl font-black text-white">{value}</p>

      {description && (
        <p className="mt-3 text-xs leading-5 text-gray-500">{description}</p>
      )}
    </article>
  );
}

function TableHead({ children }) {
  return (
    <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.22em] text-gray-500">
      {children}
    </th>
  );
}

function TransactionRow({ transaction, onOpenMilestone }) {
  const ui = transaction.ui;

  return (
    <tr className="border-b border-white/10 transition hover:bg-white/[0.025]">
      <td className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl border ${ui.iconClass}`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {ui.icon}
            </span>
          </div>

          <span className="font-bold text-gray-300">{ui.typeLabel}</span>
        </div>
      </td>

      <td className="px-6 py-5">
        <p className="max-w-[360px] truncate font-semibold text-white">
          {ui.description}
        </p>

        {transaction.milestoneId && (
          <button
            type="button"
            onClick={() => onOpenMilestone(transaction.milestoneId)}
            className="mt-2 text-xs font-bold text-cyan-300 transition hover:text-cyan-200"
          >
            View milestone
          </button>
        )}
      </td>

      <td className="px-6 py-5 text-gray-400">
        {formatShortDate(transaction.createdAt)}
      </td>

      <td className="px-6 py-5">
        <span className={`font-black ${ui.amountClass}`}>
          {ui.sign}
          {formatMoney(transaction.amount)}
        </span>
      </td>

      <td className="px-6 py-5">
        <StatusBadge status={transaction.status} />
      </td>
    </tr>
  );
}

function DepositHistoryItem({ order, checking, onOpen, onCheck }) {
  const isPaid = isPaidDepositStatus(order.status);
  const isFinal = isFinalDepositStatus(order.status);
  const remain = getDepositRemainingSeconds(order.createdAt);
  const isLocalExpired =
    String(order.status || "").toUpperCase() === "PENDING" && remain <= 0;

  const canViewPayment = !isLocalExpired && !isPaid && !isFinal && remain > 0;
  const displayStatus = isLocalExpired ? "EXPIRED" : order.status;

  return (
    <article className="p-6">
      <div className="flex w-full items-start justify-between gap-4 text-left">
        <div>
          <p className="text-lg font-black text-white">
            {formatMoney(order.amount)}
          </p>

          <p className="mt-2 text-sm text-gray-500">
            PayOS • {formatShortDate(order.createdAt)}
          </p>

          {order.transferContent && (
            <p className="mt-2 max-w-[260px] truncate text-xs text-gray-600">
              {order.transferContent}
            </p>
          )}

          {canViewPayment && (
            <p className="mt-3 text-xs font-bold text-cyan-300">
              Time left: {formatRemainingTime(remain)}
            </p>
          )}

    
        </div>

        <StatusBadge status={displayStatus} />
      </div>

      {canViewPayment && (
        <button
          type="button"
          onClick={onOpen}
          className="mt-4 w-full rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
        >
          View Payment QR
        </button>
      )}

      {canViewPayment && order.depositOrderId && (
        <button
          type="button"
          onClick={onCheck}
          disabled={checking}
          className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-bold text-gray-300 transition hover:border-cyan-400/40 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {checking ? "Checking..." : "Check Status"}
        </button>
      )}
    </article>
  );
}

function StatusBadge({ status }) {
  const value = String(status || "").toUpperCase();

  const style =
    isSuccessStatus(value)
      ? "border-green-400/20 bg-green-400/10 text-green-300"
      : value === "PENDING" || value === "PROCESSING" || value === "WAITING"
      ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
      : "border-red-400/20 bg-red-400/10 text-red-300";

  return (
    <span
      className={`rounded-lg border px-3 py-1 text-xs font-black uppercase ${style}`}
    >
      {formatStatusForUser(value)}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="p-12 text-center">
      <span className="material-symbols-outlined mb-3 block text-5xl text-gray-600">
        receipt_long
      </span>

      <h3 className="text-lg font-bold text-white">No transactions yet</h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">
        Your wallet activity will appear here when deposits, payments, or
        withdrawals are completed.
      </p>
    </div>
  );
}

function Alert({ type, message }) {
  const style =
    type === "success"
      ? "border-green-500/30 bg-green-500/10 text-green-300"
      : "border-red-500/30 bg-red-500/10 text-red-300";

  return (
    <div className={`mb-5 rounded-2xl border px-5 py-4 text-sm ${style}`}>
      {message}
    </div>
  );
}

function getTransactionPresentation(transaction) {
  const type = String(transaction.type || "").toUpperCase();
  const signedAmount = Number(
    transaction.signedAmount || transaction.amount || 0
  );

  if (type.includes("DEPOSIT") || type.includes("TOP_UP")) {
    return {
      group: "DEPOSIT",
      typeLabel: "Deposit",
      description: "Wallet deposit confirmed",
      icon: "add_card",
      iconClass: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
      sign: "+",
      amountClass: "text-cyan-300",
    };
  }

  if (type.includes("WITHDRAW")) {
    return {
      group: "WITHDRAW",
      typeLabel: "Withdrawal",
      description: cleanDescription(
        transaction.description,
        "Wallet withdrawal"
      ),
      icon: "account_balance",
      iconClass: "border-orange-400/20 bg-orange-400/10 text-orange-300",
      sign: "-",
      amountClass: "text-red-300",
    };
  }

  if (
    type.includes("PENDING_EARNING") ||
    type.includes("EXPERT_PENDING") ||
    type.includes("MILESTONE_APPROVED")
  ) {
    return {
      group: "PENDING",
      typeLabel: "Pending Earning",
      description: cleanDescription(
        transaction.description,
        "Milestone approved. Earnings are pending project completion."
      ),
      icon: "hourglass_top",
      iconClass: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
      sign: "+",
      amountClass: "text-yellow-300",
    };
  }

  if (
    type.includes("EARNING") ||
    type.includes("ESCROW_RECEIVE") ||
    type.includes("ESCROW_RELEASE") ||
    type.includes("MILESTONE")
  ) {
    const isOutgoing = signedAmount < 0 || transaction.direction === "OUT";

    return {
      group: isOutgoing ? "PAYMENT" : "INCOME",
      typeLabel: isOutgoing ? "Escrow Payment" : "Expert Earning",
      description: cleanDescription(
        transaction.description,
        isOutgoing
          ? "Escrow payment released"
          : transaction.milestoneId
          ? `Payment received for Milestone ${transaction.milestoneId}`
          : "Expert earning received"
      ),
      icon: isOutgoing ? "logout" : "paid",
      iconClass: isOutgoing
        ? "border-red-400/20 bg-red-400/10 text-red-300"
        : "border-green-400/20 bg-green-400/10 text-green-300",
      sign: isOutgoing ? "-" : "+",
      amountClass: isOutgoing ? "text-red-300" : "text-green-300",
    };
  }

  if (
    type.includes("PACKAGE") ||
    type.includes("PROPOSAL_PACKAGE") ||
    type.includes("SUBSCRIPTION") ||
    type.includes("PURCHASE")
  ) {
    return {
      group: "PAYMENT",
      typeLabel: "Package Purchase",
      description: cleanDescription(
        transaction.description,
        "Proposal package purchase"
      ),
      icon: "shopping_bag",
      iconClass: "border-purple-400/20 bg-purple-400/10 text-purple-300",
      sign: "-",
      amountClass: "text-red-300",
    };
  }

  if (type.includes("FEE")) {
    return {
      group: "FEE",
      typeLabel: "Expert Service Fee",
      description: cleanDescription(
        transaction.description,
        "Service fee deducted from released milestone payment"
      ),
      icon: "percent",
      iconClass: "border-red-400/20 bg-red-400/10 text-red-300",
      sign: "-",
      amountClass: "text-red-300",
    };
  }

  const isOut = transaction.direction === "OUT" || signedAmount < 0;

  return {
    group: isOut ? "PAYMENT" : "INCOME",
    typeLabel: isOut ? "Payment" : "Income",
    description: cleanDescription(transaction.description, "Wallet transaction"),
    icon: isOut ? "north_east" : "south_west",
    iconClass: isOut
      ? "border-red-400/20 bg-red-400/10 text-red-300"
      : "border-green-400/20 bg-green-400/10 text-green-300",
    sign: isOut ? "-" : "+",
    amountClass: isOut ? "text-red-300" : "text-green-300",
  };
}

function getWithdrawalStatusMessage(status) {
  const value = String(status || "").toUpperCase();

  if (value === "PENDING") {
    return "Your amount is on hold and waiting for payout processing.";
  }

  if (value === "PROCESSING") {
    return "Your payout is being processed.";
  }

  if (["PAID", "SUCCESS", "COMPLETED", "CONFIRMED", "APPROVED"].includes(value)) {
    return "This withdrawal has been paid.";
  }

  if (["FAILED", "REJECTED", "CANCELLED", "CANCELED"].includes(value)) {
    return "This withdrawal was not completed.";
  }

  return formatFriendlyStatus(value);
}

function cleanDescription(description, fallback) {
  if (!description) return fallback;

  return String(description)
    .replace(/\[.*?\]\s*/g, "")
    .replace(/_/g, " ")
    .trim();
}

function getQrSource(order) {
  if (!order) return "";

  const image = order.qrImageUrl || "";

  if (image) return image;

  const qrCode = order.qrCode || "";

  if (!qrCode) return "";

  if (qrCode.startsWith("data:image")) return qrCode;

  if (qrCode.startsWith("http://") || qrCode.startsWith("https://")) {
    return qrCode;
  }

  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    qrCode
  )}`;
}

function isPaidDepositStatus(status) {
  return isSuccessStatus(status);
}

function isSuccessStatus(status) {
  const value = String(status || "").toUpperCase();

  return [
    "SUCCESS",
    "COMPLETED",
    "PAID",
    "RELEASED",
    "CONFIRMED",
    "APPROVED",
  ].includes(value);
}

function isFailedDepositStatus(status) {
  const value = String(status || "").toUpperCase();

  return ["FAILED", "CANCELLED", "CANCELED", "EXPIRED", "REJECTED"].includes(
    value
  );
}

function isFinalDepositStatus(status) {
  return isPaidDepositStatus(status) || isFailedDepositStatus(status);
}

function formatStatusForUser(status) {
  const value = String(status || "").toUpperCase();

  if (isSuccessStatus(value)) return "Success";

  if (["PENDING", "PROCESSING", "WAITING"].includes(value)) {
    return "Pending";
  }

  if (
    ["FAILED", "CANCELLED", "CANCELED", "EXPIRED", "REJECTED"].includes(value)
  ) {
    return "Failed";
  }

  return formatFriendlyStatus(value);
}

function formatFriendlyStatus(status) {
  return String(status || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getDepositRemainingSeconds(createdAt) {
  if (!createdAt) return DEPOSIT_EXPIRE_SECONDS;

  const createdTime = new Date(createdAt).getTime();

  if (Number.isNaN(createdTime)) return DEPOSIT_EXPIRE_SECONDS;

  const elapsedSeconds = Math.floor((Date.now() - createdTime) / 1000);

  return Math.max(DEPOSIT_EXPIRE_SECONDS - elapsedSeconds, 0);
}

function formatRemainingTime(seconds) {
  const safeSeconds = Math.max(Number(seconds || 0), 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatCompactMoney(value) {
  const number = Number(value || 0);

  if (number >= 1000000) return `${number / 1000000}M`;
  if (number >= 1000) return `${number / 1000}K`;

  return formatMoney(number);
}

function formatShortDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("vi-VN");
}

function maskBankAccount(value) {
  const text = String(value || "");

  if (text.length <= 4) return text;

  return `${"*".repeat(Math.max(text.length - 4, 0))}${text.slice(-4)}`;
}


function isActiveDepositOrder(order) {
  if (!order) return false;

  const status = String(order.status || "").toUpperCase();

  return (
    ["PENDING", "PROCESSING", "WAITING"].includes(status) &&
    getDepositRemainingSeconds(order.createdAt) > 0
  );
}

function getFriendlyError(err, fallback) {
  const data = err?.response?.data;

  if (typeof data === "string") return data;

  return data?.message || data?.title || err?.message || fallback;
}