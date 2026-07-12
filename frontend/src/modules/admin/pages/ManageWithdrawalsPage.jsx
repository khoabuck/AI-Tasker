import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminWithdrawalService from "../../../services/adminWithdrawal.service";

import { formatDateTime } from "../../../utils/dateTime.utils";
const STATUS_OPTIONS = [
  "ALL",
  "PENDING",
  "PROCESSING",
  "APPROVED",
  "COMPLETED",
  "PAID",
  "REJECTED",
  "FAILED",
];

const EMPTY_ACTION = {
  type: "",
  withdrawal: null,
};

const EMPTY_FORM = {
  reason: "",
};

export default function ManageWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [payosBalance, setPayosBalance] = useState(null);

  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceChecked, setBalanceChecked] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalError, setModalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [action, setAction] = useState(EMPTY_ACTION);
  const [form, setForm] = useState(EMPTY_FORM);
  const [syncTarget, setSyncTarget] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    if (!success) return;

    const timeoutId = window.setTimeout(() => {
      setSuccess("");
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [success]);

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const filteredWithdrawals = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return withdrawals.filter((withdrawal) => {
      const status = String(withdrawal.status || "PENDING").toUpperCase();

      const matchSearch =
        !search ||
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

        if (status === "PROCESSING") {
          result.processing += 1;
          result.processingAmount += amount;
        }

        if (["APPROVED", "COMPLETED", "PAID", "SUCCESS"].includes(status)) {
          result.approved += 1;
          result.approvedAmount += amount;
        }

        if (["REJECTED", "FAILED", "CANCELLED", "CANCELED"].includes(status)) {
          result.rejected += 1;
        }

        return result;
      },
      {
        total: 0,
        pending: 0,
        processing: 0,
        approved: 0,
        rejected: 0,
        totalAmount: 0,
        pendingAmount: 0,
        processingAmount: 0,
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

      const withdrawalData = await adminWithdrawalService.getWithdrawals();

      setWithdrawals(Array.isArray(withdrawalData) ? withdrawalData : []);
    } catch (err) {
      console.error("LOAD WITHDRAWALS ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load withdrawal requests."));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckPayosBalance = async () => {
    try {
      setBalanceLoading(true);
      setError("");
      setSuccess("");
      setModalError("");
      setFieldErrors({});

      const data = await adminWithdrawalService.getPayosBalance();

      setPayosBalance(data);
      setBalanceChecked(true);
      setSuccess("PayOS balance has been checked successfully.");
    } catch (err) {
      console.error("CHECK PAYOS BALANCE ERROR:", err?.response?.data || err);
      setPayosBalance(null);
      setBalanceChecked(false);
      setError(getFriendlyError(err, "Cannot check PayOS balance."));
    } finally {
      setBalanceLoading(false);
    }
  };

  const openApproveModal = (withdrawal) => {
    const balance = Number(
      payosBalance?.availableBalance ?? payosBalance?.currentBalance ?? 0
    );
    const withdrawalAmount = Number(withdrawal?.amount || 0);
    const currency = payosBalance?.currency || withdrawal?.currency || "VND";

    if (!balanceChecked) {
      setError("Please check PayOS balance before approving this withdrawal.");
      return;
    }

    if (withdrawalAmount > balance) {
      setError(
        `PayOS balance is insufficient. Current balance: ${formatMoney(
          balance,
          currency
        )}. Withdrawal amount: ${formatMoney(
          withdrawalAmount,
          withdrawal?.currency || currency
        )}.`
      );
      return;
    }

    setAction({
      type: "APPROVE_PAYOS",
      withdrawal,
    });

    setForm({
      reason: "Approve withdrawal via PayOS.",
    });

    setError("");
    setSuccess("");
    setModalError("");
    setFieldErrors({});
  };

  const openRejectModal = (withdrawal) => {
    setAction({
      type: "REJECT",
      withdrawal,
    });

    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
    setModalError("");
    setFieldErrors({});
  };

  const closeActionModal = () => {
    if (actionLoading) return;

    setAction(EMPTY_ACTION);
    setForm(EMPTY_FORM);
    setModalError("");
    setFieldErrors({});
  };

  const executeApprovePayos = async () => {
    if (!action.withdrawal?.withdrawalRequestId) return;

    const validation = validateActionForm(form, "Approval Reason");

    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setModalError("Please fix the highlighted fields.");
      return;
    }

    const balanceValue = Number(
      payosBalance?.availableBalance ?? payosBalance?.currentBalance ?? 0
    );

    if (!balanceChecked) {
      setFieldErrors({});
      setModalError("Please check PayOS balance before approving this withdrawal.");
      return;
    }

    if (Number(action.withdrawal.amount || 0) > balanceValue) {
      setFieldErrors({});
      setModalError(
        `PayOS balance is insufficient. Current balance: ${formatMoney(
          balanceValue,
          payosBalance?.currency || action.withdrawal.currency || "VND"
        )}. Withdrawal amount: ${formatMoney(
          action.withdrawal.amount,
          action.withdrawal.currency || "VND"
        )}.`
      );
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");
      setModalError("");
      setFieldErrors({});

      await adminWithdrawalService.approveWithdrawalPayos(
        action.withdrawal.withdrawalRequestId,
        {
          reason: form.reason,
        }
      );

      closeActionModal();
      setBalanceChecked(false);
      setPayosBalance(null);
      await loadWithdrawals({ keepMessage: true });
      setSuccess(`Withdrawal approved successfully. Check the payout balance again before approving another request.`);
    } catch (err) {
      console.error("APPROVE PAYOS WITHDRAWAL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot approve withdrawal via PayOS."));
    } finally {
      setActionLoading(false);
    }
  };

  const requestSyncPayos = (withdrawal) => {
    if (!withdrawal?.withdrawalRequestId) {
      setError("Withdrawal information is unavailable. Please refresh and try again.");
      return;
    }

    setError("");
    setSuccess("");
    setSyncTarget(withdrawal);
  };

  const handleSyncPayos = async () => {
    const withdrawal = syncTarget;

    if (!withdrawal?.withdrawalRequestId) {
      setError("Withdrawal information is unavailable. Please refresh and try again.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");
      setModalError("");
      setFieldErrors({});
      setSyncTarget(null);

      await adminWithdrawalService.syncWithdrawalPayos(
        withdrawal.withdrawalRequestId
      );

      await loadWithdrawals({ keepMessage: true });
      setSuccess("The latest transfer status has been loaded.");
    } catch (err) {
      console.error("SYNC PAYOS WITHDRAWAL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot check the latest transfer status."));
    } finally {
      setActionLoading(false);
    }
  };

  const executeReject = async () => {
    if (!action.withdrawal?.withdrawalRequestId) return;

    const validation = validateActionForm(form, "Rejection Reason");

    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setModalError("Please fix the highlighted fields.");
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

      closeActionModal();
      await loadWithdrawals({ keepMessage: true });
      setSuccess(`Withdrawal request has been rejected.`);
    } catch (err) {
      console.error("REJECT WITHDRAWAL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot reject withdrawal request."));
    } finally {
      setActionLoading(false);
    }
  };

const requestApprovePayos = () => {
    if (!action.withdrawal?.withdrawalRequestId) return;

    const validation = validateActionForm(form, "Approval Reason");

    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setModalError("Please fix the highlighted fields.");
      return;
    }

    const balanceValue = Number(
      payosBalance?.availableBalance ?? payosBalance?.currentBalance ?? 0
    );
    const amount = Number(action.withdrawal.amount || 0);

    if (!balanceChecked) {
      setFieldErrors({});
      setModalError("Please check PayOS balance before approving this withdrawal.");
      return;
    }

    if (amount > balanceValue) {
      setFieldErrors({});
      setModalError(
        `PayOS balance is insufficient. Current balance: ${formatMoney(
          balanceValue,
          payosBalance?.currency || action.withdrawal.currency || "VND"
        )}. Withdrawal amount: ${formatMoney(
          amount,
          action.withdrawal.currency || "VND"
        )}.`
      );
      return;
    }

    setFieldErrors({});
    setModalError("");
    setConfirmAction({
      type: "APPROVE_PAYOS",
      title: "Approve and create this payout?",
      description:
        "PayOS will be asked to process this withdrawal using the verified bank information.",
      confirmLabel: "Confirm Payout",
      tone: "green",
      rows: [
        {
          label: "Expert",
          value:
            action.withdrawal.expertName ||
            action.withdrawal.expertEmail ||
            "Expert",
        },
        {
          label: "Amount",
          value: formatMoney(
            action.withdrawal.amount,
            action.withdrawal.currency || "VND"
          ),
        },
        {
          label: "Bank",
          value: action.withdrawal.bankName || "N/A",
        },
        {
          label: "Account",
          value: maskAccountNumber(action.withdrawal.bankAccountNumber),
        },
        {
          label: "PayOS Balance",
          value: formatMoney(
            balanceValue,
            payosBalance?.currency || action.withdrawal.currency || "VND"
          ),
        },
        {
          label: "Balance After",
          value: formatMoney(
            balanceValue - amount,
            payosBalance?.currency || action.withdrawal.currency || "VND"
          ),
        },
        { label: "Admin Reason", value: form.reason.trim() },
      ],
    });
  };

  const requestReject = () => {
    if (!action.withdrawal?.withdrawalRequestId) return;

    const validation = validateActionForm(form, "Rejection Reason");

    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setModalError("Please fix the highlighted fields.");
      return;
    }

    setFieldErrors({});
    setModalError("");
    setConfirmAction({
      type: "REJECT",
      title: "Reject this withdrawal request?",
      description:
        "The request will not be paid and the expert will see the rejection result and reason.",
      confirmLabel: "Confirm Rejection",
      tone: "red",
      rows: [
        {
          label: "Expert",
          value:
            action.withdrawal.expertName ||
            action.withdrawal.expertEmail ||
            "Expert",
        },
        {
          label: "Amount",
          value: formatMoney(
            action.withdrawal.amount,
            action.withdrawal.currency || "VND"
          ),
        },
        {
          label: "Bank",
          value: action.withdrawal.bankName || "N/A",
        },
        {
          label: "Account",
          value: maskAccountNumber(action.withdrawal.bankAccountNumber),
        },
        { label: "Reason", value: form.reason.trim() },
      ],
    });
  };

  const executeConfirmedWithdrawalAction = async () => {
    const type = confirmAction?.type;
    setConfirmAction(null);

    if (type === "APPROVE_PAYOS") {
      await executeApprovePayos();
      return;
    }

    if (type === "REJECT") {
      await executeReject();
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
              Review expert withdrawal requests, check PayOS payout balance,
              approve via PayOS, sync payout status, or reject invalid requests.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCheckPayosBalance}
              disabled={loading || actionLoading || balanceLoading}
              className="w-fit rounded-xl border border-green-400/50 bg-green-400/10 px-5 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {balanceLoading ? "Checking..." : "Check Payout Balance"}
            </button>

            <button
              type="button"
              onClick={() => loadWithdrawals()}
              disabled={loading || actionLoading || balanceLoading}
              className="w-fit rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {error && (
          <Alert
            type="danger"
            title="Action failed"
            message={error}
            onClose={() => setError("")}
          />
        )}

        {success && <SuccessToast message={success} onClose={() => setSuccess("")} />}

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            icon="account_balance"
            label="Payout Balance"
            value={
              balanceChecked
                ? formatMoney(
                    payosBalance?.availableBalance ??
                      payosBalance?.currentBalance ??
                      0,
                    payosBalance?.currency || "VND"
                  )
                : "Not checked"
            }
            description={
              balanceChecked
                ? "Available for expert payouts"
                : "Check before approving a payout"
            }
            tone={balanceChecked ? "green" : "yellow"}
          />

          <StatCard
            icon="account_balance_wallet"
            label="Total Requests"
            value={stats.total}
            description={formatMoney(stats.totalAmount, "VND")}
            tone="cyan"
          />

          <StatCard
            icon="pending_actions"
            label="Pending"
            value={stats.pending}
            description={formatMoney(stats.pendingAmount, "VND")}
            tone="yellow"
          />

          <StatCard
            icon="sync"
            label="Processing"
            value={stats.processing}
            description={formatMoney(stats.processingAmount, "VND")}
            tone="purple"
          />

          <StatCard
            icon="check_circle"
            label="Approved"
            value={stats.approved}
            description={formatMoney(stats.approvedAmount, "VND")}
            tone="green"
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
                  placeholder="Search by expert, email, bank, or account number..."
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
            <ListSkeleton />
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
                  onSyncPayos={() => requestSyncPayos(withdrawal)}
                />
              ))}
            </div>
          )}
        </section>

        {action.type === "APPROVE_PAYOS" && (
          <ActionModal
            title="Approve Withdrawal"
            subtitle={`${action.withdrawal?.expertName || "Expert"} · ${formatMoney(action.withdrawal?.amount, action.withdrawal?.currency || "VND")}`}
            confirmLabel="Approve Payout"
            confirmTone="green"
            loading={actionLoading}
            error={modalError}
            onClose={closeActionModal}
            onConfirm={requestApprovePayos}
          >
            <WithdrawalSummary withdrawal={action.withdrawal} />

            <TextArea
              label="Approval Reason"
              required
              value={form.reason}
              error={fieldErrors.reason}
              onChange={(value) => {
                setModalError("");
                setFieldErrors((prev) => ({ ...prev, reason: "" }));
                setForm((prev) => ({
                  ...prev,
                  reason: value,
                }));
              }}
              placeholder="Example: Payment details verified. Approve Payout."
            />
          </ActionModal>
        )}

        {syncTarget && (
          <SyncWithdrawalConfirmModal
            withdrawal={syncTarget}
            loading={actionLoading}
            onCancel={() => !actionLoading && setSyncTarget(null)}
            onConfirm={handleSyncPayos}
          />
        )}

        {action.type === "REJECT" && (
          <ActionModal
            title="Reject Withdrawal"
            subtitle={`${action.withdrawal?.expertName || "Expert"} · ${formatMoney(action.withdrawal?.amount, action.withdrawal?.currency || "VND")}`}
            confirmLabel="Reject Request"
            confirmTone="red"
            loading={actionLoading}
            error={modalError}
            onClose={closeActionModal}
            onConfirm={requestReject}
          >
            <WithdrawalSummary withdrawal={action.withdrawal} />

            <TextArea
              label="Rejection Reason"
              required
              value={form.reason}
              error={fieldErrors.reason}
              onChange={(value) => {
                setModalError("");
                setFieldErrors((prev) => ({ ...prev, reason: "" }));
                setForm((prev) => ({
                  ...prev,
                  reason: value,
                }));
              }}
              placeholder="Example: Bank account information is invalid."
            />
          </ActionModal>
        )}
        {confirmAction && (
          <ReviewConfirmationModal
            title={confirmAction.title}
            description={confirmAction.description}
            rows={confirmAction.rows}
            warning={
              confirmAction.type === "APPROVE_PAYOS"
                ? "This action may create a real bank payout. Verify the recipient, account, amount, and remaining PayOS balance."
                : "The expert will not receive this payout. Make sure the rejection reason is accurate and actionable."
            }
            confirmLabel={confirmAction.confirmLabel}
            tone={confirmAction.tone}
            loading={actionLoading}
            onCancel={() => !actionLoading && setConfirmAction(null)}
            onConfirm={executeConfirmedWithdrawalAction}
          />
        )}
      </div>
    </AdminLayout>
  );
}

function ReviewConfirmationModal({
  title,
  description,
  rows = [],
  warning = "",
  confirmLabel,
  tone = "cyan",
  loading,
  onCancel,
  onConfirm,
}) {
  const toneMap = {
    cyan: {
      icon: "verified",
      iconClass: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
      button:
        "border-cyan-400/50 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400 hover:text-black",
    },
    green: {
      icon: "task_alt",
      iconClass: "border-green-400/30 bg-green-400/10 text-green-300",
      button:
        "border-green-400/50 bg-green-400/10 text-green-300 hover:bg-green-400 hover:text-black",
    },
    yellow: {
      icon: "lock_clock",
      iconClass: "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
      button:
        "border-yellow-400/50 bg-yellow-400/10 text-yellow-300 hover:bg-yellow-400 hover:text-black",
    },
    red: {
      icon: "warning",
      iconClass: "border-red-400/30 bg-red-400/10 text-red-300",
      button:
        "border-red-400/50 bg-red-400/10 text-red-300 hover:bg-red-400 hover:text-black",
    },
  };

  const config = toneMap[tone] || toneMap.cyan;

  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-confirmation-title"
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#151a22] p-5 shadow-[0_32px_110px_rgba(0,0,0,0.75)]"
      >
        <div
          className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl border ${config.iconClass}`}
        >
          <span className="material-symbols-outlined">{config.icon}</span>
        </div>

        <h2
          id="review-confirmation-title"
          className="text-xl font-black text-white"
        >
          {title}
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-400">{description}</p>

        <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          {rows.map((row, index) => (
            <div
              key={`${row.label}-${index}`}
              className="grid grid-cols-[125px_minmax(0,1fr)] gap-3 text-sm"
            >
              <span className="font-bold text-gray-500">{row.label}</span>
              <span className="break-words text-right font-semibold text-white">
                {row.value || "N/A"}
              </span>
            </div>
          ))}
        </div>

        {warning && (
          <div className="mt-4 rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm leading-6 text-yellow-100/80">
            {warning}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Review Again
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`rounded-xl border px-4 py-2.5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${config.button}`}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessToast({ message, onClose }) {
  return (
    <div className="fixed right-4 top-4 z-[1200] w-[min(92vw,380px)] animate-[fadeIn_.2s_ease-out]">
      <div className="flex items-start gap-3 rounded-2xl border border-green-400/30 bg-[#111a16] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-green-400/30 bg-green-400/10 text-green-300">
          <span className="material-symbols-outlined">check_circle</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">Action completed</p>
          <p className="mt-1 text-sm leading-5 text-green-100/75">{message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 transition hover:text-white"
          aria-label="Close notification"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
    </div>
  );
}



function ListSkeleton({ rows = 5 }) {
  return (
    <div className="divide-y divide-white/10">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="animate-pulse p-5">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_160px_160px_220px] xl:items-center">
            <div>
              <div className="h-5 w-48 rounded bg-white/10" />
              <div className="mt-3 h-4 w-72 max-w-full rounded bg-white/[0.06]" />
            </div>
            <div className="h-8 w-24 rounded-full bg-white/[0.06]" />
            <div className="h-8 w-24 rounded-full bg-white/[0.06]" />
            <div className="h-10 rounded-xl bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}



function PageSkeleton({ rows = 4 }) {
  return (
    <div className="animate-pulse px-5 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 h-5 w-36 rounded-full bg-white/10" />
        <div className="mb-6 rounded-3xl border border-white/10 bg-[#151a22] p-6 md:p-8">
          <div className="h-4 w-28 rounded bg-cyan-400/10" />
          <div className="mt-4 h-9 w-2/3 rounded bg-white/10" />
          <div className="mt-3 h-4 w-1/2 rounded bg-white/[0.07]" />
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-20 rounded-2xl border border-white/10 bg-white/[0.03]"
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            {Array.from({ length: rows }).map((_, index) => (
              <div
                key={index}
                className="h-32 rounded-2xl border border-white/10 bg-[#151a22]"
              />
            ))}
          </div>
          <div className="h-72 rounded-2xl border border-white/10 bg-[#151a22]" />
        </div>
      </div>
    </div>
  );
}


function SyncWithdrawalConfirmModal({
  withdrawal,
  loading,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-cyan-400/20 bg-[#151a22] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.7)]">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
          <span className="material-symbols-outlined">sync</span>
        </div>

        <h2 className="text-lg font-black text-white">
          Check the latest transfer status?
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-400">
          Refresh the payout result for{" "}
          <span className="font-bold text-white">
            {withdrawal?.expertName || "this expert"}
          </span>
          . This does not create a new payout.
        </p>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs text-gray-500">Withdrawal amount</p>
          <p className="mt-1 font-black text-white">
            {formatMoney(
              withdrawal?.amount,
              withdrawal?.currency || "VND"
            )}
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-gray-300 transition hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2.5 text-sm font-black text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:opacity-50"
          >
            {loading ? "Checking..." : "Check Status"}
          </button>
        </div>
      </div>
    </div>
  );
}

function WithdrawalRow({
  withdrawal,
  disabled,
  onApprove,
  onReject,
  onSyncPayos,
}) {
  const status = String(withdrawal.status || "PENDING").toUpperCase();
  const canApprove = status === "PENDING";
  const canReject = ["PENDING", "PROCESSING"].includes(status);
  const canSync = ["PENDING", "PROCESSING", "APPROVED"].includes(status);

  return (
    <article className="p-5 transition hover:bg-white/[0.02]">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_170px_170px_300px] xl:items-center">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            {withdrawal.payosStatus && (
              <Badge label={`Transfer: ${formatLabel(withdrawal.payosStatus)}`} />
            )}
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
            {formatMoney(withdrawal.amount, withdrawal.currency || "VND")}
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

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end">
          <button
            type="button"
            onClick={onApprove}
            disabled={disabled || !canApprove}
            className="rounded-xl border border-green-400/40 bg-green-400/10 px-4 py-2 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            Approve
          </button>

          <button
            type="button"
            onClick={onSyncPayos}
            disabled={disabled || !canSync}
            className="rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            Check Transfer Status
          </button>

          <button
            type="button"
            onClick={onReject}
            disabled={disabled || !canReject}
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
          value={formatMoney(withdrawal.amount, withdrawal.currency || "VND")}
        />
        <InfoBox label="Bank" value={withdrawal.bankName || "N/A"} />
        <InfoBox
          label="Account Number"
          value={withdrawal.bankAccountNumber || "N/A"}
        />
        <InfoBox
          label="Account Holder"
          value={withdrawal.bankAccountName || "N/A"}
        />
        <InfoBox label="Status" value={formatLabel(withdrawal.status)} />
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
    purple: "border-purple-400/20 bg-purple-400/10 text-purple-300",
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

      <p className="mt-2 text-2xl font-bold text-white">{value}</p>

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
  error = "",
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
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#151a22] shadow-2xl">
        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
        </div>

        <div className="px-6 py-5">
          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {children}
        </div>

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

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  error = "",
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        placeholder={placeholder}
        className={`w-full resize-none rounded-xl border bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-gray-600 ${
          error
            ? "border-red-400/70 focus:border-red-400"
            : "border-white/10 focus:border-cyan-400/50"
        }`}
      />

      {error && <p className="mt-2 text-xs font-semibold text-red-300">{error}</p>}
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
    ["APPROVED", "COMPLETED", "PAID", "SUCCESS"].includes(value)
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : ["REJECTED", "FAILED", "CANCELLED", "CANCELED"].includes(value)
        ? "border-red-400/30 bg-red-400/10 text-red-300"
        : value === "PROCESSING"
          ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
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

function formatMoney(value, currency = "VND") {
  const number = Number(value || 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: currency || "VND",
    maximumFractionDigits: 0,
  }).format(Number.isNaN(number) ? 0 : number);
}

function formatDate(value) {
  return formatDateTime(value, "N/A");
};


function formatLabel(value) {
  if (!value) return "N/A";

  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function validateActionForm(form, label = "Reason") {
  const errors = {};
  const reason = String(form.reason || "").trim();

  if (!reason) {
    errors.reason = `${label} is required.`;
  } else if (reason.length < 10) {
    errors.reason = `${label} must be at least 10 characters.`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

function getFriendlyError(err, fallback = "Something went wrong.") {
  const status = err?.response?.status;

  if (status === 401) {
    return "Your session has expired. Please login again.";
  }

  if (status === 403) {
    return "You do not have permission to manage withdrawal requests.";
  }

  if (status === 404) {
    return "Withdrawal management is temporarily unavailable. Please try again later.";
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