import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminWithdrawalService from "../../../services/adminWithdrawal.service";

const STATUS_OPTIONS = ["ALL", "PENDING", "APPROVED", "REJECTED", "COMPLETED"];

const EMPTY_ACTION = {
  type: "",
  withdrawal: null,
};

const EMPTY_FORM = {
  reason: "",
};

export default function ManageWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [action, setAction] = useState(EMPTY_ACTION);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const filteredWithdrawals = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return withdrawals.filter((withdrawal) => {
      const status = String(withdrawal.status || "PENDING").toUpperCase();

      const matchSearch =
        !search ||
        String(withdrawal.withdrawalRequestId || "")
          .toLowerCase()
          .includes(search) ||
        String(withdrawal.expertName || "").toLowerCase().includes(search) ||
        String(withdrawal.expertEmail || "").toLowerCase().includes(search) ||
        String(withdrawal.bankName || "").toLowerCase().includes(search) ||
        String(withdrawal.bankAccountNumber || "")
          .toLowerCase()
          .includes(search);

      const matchStatus = statusFilter === "ALL" || status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [withdrawals, keyword, statusFilter]);

  const stats = useMemo(() => {
    return withdrawals.reduce(
      (result, withdrawal) => {
        const status = String(withdrawal.status || "PENDING").toUpperCase();
        const amount = Number(withdrawal.amount || 0);

        result.total += 1;
        result.totalAmount += amount;

        if (status === "PENDING") {
          result.pending += 1;
          result.pendingAmount += amount;
        }

        if (status === "APPROVED" || status === "COMPLETED") {
          result.approved += 1;
          result.approvedAmount += amount;
        }

        if (status === "REJECTED") {
          result.rejected += 1;
        }

        return result;
      },
      {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        totalAmount: 0,
        pendingAmount: 0,
        approvedAmount: 0,
      }
    );
  }, [withdrawals]);

  const loadWithdrawals = async ({ keepMessage = false } = {}) => {
    try {
      setLoading(true);
      setError("");

      if (!keepMessage) {
        setSuccess("");
      }

      const data = await adminWithdrawalService.getWithdrawals();
      setWithdrawals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("LOAD WITHDRAWALS ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load withdrawal requests."));
    } finally {
      setLoading(false);
    }
  };

  const openApproveModal = (withdrawal) => {
    setAction({
      type: "APPROVE",
      withdrawal,
    });

    setForm({
      reason: "Approve withdrawal request.",
    });

    setError("");
    setSuccess("");
  };

  const openRejectModal = (withdrawal) => {
    setAction({
      type: "REJECT",
      withdrawal,
    });

    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
  };

  const closeActionModal = () => {
    if (actionLoading) return;

    setAction(EMPTY_ACTION);
    setForm(EMPTY_FORM);
  };

  const handleApprove = async () => {
    if (!action.withdrawal?.withdrawalRequestId) return;

    if (!form.reason.trim()) {
      setError("Please enter an approval reason.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      await adminWithdrawalService.approveWithdrawal(
        action.withdrawal.withdrawalRequestId,
        {
          reason: form.reason,
        }
      );

      const id = action.withdrawal.withdrawalRequestId;

      closeActionModal();
      await loadWithdrawals({ keepMessage: true });
      setSuccess(`Withdrawal request #${id} has been approved.`);
    } catch (err) {
      console.error("APPROVE WITHDRAWAL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot approve withdrawal request."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!action.withdrawal?.withdrawalRequestId) return;

    if (!form.reason.trim()) {
      setError("Please enter a rejection reason.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      await adminWithdrawalService.rejectWithdrawal(
        action.withdrawal.withdrawalRequestId,
        {
          reason: form.reason,
        }
      );

      const id = action.withdrawal.withdrawalRequestId;

      closeActionModal();
      await loadWithdrawals({ keepMessage: true });
      setSuccess(`Withdrawal request #${id} has been rejected.`);
    } catch (err) {
      console.error("REJECT WITHDRAWAL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot reject withdrawal request."));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
              Withdrawal Management
            </p>

            <h1 className="text-3xl font-bold text-white md:text-4xl">
              Manage withdrawals
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Review expert withdrawal requests, verify payment details, and
              approve or reject payout requests.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadWithdrawals()}
            disabled={loading || actionLoading}
            className="w-fit rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {error && (
          <Alert
            type="danger"
            title="Action failed"
            message={error}
            onClose={() => setError("")}
          />
        )}

        {success && (
          <Alert
            type="success"
            title="Success"
            message={success}
            onClose={() => setSuccess("")}
          />
        )}

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon="account_balance_wallet"
            label="Total Requests"
            value={stats.total}
            description={formatMoney(stats.totalAmount)}
            tone="cyan"
          />

          <StatCard
            icon="pending_actions"
            label="Pending"
            value={stats.pending}
            description={formatMoney(stats.pendingAmount)}
            tone="yellow"
          />

          <StatCard
            icon="check_circle"
            label="Approved"
            value={stats.approved}
            description={formatMoney(stats.approvedAmount)}
            tone="green"
          />

          <StatCard
            icon="cancel"
            label="Rejected"
            value={stats.rejected}
            description="Rejected requests"
            tone="red"
          />
        </section>

        <section className="mb-6 rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px]">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
                Search
              </label>

              <div className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4">
                <span className="material-symbols-outlined text-[20px] text-gray-500">
                  search
                </span>

                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Search by expert, email, bank, account number, or request id..."
                  className="h-full flex-1 bg-transparent text-sm text-white outline-none placeholder:text-gray-600"
                />
              </div>
            </div>

            <FilterSelect
              label="Status"
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={setStatusFilter}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
          <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">
                Withdrawal Requests
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Showing {filteredWithdrawals.length} of {withdrawals.length} records.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-400">
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                hourglass_empty
              </span>
              Loading withdrawal requests...
            </div>
          ) : filteredWithdrawals.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-white/10">
              {filteredWithdrawals.map((withdrawal) => (
                <WithdrawalRow
                  key={withdrawal.withdrawalRequestId || withdrawal.id}
                  withdrawal={withdrawal}
                  disabled={actionLoading}
                  onApprove={() => openApproveModal(withdrawal)}
                  onReject={() => openRejectModal(withdrawal)}
                />
              ))}
            </div>
          )}
        </section>

        {action.type === "APPROVE" && (
          <ActionModal
            title="Approve Withdrawal"
            subtitle={`Request #${action.withdrawal?.withdrawalRequestId || "N/A"}`}
            confirmLabel="Approve Request"
            confirmTone="green"
            loading={actionLoading}
            onClose={closeActionModal}
            onConfirm={handleApprove}
          >
            <WithdrawalSummary withdrawal={action.withdrawal} />

            <TextArea
              label="Approval Reason"
              value={form.reason}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  reason: value,
                }))
              }
              placeholder="Example: Payment details verified."
            />
          </ActionModal>
        )}

        {action.type === "REJECT" && (
          <ActionModal
            title="Reject Withdrawal"
            subtitle={`Request #${action.withdrawal?.withdrawalRequestId || "N/A"}`}
            confirmLabel="Reject Request"
            confirmTone="red"
            loading={actionLoading}
            onClose={closeActionModal}
            onConfirm={handleReject}
          >
            <WithdrawalSummary withdrawal={action.withdrawal} />

            <TextArea
              label="Rejection Reason"
              value={form.reason}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  reason: value,
                }))
              }
              placeholder="Example: Bank account information is invalid."
            />
          </ActionModal>
        )}
      </div>
    </AdminLayout>
  );
}

function WithdrawalRow({ withdrawal, disabled, onApprove, onReject }) {
  const status = String(withdrawal.status || "PENDING").toUpperCase();
  const canReview = status === "PENDING";

  return (
    <article className="p-5 transition hover:bg-white/[0.02]">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_170px_180px_230px] xl:items-center">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <Badge label={`Request #${withdrawal.withdrawalRequestId || "N/A"}`} />
            {withdrawal.paymentMethod && <Badge label={withdrawal.paymentMethod} />}
          </div>

          <h3 className="line-clamp-1 font-bold text-white">
            {withdrawal.expertName || "Expert"}
          </h3>

          <p className="mt-1 text-sm text-gray-400">
            {withdrawal.expertEmail || "No email"}
          </p>

          <p className="mt-2 text-xs text-gray-500">
            {withdrawal.bankName || "No bank"} ·{" "}
            {maskAccountNumber(withdrawal.bankAccountNumber)}
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            Amount
          </p>

          <p className="text-lg font-extrabold text-white">
            {formatMoney(withdrawal.amount, withdrawal.currency)}
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            Created
          </p>

          <p className="text-sm font-bold text-white">
            {formatDate(withdrawal.createdAt)}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
          <button
            type="button"
            onClick={onApprove}
            disabled={disabled || !canReview}
            className="rounded-xl border border-green-400/40 bg-green-400/10 px-4 py-2 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            Approve
          </button>

          <button
            type="button"
            onClick={onReject}
            disabled={disabled || !canReview}
            className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>

      {(withdrawal.adminNote || withdrawal.rejectionReason) && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/10 p-4 text-sm text-gray-400">
          {withdrawal.adminNote && (
            <p>
              <span className="font-bold text-cyan-300">Admin note:</span>{" "}
              {withdrawal.adminNote}
            </p>
          )}

          {withdrawal.rejectionReason && (
            <p className="mt-1">
              <span className="font-bold text-red-300">Rejection reason:</span>{" "}
              {withdrawal.rejectionReason}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function WithdrawalSummary({ withdrawal }) {
  if (!withdrawal) return null;

  return (
    <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <InfoBox label="Expert" value={withdrawal.expertName || "Expert"} />
        <InfoBox
          label="Amount"
          value={formatMoney(withdrawal.amount, withdrawal.currency)}
        />
        <InfoBox label="Bank" value={withdrawal.bankName || "N/A"} />
        <InfoBox
          label="Account Number"
          value={withdrawal.bankAccountNumber || "N/A"}
        />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, description, tone = "cyan" }) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    green: "border-green-400/20 bg-green-400/10 text-green-300",
    yellow: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
    red: "border-red-400/20 bg-red-400/10 text-red-300",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${
          toneClass[tone] || toneClass.cyan
        }`}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>

      <p className="mt-2 text-3xl font-bold text-white">{formatNumber(value)}</p>

      <p className="mt-2 text-sm text-gray-400">{description}</p>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-white/10 bg-[#0d1117] px-4 text-sm font-bold text-white outline-none focus:border-cyan-400/50"
      >
        {options.map((item) => (
          <option key={item} value={item}>
            {formatLabel(item)}
          </option>
        ))}
      </select>
    </div>
  );
}

function ActionModal({
  title,
  subtitle,
  children,
  confirmLabel,
  confirmTone = "cyan",
  loading,
  onClose,
  onConfirm,
}) {
  const confirmClass =
    confirmTone === "red"
      ? "border-red-400/50 bg-red-400/10 text-red-300 hover:bg-red-400 hover:text-black"
      : confirmTone === "green"
      ? "border-green-400/50 bg-green-400/10 text-green-300 hover:bg-green-400 hover:text-black"
      : "border-cyan-400/50 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400 hover:text-black";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#151a22] shadow-2xl">
        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
        </div>

        <div className="px-6 py-5">{children}</div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-xl border px-5 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-gray-600 focus:border-cyan-400/50"
      />
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-bold text-white">
        {value || "N/A"}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const value = String(status || "PENDING").toUpperCase();

  const className =
    value === "APPROVED" || value === "COMPLETED"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : value === "REJECTED"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${className}`}
    >
      {formatLabel(value)}
    </span>
  );
}

function Badge({ label }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-gray-400">
      {label}
    </span>
  );
}

function Alert({ type, title, message, onClose }) {
  const className =
    type === "success"
      ? "border-green-500/30 bg-green-500/10 text-green-200"
      : "border-red-500/30 bg-red-500/10 text-red-200";

  return (
    <div className={`mb-5 rounded-xl border px-5 py-4 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold">{title}</p>
          <p className="mt-1 text-sm opacity-90">{message}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-sm font-bold opacity-70 hover:opacity-100"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-12 text-center">
      <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
        account_balance_wallet
      </span>

      <h3 className="text-lg font-bold text-white">No withdrawals found</h3>

      <p className="mt-2 text-sm text-gray-400">
        Try changing the search keyword or status filter.
      </p>
    </div>
  );
}

function maskAccountNumber(value) {
  if (!value) return "No account number";

  const text = String(value);

  if (text.length <= 4) return text;

  return `•••• ${text.slice(-4)}`;
}

function formatMoney(value, currency = "USD") {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(Number.isNaN(number) ? 0 : number);
}

function formatNumber(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US").format(
    Number.isNaN(number) ? 0 : number
  );
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatLabel(value) {
  if (!value) return "N/A";

  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getFriendlyError(err, fallback = "Something went wrong.") {
  const status = err?.response?.status;

  if (status === 401) {
    return "Your session has expired. Please login again.";
  }

  if (status === 403) {
    return "Backend blocked this request because the current token does not have ADMIN permission.";
  }

  if (status === 404) {
    return "Admin withdrawals API was not found. Please check backend route.";
  }

  const data = err?.response?.data;

  if (typeof data === "string") return data;
  if (data?.message) return data.message;
  if (data?.title) return data.title;
  if (data?.detail) return data.detail;

  if (data?.errors) {
    const allErrors = Object.values(data.errors).flat();

    if (allErrors.length > 0) {
      return allErrors.join(" ");
    }
  }

  return err?.message || fallback;
}