import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminWithdrawalService from "../../../services/adminWithdrawal.service";

const STATUS_OPTIONS = ["ALL", "PENDING", "APPROVED", "REJECTED"];

export default function ManageWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchText, setSearchText] = useState("");
  const [adminNote, setAdminNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadWithdrawals(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const loadWithdrawals = async (status = statusFilter) => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await adminWithdrawalService.getAllWithdrawals(status);

      setWithdrawals(data);

      if (selectedWithdrawal) {
        const updatedSelected = data.find(
          (item) =>
            item.withdrawalRequestId === selectedWithdrawal.withdrawalRequestId
        );

        setSelectedWithdrawal(updatedSelected || null);
      }
    } catch (err) {
      console.error("LOAD ADMIN WITHDRAWALS ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredWithdrawals = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return withdrawals.filter((item) => {
      if (!keyword) return true;

      return (
        String(item.withdrawalRequestId || "").includes(keyword) ||
        String(item.userFullName || "").toLowerCase().includes(keyword) ||
        String(item.userEmail || "").toLowerCase().includes(keyword) ||
        String(item.bankName || "").toLowerCase().includes(keyword) ||
        String(item.bankAccountNumber || "").toLowerCase().includes(keyword) ||
        String(item.bankAccountHolder || "").toLowerCase().includes(keyword)
      );
    });
  }, [withdrawals, searchText]);

  const summary = useMemo(() => {
    const pending = withdrawals.filter((item) => item.status === "PENDING");
    const approved = withdrawals.filter((item) => item.status === "APPROVED");
    const rejected = withdrawals.filter((item) => item.status === "REJECTED");

    return {
      total: withdrawals.length,
      pendingCount: pending.length,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      pendingAmount: pending.reduce((sum, item) => sum + item.amount, 0),
      approvedAmount: approved.reduce((sum, item) => sum + item.amount, 0),
    };
  }, [withdrawals]);

  const handleSelectWithdrawal = (item) => {
    setSelectedWithdrawal(item);
    setAdminNote(item.adminNote || "");
    setMessage("");
    setError("");
  };

  const handleApprove = async () => {
    if (!selectedWithdrawal) {
      setError("Please select a withdrawal request first.");
      return;
    }

    if (selectedWithdrawal.status !== "PENDING") {
      setError("Only PENDING withdrawal requests can be approved.");
      return;
    }

    try {
      setProcessing(true);
      setError("");
      setMessage("");

      await adminWithdrawalService.approveWithdrawal(
        selectedWithdrawal.withdrawalRequestId,
        adminNote
      );

      setMessage("Withdrawal request approved successfully.");
      setSelectedWithdrawal(null);
      setAdminNote("");

      await loadWithdrawals(statusFilter);
    } catch (err) {
      console.error("APPROVE WITHDRAWAL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedWithdrawal) {
      setError("Please select a withdrawal request first.");
      return;
    }

    if (selectedWithdrawal.status !== "PENDING") {
      setError("Only PENDING withdrawal requests can be rejected.");
      return;
    }

    if (!adminNote.trim()) {
      setError("Admin note is required when rejecting a withdrawal request.");
      return;
    }

    try {
      setProcessing(true);
      setError("");
      setMessage("");

      await adminWithdrawalService.rejectWithdrawal(
        selectedWithdrawal.withdrawalRequestId,
        adminNote
      );

      setMessage("Withdrawal request rejected successfully.");
      setSelectedWithdrawal(null);
      setAdminNote("");

      await loadWithdrawals(statusFilter);
    } catch (err) {
      console.error("REJECT WITHDRAWAL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
    } finally {
      setProcessing(false);
    }
  };

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

  const inputStyle =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]";

  const labelStyle =
    "mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400";

  return (
    <AdminLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Admin Withdrawals
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                Withdrawal management
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Review withdrawal requests, verify bank information, then
                approve or reject payout requests.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadWithdrawals(statusFilter)}
              disabled={loading}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </section>

          {message && (
            <div className="mb-5 rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-4 text-sm text-green-300">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-4">
            <SummaryCard
              icon="account_balance_wallet"
              label="Total Requests"
              value={summary.total}
              tone="cyan"
            />

            <SummaryCard
              icon="pending_actions"
              label="Pending"
              value={summary.pendingCount}
              helper={formatMoney(summary.pendingAmount)}
              tone="yellow"
            />

            <SummaryCard
              icon="check_circle"
              label="Approved"
              value={summary.approvedCount}
              helper={formatMoney(summary.approvedAmount)}
              tone="green"
            />

            <SummaryCard
              icon="cancel"
              label="Rejected"
              value={summary.rejectedCount}
              tone="red"
            />
          </section>

          <section className={`${cardStyle} mb-6 p-6`}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_220px_160px]">
              <div>
                <label className={labelStyle}>Search</label>

                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-500">
                    search
                  </span>

                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search user, email, bank, account number..."
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
                  />
                </div>
              </div>

              <div>
                <label className={labelStyle}>Status</label>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#151a22] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-center">
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Showing
                </p>

                <p className="mt-1 text-2xl font-bold text-white">
                  {filteredWithdrawals.length}
                </p>
              </div>
            </div>
          </section>

          {loading && (
            <div className={`${cardStyle} p-12 text-center text-gray-400`}>
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                hourglass_empty
              </span>
              Loading withdrawal requests...
            </div>
          )}

          {!loading && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_430px]">
              <section className="space-y-5">
                {filteredWithdrawals.length === 0 && (
                  <div className={`${cardStyle} p-12 text-center`}>
                    <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                      account_balance_wallet
                    </span>

                    <h2 className="text-xl font-bold text-white">
                      No withdrawal requests found
                    </h2>

                    <p className="mt-2 text-sm text-gray-400">
                      There are no withdrawal requests matching your filter.
                    </p>
                  </div>
                )}

                {filteredWithdrawals.map((item) => {
                  const isSelected =
                    selectedWithdrawal?.withdrawalRequestId ===
                    item.withdrawalRequestId;

                  return (
                    <article
                      key={item.withdrawalRequestId}
                      onClick={() => handleSelectWithdrawal(item)}
                      className={`${cardStyle} cursor-pointer p-6 transition ${
                        isSelected
                          ? "border-cyan-400/50"
                          : "hover:border-cyan-400/40"
                      }`}
                    >
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        <StatusBadge status={item.status} />

                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                          Request #{item.withdrawalRequestId}
                        </span>

                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                          Created {formatDate(item.createdAt)}
                        </span>
                      </div>

                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h2 className="text-xl font-bold text-white">
                            {item.userFullName}
                          </h2>

                          <p className="mt-1 text-sm text-gray-400">
                            {item.userEmail}
                          </p>

                          <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                            <InfoLine label="Bank" value={item.bankName} />
                            <InfoLine
                              label="Account"
                              value={item.bankAccountNumber}
                            />
                            <InfoLine
                              label="Holder"
                              value={item.bankAccountHolder}
                            />
                            <InfoLine
                              label="Processed"
                              value={formatDate(item.processedAt)}
                            />
                          </div>
                        </div>

                        <div className="rounded-2xl border border-green-400/20 bg-green-400/10 px-5 py-4 text-right">
                          <p className="text-xs uppercase tracking-wider text-green-200/70">
                            Amount
                          </p>
                          <p className="mt-1 text-2xl font-black text-green-300">
                            {formatMoney(item.amount)}
                          </p>
                        </div>
                      </div>

                      {item.adminNote && (
                        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                          <p className="text-xs uppercase tracking-wider text-gray-500">
                            Admin note
                          </p>

                          <p className="mt-2 text-sm leading-6 text-gray-300">
                            {item.adminNote}
                          </p>
                        </div>
                      )}
                    </article>
                  );
                })}
              </section>

              <aside>
                <div className={`${cardStyle} sticky top-24 p-6`}>
                  {!selectedWithdrawal && (
                    <div className="text-center">
                      <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                        payments
                      </span>

                      <h2 className="text-lg font-bold text-white">
                        Select a withdrawal
                      </h2>

                      <p className="mt-2 text-sm text-gray-400">
                        Choose a request on the left to approve or reject it.
                      </p>
                    </div>
                  )}

                  {selectedWithdrawal && (
                    <>
                      <div className="mb-6">
                        <h2 className="text-lg font-bold text-white">
                          Process Withdrawal
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                          Request #{selectedWithdrawal.withdrawalRequestId}
                        </p>
                      </div>

                      <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="space-y-3 text-sm">
                          <InfoLine
                            label="User"
                            value={selectedWithdrawal.userFullName}
                          />

                          <InfoLine
                            label="Email"
                            value={selectedWithdrawal.userEmail}
                          />

                          <InfoLine
                            label="Amount"
                            value={formatMoney(selectedWithdrawal.amount)}
                          />

                          <InfoLine
                            label="Bank"
                            value={selectedWithdrawal.bankName}
                          />

                          <InfoLine
                            label="Account number"
                            value={selectedWithdrawal.bankAccountNumber}
                          />

                          <InfoLine
                            label="Account holder"
                            value={selectedWithdrawal.bankAccountHolder}
                          />

                          <InfoLine
                            label="Status"
                            value={selectedWithdrawal.status}
                          />
                        </div>
                      </div>

                      <div className="mb-5">
                        <label className={labelStyle}>Admin Note</label>

                        <textarea
                          value={adminNote}
                          onChange={(event) => setAdminNote(event.target.value)}
                          rows="6"
                          placeholder="Write admin note. Required when rejecting..."
                          disabled={selectedWithdrawal.status !== "PENDING"}
                          className={`${inputStyle} resize-none disabled:cursor-not-allowed disabled:opacity-50`}
                        />
                      </div>

                      {selectedWithdrawal.status !== "PENDING" && (
                        <div className="mb-5 rounded-xl border border-green-400/30 bg-green-400/10 p-4 text-sm text-green-300">
                          This request has already been processed.
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <button
                          type="button"
                          onClick={handleApprove}
                          disabled={
                            processing || selectedWithdrawal.status !== "PENDING"
                          }
                          className="rounded-xl border border-green-400/50 bg-green-400/10 px-5 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {processing ? "Processing..." : "Approve"}
                        </button>

                        <button
                          type="button"
                          onClick={handleReject}
                          disabled={
                            processing || selectedWithdrawal.status !== "PENDING"
                          }
                          className="rounded-xl border border-red-400/50 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {processing ? "Processing..." : "Reject"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ icon, label, value, helper, tone }) {
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

      <p className="mt-2 text-3xl font-bold text-white">{value ?? 0}</p>

      {helper && <p className="mt-2 text-xs text-gray-500">{helper}</p>}
    </div>
  );
}

function InfoLine({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 break-words font-semibold text-gray-200">
        {value || "N/A"}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const value = String(status || "PENDING").toUpperCase();

  const style =
    value === "APPROVED"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : value === "REJECTED"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {value}
    </span>
  );
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
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getFriendlyError(err) {
  const status = err?.response?.status;

  if (status === 401) {
    return "Your session has expired. Please login again.";
  }

  if (status === 403) {
    return "Backend blocked this request because the current token does not have ADMIN permission.";
  }

  const data = err?.response?.data;

  if (typeof data === "string") return data;

  if (data?.message) return data.message;

  if (data?.title) return data.title;

  if (data?.errors) {
    const allErrors = Object.values(data.errors).flat();

    if (allErrors.length > 0) {
      return allErrors.join(" ");
    }
  }

  return err?.message || "Something went wrong. Please try again.";
}