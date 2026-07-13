import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminDisputeService from "../../../services/adminDispute.service";

import {
  compareDateAsc,
  formatDateTime,
  parseUtcDate,
} from "../../../utils/dateTime.utils";
const STATUS_OPTIONS = ["ALL", "OPEN", "UNDER_REVIEW", "RESOLVED", "CLOSED"];

const RESOLUTION_OPTIONS = [
  {
    value: "RELEASE_TO_EXPERT",
    label: "Release to Expert",
    description: "The dispute is resolved in favor of the expert.",
  },
  {
    value: "REFUND_TO_CLIENT",
    label: "Refund to Client",
    description: "The dispute is resolved in favor of the client.",
  },
];

const EMPTY_RESOLVE_FORM = {
  resolutionType: "RELEASE_TO_EXPERT",
  adminDecision: "",
};

export default function ManageDisputesPage() {
  const [disputes, setDisputes] = useState([]);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [resolveTarget, setResolveTarget] = useState(null);

  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [resolveForm, setResolveForm] = useState(EMPTY_RESOLVE_FORM);
  const [resolveErrors, setResolveErrors] = useState({});

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [showResolveConfirm, setShowResolveConfirm] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!success) return;

    const timeoutId = window.setTimeout(() => {
      setSuccess("");
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [success]);

  useEffect(() => {
    loadDisputes();
  }, []);

  const filteredDisputes = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return disputes.filter((dispute) => {
      const status = String(dispute.status || "OPEN").toUpperCase();

      const matchSearch =
        !search ||
        String(dispute.projectTitle || "").toLowerCase().includes(search) ||
        String(dispute.clientName || "").toLowerCase().includes(search) ||
        String(dispute.expertName || "").toLowerCase().includes(search) ||
        String(dispute.reason || "").toLowerCase().includes(search) ||
        String(dispute.description || "").toLowerCase().includes(search);

      const matchStatus = statusFilter === "ALL" || status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [disputes, keyword, statusFilter]);

  const stats = useMemo(() => {
    return disputes.reduce(
      (result, dispute) => {
        const status = String(dispute.status || "OPEN").toUpperCase();

        result.total += 1;

        if (["OPEN", "UNDER_REVIEW", "PENDING", "IN_REVIEW"].includes(status)) {
          result.open += 1;
        }

        if (["RESOLVED", "CLOSED"].includes(status)) {
          result.resolved += 1;
        }

        result.totalAmount += Number(dispute.disputedAmount || 0);

        return result;
      },
      {
        total: 0,
        open: 0,
        resolved: 0,
        totalAmount: 0,
      }
    );
  }, [disputes]);

  const loadDisputes = async ({ keepMessage = false } = {}) => {
    try {
      setLoading(true);
      setError("");

      if (!keepMessage) {
        setSuccess("");
      }

      const data = await adminDisputeService.getAllDisputes();
      setDisputes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("LOAD ADMIN DISPUTES ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load disputes."));
    } finally {
      setLoading(false);
    }
  };

  const toggleDisputeDetail = async (dispute) => {
    if (!dispute?.disputeId) return;

    const isCurrent =
      String(selectedDispute?.disputeId) === String(dispute.disputeId);

    if (isCurrent) {
      setSelectedDispute(null);
      return;
    }

    try {
      setDetailLoading(true);
      setError("");
      setSelectedDispute(dispute);

      const detail = await adminDisputeService.getDisputeById(dispute.disputeId);
      setSelectedDispute(detail || dispute);
    } catch (err) {
      console.error("LOAD DISPUTE DETAIL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load dispute detail."));
    } finally {
      setDetailLoading(false);
    }
  };

  const openResolveModal = (dispute) => {
    setResolveTarget(dispute);
    setResolveForm(EMPTY_RESOLVE_FORM);
    setResolveErrors({});
    setError("");
    setSuccess("");
  };

  const closeResolveModal = () => {
    if (resolving) return;

    setResolveTarget(null);
    setResolveForm(EMPTY_RESOLVE_FORM);
    setResolveErrors({});
  };

  const requestResolveDispute = () => {
    if (!resolveTarget?.disputeId) return;

    const errors = {};

    if (!resolveForm.resolutionType) {
      errors.resolutionType = "Please select a resolution type.";
    }

    if (!resolveForm.adminDecision.trim()) {
      errors.adminDecision = "Please enter the reason for this decision.";
    } else if (resolveForm.adminDecision.trim().length < 10) {
      errors.adminDecision = "Reason must be at least 10 characters.";
    }

    if (Object.keys(errors).length > 0) {
      setResolveErrors(errors);
      setError("Please check the highlighted fields before submitting.");
      return;
    }

    setResolveErrors({});
    setError("");
    setShowResolveConfirm(true);
  };

  const executeResolveDispute = async () => {
    if (!resolveTarget?.disputeId) return;

    try {
      setResolving(true);
      setResolveErrors({});
      setError("");
      setSuccess("");

      await adminDisputeService.resolveDispute(resolveTarget.disputeId, {
        resolutionType: resolveForm.resolutionType,
        adminDecision: resolveForm.adminDecision,
      });

      closeResolveModal();
      setSelectedDispute(null);

      await loadDisputes({ keepMessage: true });
      setSuccess("Dispute has been resolved.");
    } catch (err) {
      console.error("RESOLVE DISPUTE ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot resolve dispute."));
    } finally {
      setResolving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
              Dispute Management
            </p>

            <h1 className="text-3xl font-bold text-white md:text-4xl">
              Manage disputes
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Review dispute cases, inspect project information, and submit the
              final admin decision.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadDisputes()}
            disabled={loading || resolving}
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

        {success && <SuccessToast message={success} onClose={() => setSuccess("")} />}

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon="gavel"
            label="Total Disputes"
            value={stats.total}
            description="All dispute records"
            tone="cyan"
          />

          <StatCard
            icon="priority_high"
            label="Open Cases"
            value={stats.open}
            description="Need admin review"
            tone="yellow"
          />

          <StatCard
            icon="verified"
            label="Resolved Cases"
            value={stats.resolved}
            description="Completed decisions"
            tone="green"
          />

          <StatCard
            icon="payments"
            label="Disputed Amount"
            value={formatMoney(stats.totalAmount)}
            description="Total disputed value"
            tone="purple"
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
                  placeholder="Search by project, client, expert, or reason..."
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
              <h2 className="text-lg font-bold text-white">Disputes</h2>
              <p className="mt-1 text-sm text-gray-500">
                Showing {filteredDisputes.length} of {disputes.length} records.
              </p>
            </div>
          </div>

          {loading ? (
            <ListSkeleton />
          ) : filteredDisputes.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-white/10">
              {filteredDisputes.map((dispute) => {
                const isExpanded =
                  String(selectedDispute?.disputeId) ===
                  String(dispute.disputeId);

                return (
                  <DisputeRow
                    key={dispute.disputeId || dispute.id}
                    dispute={dispute}
                    detail={isExpanded ? selectedDispute : null}
                    detailLoading={isExpanded && detailLoading}
                    expanded={isExpanded}
                    disabled={resolving}
                    onView={() => toggleDisputeDetail(dispute)}
                    onResolve={() => openResolveModal(dispute)}
                  />
                );
              })}
            </div>
          )}
        </section>



        {resolveTarget && (
          <ResolveDisputeModal
            dispute={resolveTarget}
            form={resolveForm}
            errors={resolveErrors}
            loading={resolving}
            onClose={closeResolveModal}
            onConfirm={requestResolveDispute}
            onChange={(name, value) => {
              setResolveForm((prev) => ({
                ...prev,
                [name]: value,
              }));

              setResolveErrors((prev) => ({
                ...prev,
                [name]: "",
              }));

              setError("");
            }}
          />
        )}
        {showResolveConfirm && resolveTarget && (
          <ReviewConfirmationModal
            title="Confirm final dispute resolution"
            description="This decision determines which party receives the disputed funds and records the final admin explanation."
            rows={[
              { label: "Project", value: resolveTarget.projectTitle },
              { label: "Client", value: resolveTarget.clientName },
              { label: "Expert", value: resolveTarget.expertName },
              {
                label: "Amount",
                value: formatMoney(resolveTarget.disputedAmount),
              },
              {
                label: "Resolution",
                value:
                  resolveForm.resolutionType === "RELEASE_TO_EXPERT"
                    ? "Release funds to Expert"
                    : "Refund funds to Client",
              },
              {
                label: "Admin Decision",
                value: resolveForm.adminDecision.trim(),
              },
            ]}
            warning="This is a financial decision. Verify the evidence, amount, recipient, and explanation before continuing."
            confirmLabel="Confirm Resolution"
            tone={
              resolveForm.resolutionType === "RELEASE_TO_EXPERT"
                ? "green"
                : "red"
            }
            loading={resolving}
            onCancel={() => !resolving && setShowResolveConfirm(false)}
            onConfirm={async () => {
              setShowResolveConfirm(false);
              await executeResolveDispute();
            }}
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


function DisputeRow({
  dispute,
  detail,
  detailLoading,
  expanded,
  disabled,
  onView,
  onResolve,
}) {
  const status = String(dispute.status || "OPEN").toUpperCase();
  const canResolve = ["OPEN", "UNDER_REVIEW", "PENDING", "IN_REVIEW"].includes(
    status
  );

  return (
    <article className="transition hover:bg-white/[0.015]">
      <div className="p-4 md:p-5">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_150px_150px_190px] xl:items-center">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={status} />
            </div>

            <h3 className="line-clamp-1 font-bold text-white">
              {dispute.projectTitle || "Untitled Project"}
            </h3>

            <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-gray-400">
              {dispute.reason ||
                dispute.description ||
                "No dispute reason provided."}
            </p>

            <p className="mt-2 text-xs text-gray-500">
              Client: {dispute.clientName || "Client"} · Expert:{" "}
              {dispute.expertName || "Expert"}
            </p>
          </div>

          <CompactInfo
            label="Amount"
            value={formatMoney(dispute.disputedAmount)}
          />

          <CompactInfo label="Created" value={formatDate(dispute.createdAt)} />

          <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
            <button
              type="button"
              onClick={onView}
              disabled={disabled}
              className={`inline-flex items-center justify-center gap-1 rounded-xl border px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                expanded
                  ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-300"
                  : "border-white/10 bg-white/[0.04] text-gray-300 hover:border-cyan-400/40 hover:text-cyan-300"
              }`}
            >
              {expanded ? "Hide Detail" : "View Detail"}
              <span
                className={`material-symbols-outlined text-[17px] transition ${
                  expanded ? "rotate-180" : ""
                }`}
              >
                expand_more
              </span>
            </button>

            <button
              type="button"
              onClick={onResolve}
              disabled={disabled || !canResolve}
              className="rounded-xl border border-green-400/40 bg-green-400/10 px-4 py-2 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              Resolve
            </button>
          </div>
        </div>

        {expanded && (
          <InlineDisputeDetail
            dispute={detail || dispute}
            loading={detailLoading}
            onResolve={onResolve}
          />
        )}

        {!expanded && dispute.adminDecision && (
          <div className="mt-3 rounded-xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-sm text-green-100/80">
            <span className="font-bold text-green-300">Admin decision:</span>{" "}
            {dispute.adminDecision}
          </div>
        )}
      </div>
    </article>
  );
}

function CompactInfo({ label, value }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function InlineDisputeDetail({ dispute, loading, onResolve }) {
  const status = String(dispute.status || "OPEN").toUpperCase();
  const canResolve = ["OPEN", "UNDER_REVIEW", "PENDING", "IN_REVIEW"].includes(
    status
  );

  const evidences = Array.isArray(dispute.evidences) ? dispute.evidences : [];
  const evidenceSubmissions = groupEvidenceSubmissions(evidences);
  const totalEvidenceAssets = evidenceSubmissions.reduce(
    (sum, submission) =>
      sum + submission.images.length + submission.files.length,
    0
  );

  if (loading) {
    return (
      <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.04] px-4 py-6 text-center text-sm text-gray-400">
        <span className="material-symbols-outlined mr-2 animate-spin align-middle text-[18px] text-cyan-300">
          progress_activity
        </span>
        Loading dispute detail...
      </div>
    );
  }

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#10161f] shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
      <div className="relative overflow-hidden border-b border-white/10 px-4 py-4 md:px-5">
        <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
                Case Workspace
              </p>

              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-gray-400">
                {evidenceSubmissions.length} submission
                {evidenceSubmissions.length === 1 ? "" : "s"}
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-gray-400">
                {totalEvidenceAssets} attachment
                {totalEvidenceAssets === 1 ? "" : "s"}
              </span>
            </div>

            <h3 className="mt-2 text-lg font-black text-white">
              Review this dispute case
            </h3>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-400">
              Evidence uploaded in the same action is grouped into one
              submission, so a shared description is shown only once.
            </p>
          </div>

          {canResolve && (
            <button
              type="button"
              onClick={onResolve}
              className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-green-400 px-4 py-2.5 text-xs font-black text-black transition hover:bg-green-300"
            >
              <span className="material-symbols-outlined text-[18px]">
                task_alt
              </span>
              Resolve Dispute
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_290px] lg:p-5">
        <div className="min-w-0 space-y-4">
          <DetailSection title="Case Statement" icon="report_problem">
            <div className="rounded-xl border border-white/10 bg-black/15 p-4">
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-300">
                {dispute.reason || dispute.description || "No reason provided."}
              </p>
            </div>
          </DetailSection>

          <DetailSection
            title={`Evidence Timeline (${evidenceSubmissions.length})`}
            icon="timeline"
          >
            {evidenceSubmissions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-black/10 p-7 text-center">
                <span className="material-symbols-outlined text-4xl text-gray-600">
                  folder_open
                </span>
                <p className="mt-2 font-bold text-white">
                  No additional evidence
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Evidence submitted by either party will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {evidenceSubmissions.map((submission, index) => (
                  <EvidenceSubmissionGroup
                    key={submission.groupKey}
                    submission={submission}
                    index={index}
                  />
                ))}
              </div>
            )}
          </DetailSection>

          {dispute.adminDecision && (
            <DetailSection title="Admin Decision" icon="gavel" tone="green">
              <div className="rounded-xl border border-green-400/20 bg-green-400/[0.06] p-4">
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-green-100/80">
                  {dispute.adminDecision}
                </p>
              </div>
            </DetailSection>
          )}
        </div>

        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-white/10 bg-[#151b24] p-4 shadow-[0_14px_45px_rgba(0,0,0,0.24)]">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                <span className="material-symbols-outlined text-[19px]">
                  summarize
                </span>
              </div>
              <div>
                <p className="font-black text-white">Case Summary</p>
                <p className="text-xs text-gray-500">
                  Key information for review
                </p>
              </div>
            </div>

            <InfoBox label="Status" value={formatLabel(status)} />
            <InfoBox
              label="Disputed Amount"
              value={formatMoney(dispute.disputedAmount)}
            />
            <InfoBox label="Created" value={formatDate(dispute.createdAt)} />
            <InfoBox label="Client" value={dispute.clientName || "Client"} />
            <InfoBox label="Expert" value={dispute.expertName || "Expert"} />

            {dispute.milestoneTitle && (
              <InfoBox label="Milestone" value={dispute.milestoneTitle} />
            )}
          </div>

          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05] p-4">
            <div className="flex gap-3">
              <span className="material-symbols-outlined mt-0.5 text-cyan-300">
                verified_user
              </span>
              <div>
                <p className="text-sm font-black text-white">
                  Review guidance
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-400">
                  Compare the case statement, timestamps, links, and all images
                  before making the financial decision.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}


function DetailSection({ title, icon, tone = "default", children }) {
  const toneClass =
    tone === "green"
      ? "border-green-400/20 bg-green-400/[0.05]"
      : "border-white/10 bg-white/[0.025]";

  return (
    <section className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-cyan-300">
          {icon}
        </span>
        <h4 className="text-sm font-bold text-white">{title}</h4>
      </div>
      {children}
    </section>
  );
}

function ResolveDisputeModal({
  dispute,
  form,
  errors = {},
  loading,
  onClose,
  onConfirm,
  onChange,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#151a22] shadow-2xl">
        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="text-xl font-bold text-white">Resolve Dispute</h2>
          <p className="mt-1 text-sm text-gray-400">
            {dispute.projectTitle || "Project"}
          </p>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
              Resolution Type
            </label>

            {errors.resolutionType && (
              <p className="mb-2 text-sm font-semibold text-red-300">
                {errors.resolutionType}
              </p>
            )}

            <div className="grid grid-cols-1 gap-3">
              {RESOLUTION_OPTIONS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onChange("resolutionType", item.value)}
                  className={`rounded-xl border p-4 text-left transition ${
                    form.resolutionType === item.value
                      ? "border-cyan-400/50 bg-cyan-400/10"
                      : "border-white/10 bg-white/[0.03] hover:border-cyan-400/30"
                  }`}
                >
                  <p className="font-bold text-white">{item.label}</p>
                  <p className="mt-1 text-sm text-gray-400">{item.description}</p>
                </button>
              ))}
            </div>
          </div>

          <TextArea
            label="Admin Decision"
            value={form.adminDecision}
            error={errors.adminDecision}
            onChange={(value) => onChange("adminDecision", value)}
            placeholder="Explain the reason for this final decision."
          />

          <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm leading-6 text-yellow-100/80">
            Please explain your decision clearly. This note will help both sides
            understand why the dispute was resolved this way.
          </div>
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
            className="rounded-xl border border-green-400/50 bg-green-400/10 px-5 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Resolving..." : "Submit Decision"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, description, tone = "cyan" }) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    green: "border-green-400/20 bg-green-400/10 text-green-300",
    yellow: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
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

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function EvidenceSubmissionGroup({ submission, index }) {
  const images = Array.isArray(submission.images) ? submission.images : [];
  const files = Array.isArray(submission.files) ? submission.files : [];
  const assetCount = images.length + files.length;

  return (
    <article className="group overflow-hidden rounded-2xl border border-white/10 bg-[#121821] transition hover:border-cyan-400/30">
      <div className="flex flex-col gap-3 border-b border-white/10 bg-white/[0.025] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
            <span className="material-symbols-outlined text-[19px]">
              upload_file
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-black text-white">
                {submission.uploadedByName || "User"}
              </p>

              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-cyan-300">
                Submission {index + 1}
              </span>
            </div>

            <p className="mt-1 text-xs text-gray-500">
              {assetCount} attachment{assetCount === 1 ? "" : "s"}
              {images.length > 0
                ? ` · ${images.length} image${images.length === 1 ? "" : "s"}`
                : ""}
              {files.length > 0
                ? ` · ${files.length} file${files.length === 1 ? "" : "s"}`
                : ""}
            </p>
          </div>
        </div>

        <span className="shrink-0 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold text-gray-500">
          {formatDate(submission.createdAt)}
        </span>
      </div>

      <div className="p-4">
        {submission.evidenceText ? (
          <div className="mb-4 rounded-xl border border-white/10 bg-black/15 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-gray-500">
                notes
              </span>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-500">
                Shared Description
              </p>
            </div>

            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-300">
              {submission.evidenceText}
            </p>
          </div>
        ) : (
          <div className="mb-4 rounded-xl border border-dashed border-white/10 bg-black/10 p-3 text-sm text-gray-500">
            No description was provided for this submission.
          </div>
        )}

        {files.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-gray-500">
              Supporting Files
            </p>

            <div className="flex flex-wrap gap-2">
              {files.map((fileUrl, fileIndex) => (
                <a
                  key={`${fileUrl}-${fileIndex}`}
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    attach_file
                  </span>
                  Open File{files.length > 1 ? ` ${fileIndex + 1}` : ""}
                </a>
              ))}
            </div>
          </div>
        )}

        {images.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-500">
                Image Gallery
              </p>
              <span className="text-xs font-bold text-gray-600">
                {images.length} image{images.length === 1 ? "" : "s"}
              </span>
            </div>

            <div
              className={`grid gap-3 ${
                images.length === 1
                  ? "grid-cols-1"
                  : images.length === 2
                    ? "grid-cols-1 sm:grid-cols-2"
                    : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
              }`}
            >
              {images.map((imageUrl, imageIndex) => (
                <a
                  key={`${imageUrl}-${imageIndex}`}
                  href={imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group/image overflow-hidden rounded-xl border border-white/10 bg-black/25 p-2 transition hover:border-purple-400/40"
                >
                  <div className="relative overflow-hidden rounded-lg bg-black/30">
                    <img
                      src={imageUrl}
                      alt={`Evidence submission ${index + 1}, image ${
                        imageIndex + 1
                      }`}
                      className="h-44 w-full object-contain transition duration-300 group-hover/image:scale-[1.02]"
                    />

                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover/image:bg-black/30 group-hover/image:opacity-100">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-black">
                        <span className="material-symbols-outlined text-[20px]">
                          open_in_full
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 px-1 pb-1 pt-2">
                    <span className="text-xs font-semibold text-gray-400">
                      Image {imageIndex + 1}
                    </span>
                    <span className="text-[11px] font-bold text-purple-300">
                      View full size
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function groupEvidenceSubmissions(evidences = []) {
  const sorted = [...evidences].sort((a, b) =>
    compareDateAsc(
      getEvidenceCreatedAt(a),
      getEvidenceCreatedAt(b)
    )
  );

  const groups = [];
  const MAX_GROUP_GAP_MS = 2 * 60 * 1000;

  sorted.forEach((evidence, index) => {
    const evidenceText = getEvidenceText(evidence);
    const uploadedByUserId = getEvidenceUploaderId(evidence);
    const uploadedByName = getEvidenceUploaderName(evidence);
    const createdAt = getEvidenceCreatedAt(evidence);
    const createdTime = parseUtcDate(createdAt)?.getTime() ?? Number.NaN;
    const imageUrl = getEvidenceImageUrl(evidence);
    const fileUrl = getEvidenceFileUrl(evidence);

    const previousGroup = groups[groups.length - 1];
    const previousTime = previousGroup
      ? parseUtcDate(previousGroup.lastCreatedAt)?.getTime() ?? Number.NaN
      : Number.NaN;

    const sameDescription =
      previousGroup &&
      String(previousGroup.evidenceText || "").trim() === evidenceText;

    const sameUploader =
      previousGroup &&
      String(previousGroup.uploadedByUserId || "") === uploadedByUserId &&
      String(previousGroup.uploadedByName || "").trim() === uploadedByName;

    const closeInTime =
      previousGroup &&
      Number.isFinite(createdTime) &&
      Number.isFinite(previousTime) &&
      Math.abs(createdTime - previousTime) <= MAX_GROUP_GAP_MS;

    /*
     * The backend stores one row for each uploaded image.
     * Images from one multipart request share uploader, description, and
     * nearly identical timestamps. Group those rows into one UI submission.
     */
    if (sameDescription && sameUploader && closeInTime) {
      if (imageUrl && !previousGroup.images.includes(imageUrl)) {
        previousGroup.images.push(imageUrl);
      }

      if (fileUrl && !previousGroup.files.includes(fileUrl)) {
        previousGroup.files.push(fileUrl);
      }

      previousGroup.lastCreatedAt = createdAt || previousGroup.lastCreatedAt;
      previousGroup.evidenceIds.push(getEvidenceId(evidence) || index);
      return;
    }

    groups.push({
      groupKey: [
        getEvidenceId(evidence) || index,
        uploadedByUserId || uploadedByName,
        createdTime || index,
      ].join("-"),
      evidenceText,
      uploadedByUserId,
      uploadedByName,
      createdAt,
      lastCreatedAt: createdAt,
      images: imageUrl ? [imageUrl] : [],
      files: fileUrl ? [fileUrl] : [],
      evidenceIds: [getEvidenceId(evidence) || index],
    });
  });

  return groups.reverse();
}

function getEvidenceId(evidence) {
  return (
    evidence?.evidenceId ||
    evidence?.EvidenceId ||
    evidence?.id ||
    evidence?.Id ||
    ""
  );
}

function getEvidenceText(evidence) {
  return String(
    evidence?.evidenceText ||
      evidence?.EvidenceText ||
      evidence?.description ||
      evidence?.Description ||
      evidence?.note ||
      evidence?.Note ||
      ""
  ).trim();
}

function getEvidenceUploaderId(evidence) {
  return String(
    evidence?.uploadedByUserId ||
      evidence?.UploadedByUserId ||
      evidence?.userId ||
      evidence?.UserId ||
      ""
  );
}

function getEvidenceUploaderName(evidence) {
  return String(
    evidence?.uploadedByName ||
      evidence?.UploadedByName ||
      evidence?.title ||
      evidence?.Title ||
      "User"
  ).trim();
}

function getEvidenceCreatedAt(evidence) {
  return (
    evidence?.createdAt ||
    evidence?.CreatedAt ||
    evidence?.uploadedAt ||
    evidence?.UploadedAt ||
    ""
  );
}

function getEvidenceFileUrl(evidence) {
  return (
    evidence?.fileUrl ||
    evidence?.FileUrl ||
    evidence?.evidenceFileUrl ||
    evidence?.EvidenceFileUrl ||
    evidence?.url ||
    evidence?.Url ||
    ""
  );
}

function getEvidenceImageUrl(evidence) {
  return (
    evidence?.imageUrl ||
    evidence?.ImageUrl ||
    evidence?.evidenceImageUrl ||
    evidence?.EvidenceImageUrl ||
    ""
  );
}

function StatusBadge({ status }) {
  const value = String(status || "OPEN").toUpperCase();

  const className =
    value === "RESOLVED" || value === "CLOSED"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : value === "OPEN" ||
        value === "PENDING" ||
        value === "IN_REVIEW" ||
        value === "UNDER_REVIEW"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : "border-gray-400/30 bg-gray-400/10 text-gray-300";

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

function TextArea({ label, value, error, onChange, placeholder }) {
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
        className={`w-full resize-none rounded-xl border px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-gray-600 ${
          error
            ? "border-red-400/60 bg-red-500/10 focus:border-red-400"
            : "border-white/10 bg-white/[0.04] focus:border-cyan-400/50"
        }`}
      />

      {error && (
        <p className="mt-2 text-sm font-semibold text-red-300">{error}</p>
      )}
    </div>
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
        gavel
      </span>

      <h3 className="text-lg font-bold text-white">No disputes found</h3>

      <p className="mt-2 text-sm text-gray-400">
        Try changing the search keyword or status filter.
      </p>
    </div>
  );
}

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isNaN(number) ? 0 : number);
}

function formatNumber(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("vi-VN").format(
    Number.isNaN(number) ? 0 : number
  );
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

function getFriendlyError(err, fallback = "Something went wrong.") {
  const status = err?.response?.status;

  if (status === 401) {
    return "Your session has expired. Please login again.";
  }

  if (status === 403) {
    return "Backend blocked this request because the current token does not have ADMIN permission.";
  }

  if (status === 404) {
    return "Admin disputes API was not found. Please check backend route.";
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