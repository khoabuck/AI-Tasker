import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import expertWalletService from "../../../services/expertWallet.service";

const quickAmounts = [50000, 100000, 200000, 500000];
const PAYMENT_CHECK_INTERVAL_MS = 5000;
const DEPOSIT_EXPIRE_SECONDS = 120;

export default function ExpertWalletPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const returnTo = location.state?.returnTo || "/expert/proposal-credit-packages";
  const returnReason = location.state?.reason || "";
  const returnPackageId = location.state?.packageId || "";

  const shouldShowCreditReturn =
    returnReason === "BUY_PROPOSAL_CREDITS" ||
    returnTo === "/expert/proposal-credit-packages";

  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [depositOrders, setDepositOrders] = useState([]);

  const [depositAmount, setDepositAmount] = useState("");
  const [activeDepositOrder, setActiveDepositOrder] = useState(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositCountdown, setDepositCountdown] = useState(0);
  const [depositMinimized, setDepositMinimized] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingDeposit, setCreatingDeposit] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadWallet();
  }, []);

  useEffect(() => {
    const orderId = activeDepositOrder?.depositOrderId;

    if (!showDepositModal || !orderId) return;
    if (isFinalDepositStatus(activeDepositOrder.status)) return;

    const intervalId = window.setInterval(() => {
      checkDepositStatus(orderId, { silent: true });
    }, PAYMENT_CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
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

    return () => {
      window.clearTimeout(timeoutId);
    };
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
    return normalizedTransactions
      .filter((item) => item.ui.group === "WITHDRAW")
      .reduce((total, item) => total + Number(item.amount || 0), 0);
  }, [normalizedTransactions]);

  const latestDepositOrders = useMemo(() => {
    return depositOrders.slice(0, 6);
  }, [depositOrders]);

  const goToProposalCredits = () => {
    navigate(returnTo || "/expert/proposal-credit-packages", {
      state: {
        packageId: returnPackageId,
      },
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
    } catch (err) {
      console.error("LOAD EXPERT WALLET ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load wallet."));
      setWallet(null);
      setBalance(null);
      setTransactions([]);
      setDepositOrders([]);
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

    try {
      setError("");
      setMessage("");

      const detail = await expertWalletService.getDepositOrderById(
        order.depositOrderId
      );

      const selectedOrder = detail || order;

      setActiveDepositOrder(selectedOrder);
      setDepositCountdown(getDepositRemainingSeconds(selectedOrder?.createdAt));
      setDepositMinimized(false);
      setShowDepositModal(true);
    } catch (err) {
      console.error(
        "LOAD DEPOSIT ORDER DETAIL ERROR:",
        err?.response?.data || err
      );

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

  const handleWithdraw = () => {
    setMessage("");
    setError("Withdrawal is not available yet.");
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
          <section className="mb-10 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-4xl font-black text-white">Wallet</h1>

              <p className="mt-3 text-base text-gray-400">
                Manage your balance, deposits, and transaction history.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
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

              <button
                type="button"
                onClick={handleWithdraw}
                className="flex items-center gap-2 rounded-2xl border border-cyan-400/60 bg-transparent px-6 py-4 text-sm font-black text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
              >
                <span className="material-symbols-outlined text-[22px]">
                  account_balance_wallet
                </span>
                Withdraw
              </button>
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
            />

            <BalanceCard
              label="Escrow Balance"
              value={formatMoney(balance?.lockedBalance)}
              icon="lock_clock"
              tone="purple"
            />

            <BalanceCard
              label="Total Deposited"
              value={formatMoney(totalDeposited)}
              icon="login"
              tone="blue"
            />

            <BalanceCard
              label="Total Withdrawn"
              value={formatMoney(totalWithdrawn)}
              icon="logout"
              tone="red"
            />
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
            <div className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#151a22] shadow-[0_18px_55px_rgba(0,0,0,0.28)]">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-5">
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
                  className="text-xs font-black uppercase tracking-wider text-cyan-300 transition hover:text-cyan-200 disabled:opacity-50"
                >
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              {normalizedTransactions.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="wallet-scrollbar-hide overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left">
                    <thead className="border-b border-white/10 bg-white/[0.03]">
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

            <aside className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#151a22] shadow-[0_18px_55px_rgba(0,0,0,0.28)]">
              <div className="border-b border-white/10 px-6 py-5">
                <h2 className="text-xl font-black text-white">
                  Deposit History
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Recent QR payment orders
                </p>
              </div>

              {latestDepositOrders.length === 0 ? (
                <div className="p-6 text-sm text-gray-400">
                  No deposit orders yet.
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {latestDepositOrders.map((order, index) => (
                    <DepositHistoryItem
                      key={order.depositOrderId || index}
                      order={order}
                      checking={checkingPayment}
                      onOpen={() => openDepositOrder(order)}
                      onCheck={() => checkDepositStatus(order.depositOrderId)}
                    />
                  ))}
                </div>
              )}
            </aside>
          </section>
        </div>
      </div>

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
            setActiveDepositOrder(null);
            setDepositAmount("");
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

              {!isPaid && !isFailed && !isExpired && (
                <div className="mt-4 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-3">
                  <p className="text-sm font-bold text-yellow-200">
                    Waiting for payment confirmation
                  </p>

                  <p className="mt-1 text-xs leading-5 text-yellow-100/80">
                    You can go back to the wallet. The payment button will stay
                    available until this QR expires.
                  </p>
                </div>
              )}

              {isExpired && (
                <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 p-3">
                  <p className="text-sm font-bold text-red-300">
                    Payment QR expired
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-100/80">
                    Please generate a new QR code to continue.
                  </p>
                </div>
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
      className={`flex items-start justify-between gap-4 ${
        last ? "" : "mb-3"
      }`}
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

function BalanceCard({ label, value, icon, tone }) {
  const toneClass =
    tone === "cyan"
      ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
      : tone === "purple"
      ? "border-purple-400/20 bg-purple-400/10 text-purple-300"
      : tone === "blue"
      ? "border-blue-400/20 bg-blue-400/10 text-blue-300"
      : "border-red-400/20 bg-red-400/10 text-red-300";

  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-[#151a22] p-7 shadow-[0_15px_45px_rgba(0,0,0,0.22)]">
      <div
        className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border ${toneClass}`}
      >
        <span className="material-symbols-outlined text-[28px]">{icon}</span>
      </div>

      <p className="text-xs font-black uppercase tracking-[0.28em] text-gray-500">
        {label}
      </p>

      <p className="mt-4 text-3xl font-black text-white">{value}</p>
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

  return (
    <article className="p-6">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
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
        </div>

        <StatusBadge status={order.status} />
      </button>

      {!isPaid && !isFinal && order.depositOrderId && (
        <button
          type="button"
          onClick={onCheck}
          disabled={checking}
          className="mt-4 w-full rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
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
    isPaidDepositStatus(value) ||
    value === "SUCCESS" ||
    value === "COMPLETED" ||
    value === "PAID" ||
    value === "RELEASED"
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

  if (type.includes("PLATFORM_FEE") || type.includes("FEE")) {
    return {
      group: "FEE",
      typeLabel: "Platform Fee",
      description: cleanDescription(
        transaction.description,
        "Platform service fee"
      ),
      icon: "percent",
      iconClass: "border-red-400/20 bg-red-400/10 text-red-300",
      sign: "-",
      amountClass: "text-red-300",
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
    type.includes("ESCROW_RECEIVE") ||
    type.includes("ESCROW_RELEASE") ||
    type.includes("MILESTONE")
  ) {
    const isOutgoing = signedAmount < 0 || transaction.direction === "OUT";

    return {
      group: isOutgoing ? "PAYMENT" : "INCOME",
      typeLabel: isOutgoing ? "Escrow Payment" : "Milestone Payment",
      description: cleanDescription(
        transaction.description,
        isOutgoing
          ? "Escrow payment released"
          : transaction.milestoneId
          ? `Payment received for Milestone ${transaction.milestoneId}`
          : "Milestone payment received"
      ),
      icon: isOutgoing ? "logout" : "paid",
      iconClass: isOutgoing
        ? "border-red-400/20 bg-red-400/10 text-red-300"
        : "border-green-400/20 bg-green-400/10 text-green-300",
      sign: isOutgoing ? "-" : "+",
      amountClass: isOutgoing ? "text-red-300" : "text-green-300",
    };
  }

  if (type.includes("REFUND")) {
    return {
      group: "INCOME",
      typeLabel: "Refund",
      description: cleanDescription(transaction.description, "Wallet refund"),
      icon: "undo",
      iconClass: "border-green-400/20 bg-green-400/10 text-green-300",
      sign: "+",
      amountClass: "text-green-300",
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
  const value = String(status || "").toUpperCase();

  return ["SUCCESS", "COMPLETED", "PAID", "RELEASED", "CONFIRMED"].includes(
    value
  );
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

  if (["SUCCESS", "COMPLETED", "PAID", "RELEASED", "CONFIRMED"].includes(value)) {
    return "Success";
  }

  if (["PENDING", "PROCESSING", "WAITING"].includes(value)) {
    return "Pending";
  }

  if (["FAILED", "CANCELLED", "CANCELED", "EXPIRED", "REJECTED"].includes(value)) {
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

  if (number >= 1000000) {
    return `${number / 1000000}M`;
  }

  if (number >= 1000) {
    return `${number / 1000}K`;
  }

  return formatMoney(number);
}

function formatShortDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("vi-VN");
}

function getFriendlyError(err, fallback) {
  const data = err?.response?.data;

  if (typeof data === "string") return data;

  return data?.message || data?.title || err?.message || fallback;
}