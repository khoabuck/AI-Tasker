import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminDisputeService from "../../../services/adminDispute.service";

import { formatDateTime } from "../../../utils/dateTime.utils";
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

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const handleResolveDispute = async () => {
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
            <div className="p-12 text-center text-gray-400">
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                hourglass_empty
              </span>
              Loading disputes...
            </div>
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
            onConfirm={handleResolveDispute}
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
      </div>
    </AdminLayout>
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
    <section className="mt-4 overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#10161f]">
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
            Dispute Detail
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Review the case information and evidence directly here.
          </p>
        </div>

        {canResolve && (
          <button
            type="button"
            onClick={onResolve}
            className="w-fit rounded-xl border border-green-400/40 bg-green-400/10 px-4 py-2 text-xs font-bold text-green-300 transition hover:bg-green-400 hover:text-black"
          >
            Resolve Dispute
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-4">
          <DetailSection title="Reason" icon="report_problem">
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-300">
              {dispute.reason || dispute.description || "No reason provided."}
            </p>
          </DetailSection>

          <DetailSection
            title={`Evidence (${evidences.length})`}
            icon="fact_check"
          >
            {evidences.length === 0 ? (
              <p className="text-sm text-gray-500">No evidence uploaded.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {evidences.map((evidence, index) => (
                  <EvidenceItem
                    key={evidence.evidenceId || evidence.id || index}
                    evidence={evidence}
                    compact
                  />
                ))}
              </div>
            )}
          </DetailSection>

          {dispute.adminDecision && (
            <DetailSection title="Admin Decision" icon="gavel" tone="green">
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-green-100/80">
                {dispute.adminDecision}
              </p>
            </DetailSection>
          )}
        </div>

        <aside className="space-y-3">
          <InfoBox label="Status" value={formatLabel(status)} />
          <InfoBox
            label="Disputed Amount"
            value={formatMoney(dispute.disputedAmount)}
          />
          <InfoBox label="Created" value={formatDate(dispute.createdAt)} />
          <InfoBox
            label="Client"
            value={dispute.clientName || "Client"}
          />
          <InfoBox
            label="Expert"
            value={dispute.expertName || "Expert"}
          />
          {dispute.milestoneTitle && (
            <InfoBox label="Milestone" value={dispute.milestoneTitle} />
          )}
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

function EvidenceItem({ evidence, compact = false }) {
  const title =
    evidence.title ||
    evidence.Title ||
    evidence.uploadedByName ||
    evidence.UploadedByName ||
    "Evidence";

  const description =
    evidence.evidenceText ||
    evidence.EvidenceText ||
    evidence.description ||
    evidence.Description ||
    evidence.note ||
    evidence.Note ||
    "";

  const fileUrl =
    evidence.fileUrl ||
    evidence.FileUrl ||
    evidence.evidenceFileUrl ||
    evidence.EvidenceFileUrl ||
    evidence.url ||
    evidence.Url ||
    "";

  const imageUrl =
    evidence.imageUrl ||
    evidence.ImageUrl ||
    evidence.evidenceImageUrl ||
    evidence.EvidenceImageUrl ||
    "";

  return (
    <article
      className={`min-w-0 rounded-xl border border-white/10 bg-black/10 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <p className="truncate text-sm font-bold text-white">{title}</p>

      {description && (
        <p
          className={`mt-2 whitespace-pre-wrap break-words text-sm leading-5 text-gray-400 ${
            compact ? "line-clamp-4" : ""
          }`}
        >
          {description}
        </p>
      )}

      {imageUrl && (
        <a
          href={imageUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block overflow-hidden rounded-lg border border-white/10 bg-black/20"
        >
          <img
            src={imageUrl}
            alt="Evidence"
            className={`w-full object-contain ${
              compact ? "max-h-36" : "max-h-72"
            }`}
          />
        </a>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
          >
            <span className="material-symbols-outlined text-[15px]">
              open_in_new
            </span>
            Open File
          </a>
        )}

        {imageUrl && (
          <a
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-purple-400/40 bg-purple-400/10 px-3 py-1.5 text-xs font-bold text-purple-200 transition hover:bg-purple-400 hover:text-black"
          >
            <span className="material-symbols-outlined text-[15px]">
              image
            </span>
            Full Image
          </a>
        )}
      </div>
    </article>
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