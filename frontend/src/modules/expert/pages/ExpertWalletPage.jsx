import { useEffect, useMemo, useState } from "react";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import expertWalletService from "../../../services/expertWallet.service";

const initialWithdrawForm = {
  amount: "",
  bankName: "",
  bankAccountNumber: "",
  bankAccountHolder: "",
};

export default function ExpertWalletPage() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);

  const [withdrawForm, setWithdrawForm] = useState(initialWithdrawForm);

  const [loading, setLoading] = useState(true);
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [withdrawError, setWithdrawError] = useState("");

  useEffect(() => {
    loadWalletData();
  }, []);

  const availableBalance = Number(wallet?.availableBalance || wallet?.balance || 0);
  const lockedBalance = Number(wallet?.lockedBalance || 0);
  const totalEarning = Number(wallet?.totalEarning || wallet?.totalEarned || 0);

  const pendingWithdrawalAmount = useMemo(() => {
    return withdrawals
      .filter((item) => isPendingStatus(item.status))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [withdrawals]);

  const approvedWithdrawalAmount = useMemo(() => {
    return withdrawals
      .filter((item) => isApprovedStatus(item.status))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [withdrawals]);

  const latestTransactions = useMemo(() => {
    return [...transactions].slice(0, 8);
  }, [transactions]);

  const latestWithdrawals = useMemo(() => {
    return [...withdrawals].slice(0, 6);
  }, [withdrawals]);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const overview = await expertWalletService.getWalletOverview();

      setWallet(overview.wallet);
      setTransactions(Array.isArray(overview.transactions) ? overview.transactions : []);
      setWithdrawals(Array.isArray(overview.withdrawals) ? overview.withdrawals : []);
    } catch (err) {
      console.error("LOAD EXPERT WALLET ERROR:", err?.response?.data || err);

      setError(getFriendlyError(err, "Cannot load wallet data."));
      setWallet(null);
      setTransactions([]);
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  };

  const openWithdrawModal = () => {
    setWithdrawForm(initialWithdrawForm);
    setWithdrawError("");
    setError("");
    setMessage("");
    setShowWithdrawModal(true);
  };

  const closeWithdrawModal = () => {
    if (submittingWithdraw) return;

    setShowWithdrawModal(false);
    setWithdrawForm(initialWithdrawForm);
    setWithdrawError("");
  };

  const updateWithdrawField = (name, value) => {
    setWithdrawError("");

    setWithdrawForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmitWithdraw = async (event) => {
    event.preventDefault();

    setWithdrawError("");
    setError("");
    setMessage("");

    const validationError = validateWithdrawForm(withdrawForm, availableBalance);

    if (validationError) {
      setWithdrawError(validationError);
      return;
    }

    try {
      setSubmittingWithdraw(true);

      await expertWalletService.requestWithdraw(withdrawForm);

      setWithdrawForm(initialWithdrawForm);
      setShowWithdrawModal(false);
      setMessage(
        "Payout request submitted successfully. You will be notified after review."
      );

      const overview = await expertWalletService.getWalletOverview();

      setWallet(overview.wallet);
      setTransactions(Array.isArray(overview.transactions) ? overview.transactions : []);
      setWithdrawals(Array.isArray(overview.withdrawals) ? overview.withdrawals : []);
    } catch (err) {
      console.error("CREATE WITHDRAWAL ERROR:", err?.response?.data || err);

      setWithdrawError(getFriendlyError(err, "Cannot submit payout request."));
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="mb-8 overflow-hidden rounded-3xl border border-white/10 bg-[#151a22] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="relative p-6 md:p-8">
              <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-green-400/10 blur-3xl" />
              <div className="absolute bottom-0 right-28 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />

              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                    Expert Wallet
                  </p>

                  <h1 className="max-w-3xl text-3xl font-extrabold leading-tight text-white md:text-5xl">
                    Manage your earnings and payouts
                  </h1>

                  <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-400">
                    Track released project earnings, pending payouts, and wallet
                    activity in one secure workspace.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={openWithdrawModal}
                    disabled={loading || availableBalance <= 0}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-400/50 bg-green-400/10 px-5 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      payments
                    </span>
                    Request Payout
                  </button>

                  <button
                    type="button"
                    onClick={loadWalletData}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      refresh
                    </span>
                    {loading ? "Refreshing..." : "Refresh"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {message && (
            <Alert type="success" title="Success" message={message} />
          )}

          {error && (
            <Alert type="danger" title="Wallet error" message={error} />
          )}

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-[#151a22] p-12 text-center text-gray-400">
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                hourglass_empty
              </span>
              Loading wallet data...
            </div>
          ) : (
            <>
              <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  icon="account_balance_wallet"
                  label="Available Balance"
                  value={formatMoney(availableBalance)}
                  description="Ready for payout"
                  tone="green"
                />

                <SummaryCard
                  icon="lock"
                  label="Locked Balance"
                  value={formatMoney(lockedBalance)}
                  description="Held for ongoing work"
                  tone="yellow"
                />

                <SummaryCard
                  icon="schedule"
                  label="Pending Payout"
                  value={formatMoney(pendingWithdrawalAmount)}
                  description="Waiting for review"
                  tone="cyan"
                />

                <SummaryCard
                  icon="trending_up"
                  label="Total Earnings"
                  value={formatMoney(totalEarning)}
                  description="Lifetime released earnings"
                  tone="purple"
                />
              </section>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_390px]">
                <section className="rounded-3xl border border-white/10 bg-[#151a22] p-6 md:p-8">
                  <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-xl font-extrabold text-white">
                        Wallet Activity
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        Recent wallet movements from project payments and payouts.
                      </p>
                    </div>

                    <span className="w-fit rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                      {transactions.length} item(s)
                    </span>
                  </div>

                  {latestTransactions.length === 0 ? (
                    <EmptyState
                      icon="receipt_long"
                      title="No wallet activity yet"
                      description="Payments from released milestones and payout records will appear here."
                    />
                  ) : (
                    <div className="space-y-3">
                      {latestTransactions.map((transaction, index) => (
                        <TransactionItem
                          key={transaction.transactionId || transaction.id || index}
                          transaction={transaction}
                        />
                      ))}
                    </div>
                  )}
                </section>

                <aside>
                  <section className="rounded-3xl border border-white/10 bg-[#151a22] p-6">
                    <div className="mb-6 flex items-center justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-extrabold text-white">
                          Payout Requests
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                          Recent payout request status.
                        </p>
                      </div>

                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                        {withdrawals.length}
                      </span>
                    </div>

                    {latestWithdrawals.length === 0 ? (
                      <EmptyState
                        icon="payments"
                        title="No payout requests"
                        description="Your payout requests will appear here."
                        compact
                      />
                    ) : (
                      <div className="space-y-3">
                        {latestWithdrawals.map((withdrawal, index) => (
                          <WithdrawalItem
                            key={withdrawal.withdrawalRequestId || withdrawal.id || index}
                            withdrawal={withdrawal}
                          />
                        ))}
                      </div>
                    )}

                    {approvedWithdrawalAmount > 0 && (
                      <div className="mt-5 rounded-2xl border border-green-400/20 bg-green-400/10 p-4">
                        <p className="text-xs uppercase tracking-wider text-green-300">
                          Approved payouts
                        </p>

                        <p className="mt-1 text-xl font-bold text-white">
                          {formatMoney(approvedWithdrawalAmount)}
                        </p>
                      </div>
                    )}
                  </section>
                </aside>
              </div>
            </>
          )}
        </div>
      </div>

      {showWithdrawModal && (
        <WithdrawModal
          formData={withdrawForm}
          availableBalance={availableBalance}
          submitting={submittingWithdraw}
          error={withdrawError}
          onChange={updateWithdrawField}
          onSubmit={handleSubmitWithdraw}
          onClose={closeWithdrawModal}
        />
      )}
    </ExpertLayout>
  );
}

function WithdrawModal({
  formData,
  availableBalance,
  submitting,
  error,
  onChange,
  onSubmit,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-5">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#11161f] shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-green-300">
                Payout Request
              </p>

              <h2 className="text-xl font-extrabold text-white">
                Request a payout
              </h2>

              <p className="mt-1 text-xs leading-5 text-gray-400">
                Enter your bank details to request a transfer.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-white/10 bg-white/[0.04] p-1.5 text-gray-400 transition hover:text-white disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 px-5 py-4">
          <div className="rounded-xl border border-green-400/20 bg-green-400/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-green-300">
              Available Balance
            </p>

            <p className="mt-1 text-xl font-bold text-white">
              {formatMoney(availableBalance)}
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          <Input
            label="Amount"
            type="number"
            min="1"
            value={formData.amount}
            onChange={(value) => onChange("amount", value)}
            placeholder="Enter amount"
            autoFocus
          />

          <Input
            label="Bank Name"
            value={formData.bankName}
            onChange={(value) => onChange("bankName", value)}
            placeholder="Vietcombank"
          />

          <Input
            label="Bank Account Number"
            value={formData.bankAccountNumber}
            onChange={(value) => onChange("bankAccountNumber", value)}
            placeholder="0123456789"
          />

          <Input
            label="Account Holder"
            value={formData.bankAccountHolder}
            onChange={(value) => onChange("bankAccountHolder", value)}
            placeholder="NGUYEN VAN A"
          />

          <p className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 text-[11px] leading-5 text-yellow-100">
            Please double-check your bank account before submitting. Incorrect
            information may delay your payout.
          </p>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl border border-green-400/50 bg-green-400/10 px-4 py-2.5 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, description, tone }) {
  const toneClass =
    tone === "green"
      ? "border-green-400/20 bg-green-400/10 text-green-300"
      : tone === "yellow"
      ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
      : tone === "purple"
      ? "border-purple-400/20 bg-purple-400/10 text-purple-300"
      : "border-cyan-400/20 bg-cyan-400/10 text-[#00F0FF]";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${toneClass}`}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-gray-500">{description}</p>
    </div>
  );
}

function TransactionItem({ transaction }) {
  const amount = Number(transaction.amount || 0);
  const positive = amount >= 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-cyan-400/30">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
              positive
                ? "border-green-400/20 bg-green-400/10 text-green-300"
                : "border-red-400/20 bg-red-400/10 text-red-300"
            }`}
          >
            <span className="material-symbols-outlined">
              {positive ? "south_west" : "north_east"}
            </span>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={transaction.status} />

              {transaction.type && (
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase text-cyan-300">
                  {formatTransactionType(transaction.type)}
                </span>
              )}
            </div>

            <h3 className="text-sm font-bold text-white">
              {transaction.description ||
                formatTransactionType(transaction.type) ||
                "Wallet activity"}
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              {formatDate(transaction.createdAt)}
            </p>
          </div>
        </div>

        <p
          className={`text-lg font-black ${
            positive ? "text-green-300" : "text-red-300"
          }`}
        >
          {positive ? "+" : ""}
          {formatMoney(amount)}
        </p>
      </div>
    </div>
  );
}

function WithdrawalItem({ withdrawal }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <StatusBadge status={withdrawal.status} />

        <span className="text-xs text-gray-500">
          {formatDate(withdrawal.createdAt)}
        </span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white">
            {withdrawal.bankName || "Bank account"}
          </h3>

          <p className="mt-1 text-xs text-gray-400">
            {maskBankAccount(withdrawal.bankAccountNumber)}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            {withdrawal.bankAccountHolder || "Account holder"}
          </p>

          {withdrawal.adminNote && (
            <p className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-gray-300">
              Review note: {withdrawal.adminNote}
            </p>
          )}
        </div>

        <p className="shrink-0 text-base font-black text-white">
          {formatMoney(withdrawal.amount)}
        </p>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  autoFocus = false,
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label}
      </span>

      <input
        type={type}
        min={min}
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF]"
      />
    </label>
  );
}

function EmptyState({ icon, title, description, compact = false }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.03] text-center ${
        compact ? "p-6" : "p-8"
      }`}
    >
      <span
        className={`material-symbols-outlined mb-3 block text-gray-500 ${
          compact ? "text-4xl" : "text-5xl"
        }`}
      >
        {icon}
      </span>

      <h3 className="font-bold text-white">{title}</h3>

      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const value = String(status || "PENDING").toUpperCase();
  const label = getStatusLabel(value);

  const className =
    value === "SUCCESS" ||
    value === "COMPLETED" ||
    value === "PAID" ||
    value === "APPROVED"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : value === "PENDING" || value === "LOCKED" || value === "HELD"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : value === "REJECTED" ||
        value === "FAILED" ||
        value === "CANCELLED" ||
        value === "REFUNDED"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : "border-gray-400/30 bg-gray-400/10 text-gray-300";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${className}`}
    >
      {label}
    </span>
  );
}

function validateWithdrawForm(formData, availableBalance) {
  const amount = Number(formData.amount);

  if (!formData.amount || Number.isNaN(amount)) {
    return "Amount is required.";
  }

  if (amount <= 0) {
    return "Amount must be greater than 0.";
  }

  if (availableBalance > 0 && amount > availableBalance) {
    return "Payout amount cannot be greater than available balance.";
  }

  if (!String(formData.bankName || "").trim()) {
    return "Bank name is required.";
  }

  if (!String(formData.bankAccountNumber || "").trim()) {
    return "Bank account number is required.";
  }

  if (!String(formData.bankAccountHolder || "").trim()) {
    return "Account holder is required.";
  }

  return "";
}

function isPendingStatus(status) {
  return String(status || "").toUpperCase() === "PENDING";
}

function isApprovedStatus(status) {
  return String(status || "").toUpperCase() === "APPROVED";
}

function getStatusLabel(status) {
  const value = String(status || "").toUpperCase();

  if (value === "PENDING") return "Pending";
  if (value === "APPROVED") return "Approved";
  if (value === "REJECTED") return "Rejected";
  if (value === "SUCCESS") return "Success";
  if (value === "COMPLETED") return "Completed";
  if (value === "PAID") return "Paid";
  if (value === "FAILED") return "Failed";
  if (value === "LOCKED") return "Locked";
  if (value === "HELD") return "Held";
  if (value === "REFUNDED") return "Refunded";

  return value || "Pending";
}

function formatTransactionType(type) {
  const value = String(type || "").replaceAll("_", " ").toLowerCase();

  if (!value) return "";

  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function maskBankAccount(value) {
  const text = String(value || "").trim();

  if (!text) return "Account information unavailable";
  if (text.length <= 4) return text;

  return `•••• ${text.slice(-4)}`;
}

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatDate(value) {
  if (!value) return "No date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "No date";

  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function Alert({ type, title, message }) {
  const style =
    type === "success"
      ? "border-green-500/30 bg-green-500/10 text-green-300"
      : "border-red-500/30 bg-red-500/10 text-red-300";

  return (
    <div className={`mb-5 rounded-xl border px-5 py-4 text-sm ${style}`}>
      <p className="font-bold">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}

function getFriendlyError(err, fallback) {
  const data = err?.response?.data;

  if (typeof data === "string") return data;

  return data?.message || data?.title || err?.message || fallback;
}