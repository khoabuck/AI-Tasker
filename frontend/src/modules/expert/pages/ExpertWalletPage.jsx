import { useEffect, useMemo, useState } from "react";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import expertWalletService from "../../../services/expertWallet.service";
import {
  getMoneyStatusClass,
  TRANSACTION_STATUS_LABEL,
  WITHDRAWAL_STATUS_LABEL,
} from "../../../constants/walletStatus";

const emptyWithdrawForm = {
  amount: "",
  bankName: "",
  bankAccountNumber: "",
  bankAccountName: "",
  note: "",
};

export default function ExpertWalletPage() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);

  const [formData, setFormData] = useState(emptyWithdrawForm);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadWalletData();
  }, []);

  const latestTransactions = useMemo(() => {
    return [...transactions].slice(0, 8);
  }, [transactions]);

  const latestWithdrawals = useMemo(() => {
    return [...withdrawals].slice(0, 8);
  }, [withdrawals]);

  const availableBalance = Number(wallet?.availableBalance || wallet?.balance || 0);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await expertWalletService.getWalletOverview();

      setWallet(data.wallet);
      setTransactions(data.transactions);
      setWithdrawals(data.withdrawals);
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

  const updateField = (name, value) => {
    setMessage("");
    setError("");

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateWithdrawForm = () => {
    const amount = Number(formData.amount);

    if (!formData.amount || Number.isNaN(amount)) {
      return "Withdrawal amount is required.";
    }

    if (amount <= 0) {
      return "Withdrawal amount must be greater than 0.";
    }

    if (availableBalance > 0 && amount > availableBalance) {
      return "Withdrawal amount cannot be greater than available balance.";
    }

    if (!formData.bankName.trim()) {
      return "Bank name is required.";
    }

    if (!formData.bankAccountNumber.trim()) {
      return "Bank account number is required.";
    }

    if (!formData.bankAccountName.trim()) {
      return "Bank account name is required.";
    }

    return "";
  };

  const handleSubmitWithdraw = async (event) => {
    event.preventDefault();

    const validationError = validateWithdrawForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const ok = window.confirm("Do you want to submit this withdrawal request?");

    if (!ok) return;

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      await expertWalletService.requestWithdraw(formData);

      setMessage("Withdrawal request submitted successfully.");
      setFormData(emptyWithdrawForm);

      await loadWalletData();
    } catch (err) {
      console.error("CREATE WITHDRAWAL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot create withdrawal request."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Expert Wallet
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                Wallet & withdrawals
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                View your wallet balance, transaction history, and create
                withdrawal requests.
              </p>
            </div>

            <button
              type="button"
              onClick={loadWalletData}
              disabled={loading}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {message && <Alert type="success" title="Success" message={message} />}

          {error && <Alert type="danger" title="Wallet error" message={error} />}

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-[#151a22] p-12 text-center text-gray-400">
              Loading wallet data...
            </div>
          ) : (
            <>
              <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-4">
                <SummaryCard
                  icon="account_balance_wallet"
                  label="Available Balance"
                  value={formatMoney(wallet?.availableBalance || wallet?.balance)}
                  tone="green"
                />

                <SummaryCard
                  icon="payments"
                  label="Total Balance"
                  value={formatMoney(wallet?.balance)}
                  tone="cyan"
                />

                <SummaryCard
                  icon="pending_actions"
                  label="Pending Balance"
                  value={formatMoney(wallet?.pendingBalance)}
                  tone="yellow"
                />

                <SummaryCard
                  icon="lock"
                  label="Locked Balance"
                  value={formatMoney(wallet?.lockedBalance)}
                  tone="red"
                />
              </section>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_410px]">
                <main className="space-y-6">
                  <Card title="Recent Transactions">
                    {latestTransactions.length === 0 ? (
                      <EmptyState
                        icon="receipt_long"
                        title="No transactions"
                        description="Your wallet transactions will appear here."
                      />
                    ) : (
                      <div className="space-y-4">
                        {latestTransactions.map((transaction) => (
                          <TransactionItem
                            key={transaction.transactionId}
                            transaction={transaction}
                          />
                        ))}
                      </div>
                    )}
                  </Card>

                  <Card title="Withdrawal Requests">
                    {latestWithdrawals.length === 0 ? (
                      <EmptyState
                        icon="account_balance"
                        title="No withdrawal requests"
                        description="Create your first withdrawal request using the form."
                      />
                    ) : (
                      <div className="space-y-4">
                        {latestWithdrawals.map((withdrawal) => (
                          <WithdrawalItem
                            key={withdrawal.withdrawalRequestId}
                            withdrawal={withdrawal}
                          />
                        ))}
                      </div>
                    )}
                  </Card>
                </main>

                <aside>
                  <Card title="Request Withdrawal">
                    <form onSubmit={handleSubmitWithdraw} className="space-y-5">
                      <Field label="Amount">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={formData.amount}
                          disabled={submitting}
                          onChange={(event) =>
                            updateField("amount", event.target.value)
                          }
                          placeholder="Enter amount"
                          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:opacity-50"
                        />
                      </Field>

                      <Field label="Bank Name">
                        <input
                          type="text"
                          value={formData.bankName}
                          disabled={submitting}
                          onChange={(event) =>
                            updateField("bankName", event.target.value)
                          }
                          placeholder="Example: Vietcombank"
                          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:opacity-50"
                        />
                      </Field>

                      <Field label="Bank Account Number">
                        <input
                          type="text"
                          value={formData.bankAccountNumber}
                          disabled={submitting}
                          onChange={(event) =>
                            updateField("bankAccountNumber", event.target.value)
                          }
                          placeholder="Account number"
                          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:opacity-50"
                        />
                      </Field>

                      <Field label="Bank Account Name">
                        <input
                          type="text"
                          value={formData.bankAccountName}
                          disabled={submitting}
                          onChange={(event) =>
                            updateField("bankAccountName", event.target.value)
                          }
                          placeholder="Account holder name"
                          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:opacity-50"
                        />
                      </Field>

                      <Field label="Note">
                        <textarea
                          rows={4}
                          value={formData.note}
                          disabled={submitting}
                          onChange={(event) =>
                            updateField("note", event.target.value)
                          }
                          placeholder="Optional note..."
                          className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:opacity-50"
                        />
                      </Field>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {submitting ? "Submitting..." : "Submit Withdrawal"}
                      </button>
                    </form>
                  </Card>
                </aside>
              </div>
            </>
          )}
        </div>
      </div>
    </ExpertLayout>
  );
}

function SummaryCard({ icon, label, value, tone }) {
  const toneClass = {
    green: "border-green-400/20 bg-green-400/10 text-green-300",
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    yellow: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
    red: "border-red-400/20 bg-red-400/10 text-red-300",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22] p-6">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${
          toneClass[tone] || toneClass.cyan
        }`}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-white">{value}</p>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#151a22] p-6">
      <h2 className="mb-5 text-xl font-extrabold text-white">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function TransactionItem({ transaction }) {
  const status = String(transaction.status || "").toUpperCase();

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge
              status={status}
              label={TRANSACTION_STATUS_LABEL[status] || status}
            />

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
              {transaction.type}
            </span>
          </div>

          <h3 className="font-bold text-white">
            {transaction.title || "Wallet Transaction"}
          </h3>

          <p className="mt-2 text-sm text-gray-400">
            {transaction.description || "No description."}
          </p>

          <p className="mt-2 text-xs text-gray-500">
            {formatDate(transaction.createdAt)}
          </p>
        </div>

        <p className="text-xl font-extrabold text-white">
          {formatMoney(transaction.amount)}
        </p>
      </div>
    </article>
  );
}

function WithdrawalItem({ withdrawal }) {
  const status = String(withdrawal.status || "").toUpperCase();

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge
              status={status}
              label={WITHDRAWAL_STATUS_LABEL[status] || status}
            />

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
              #{withdrawal.withdrawalRequestId}
            </span>
          </div>

          <h3 className="font-bold text-white">
            {withdrawal.bankName || "Bank Transfer"}
          </h3>

          <p className="mt-2 text-sm text-gray-400">
            {withdrawal.bankAccountName || "Account holder"} ·{" "}
            {maskBankAccount(withdrawal.bankAccountNumber)}
          </p>

          {withdrawal.adminNote && (
            <p className="mt-3 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
              {withdrawal.adminNote}
            </p>
          )}

          <p className="mt-2 text-xs text-gray-500">
            Created: {formatDate(withdrawal.createdAt)}
          </p>
        </div>

        <p className="text-xl font-extrabold text-white">
          {formatMoney(withdrawal.amount)}
        </p>
      </div>
    </article>
  );
}

function StatusBadge({ status, label }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getMoneyStatusClass(
        status
      )}`}
    >
      {label}
    </span>
  );
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
      <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
        {icon}
      </span>

      <h3 className="font-bold text-white">{title}</h3>

      <p className="mt-2 text-sm text-gray-400">{description}</p>
    </div>
  );
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

function formatMoney(value) {
  const number = Number(value || 0);

  return `$${number.toLocaleString("en-US")}`;
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString();
}

function maskBankAccount(value) {
  if (!value) return "N/A";

  const text = String(value);

  if (text.length <= 4) return text;

  return `****${text.slice(-4)}`;
}

function getFriendlyError(err, fallback) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.title ||
    err?.response?.data ||
    err?.message ||
    fallback
  );
}