import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import disputeService from "../../../services/dispute.service";
import {
  DISPUTE_STATUS_LABEL,
  RESOLUTION_TYPE_LABEL,
} from "../../../constants/disputeStatus";

import { formatDateTime } from "../../../utils/dateTime.utils";
const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "UNDER_REVIEW", label: "Under Review" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "CLOSED", label: "Closed" },
  { key: "REJECTED", label: "Rejected" },
];

export default function MyDisputesPage() {
  const navigate = useNavigate();

  const [disputes, setDisputes] = useState([]);
  const [filter, setFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDisputes();
  }, []);

  const filteredDisputes = useMemo(() => {
    if (filter === "ALL") return disputes;

    return disputes.filter((item) =>
      matchesDisputeFilter(item?.status, filter)
    );
  }, [disputes, filter]);

  const loadDisputes = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await disputeService.getMyDisputes();
      setDisputes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("LOAD MY DISPUTES ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load disputes."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ExpertLayout>
      <div className="px-5 py-7 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                My Disputes
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                Dispute management
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Track disputes you opened or are involved in, and submit
                evidence when needed.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/expert/projects")}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
            >
              View Projects
            </button>
          </div>

          {error && <Alert title="Dispute error" message={error} />}

          <div className="mb-6 flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                  filter === item.key
                    ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-300"
                    : "border-white/10 bg-white/[0.03] text-gray-400 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {loading && <ListSkeleton rows={5} />}

          {!loading && filteredDisputes.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#151a22] p-12 text-center">
              <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                gavel
              </span>

              <h2 className="text-xl font-bold text-white">
                No disputes found
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                You can open a dispute from an eligible milestone detail page.
              </p>

              <button
                type="button"
                onClick={() => navigate("/expert/projects")}
                className="mt-6 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
              >
                Go to Projects
              </button>
            </div>
          )}

          {!loading && filteredDisputes.length > 0 && (
            <div className="grid grid-cols-1 gap-5">
              {filteredDisputes.map((dispute) => (
                <DisputeCard
                  key={dispute.disputeId}
                  dispute={dispute}
                  onDetail={() =>
                    navigate(`/expert/disputes/${dispute.disputeId}`)
                  }
                  onProject={() =>
                    dispute.projectId &&
                    navigate(`/expert/projects/${dispute.projectId}`)
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ExpertLayout>
  );
}


function ListSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-white/10 bg-[#151a22] p-5"
        >
          <div className="flex gap-4">
            <div className="h-11 w-11 shrink-0 rounded-xl bg-white/10" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-1/3 rounded bg-white/10" />
              <div className="mt-3 h-4 w-4/5 rounded bg-white/[0.06]" />
              <div className="mt-2 h-4 w-2/3 rounded bg-white/[0.05]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


function DisputeCard({ dispute, onDetail, onProject }) {
  const status = String(dispute.status || "").toUpperCase();
  const resolutionLabel =
    RESOLUTION_TYPE_LABEL[dispute.resolutionType] || dispute.resolutionType;

  return (
    <article className="rounded-2xl border border-white/10 bg-[#151a22] p-6 transition hover:border-cyan-400/40">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
              {formatDate(dispute.createdAt)}
            </span>

            {dispute.projectId && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                Project #{dispute.projectId}
              </span>
            )}
          </div>

          <h2 className="text-xl font-bold text-white">
            {dispute.projectTitle || "Project dispute"}
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Respondent: {dispute.respondentName || "Respondent"}
          </p>

          <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-400">
            {dispute.reason || "No reason."}
          </p>

          {resolutionLabel && (
            <div className="mt-4 rounded-xl border border-green-400/30 bg-green-400/10 p-4 text-green-200">
              <p className="text-xs font-bold uppercase tracking-wider">
                Resolution
              </p>

              <p className="mt-2 text-sm leading-6">{resolutionLabel}</p>
            </div>
          )}

          {dispute.adminDecision && (
            <div className="mt-4 rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-4 text-cyan-100">
              <p className="text-xs font-bold uppercase tracking-wider">
                Admin Decision
              </p>

              <p className="mt-2 line-clamp-3 text-sm leading-6">
                {dispute.adminDecision}
              </p>
            </div>
          )}
        </div>

        <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 lg:w-72">
          <div className="space-y-4">
            <Info
              label="Disputed Amount"
              value={formatMoney(dispute.disputedAmount)}
            />

            <Info
              label="Milestone"
              value={
                dispute.milestoneTitle ||
                (dispute.milestoneId
                  ? "Related milestone"
                  : "Whole project")
              }
            />

            <Info
              label="Status"
              value={DISPUTE_STATUS_LABEL[status] || status}
            />

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onDetail}
                className="flex-1 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
              >
                Detail
              </button>

              <button
                type="button"
                onClick={onProject}
                disabled={!dispute.projectId}
                className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-cyan-400/50 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Project
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 break-words font-bold text-white">{value || "N/A"}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const group = getDisputeStatusGroup(status);

  const style =
    group === "RESOLVED"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : group === "ACTIVE"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : group === "REJECTED"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : "border-gray-400/30 bg-gray-400/10 text-gray-300";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {DISPUTE_STATUS_LABEL[status] || status}
    </span>
  );
}

function Alert({ title, message }) {
  return (
    <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
      <p className="font-bold">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}


function getDisputeStatusGroup(status) {
  const value = String(status || "").trim().toUpperCase();

  if (
    ["OPEN", "UNDER_REVIEW", "PENDING", "INVESTIGATING", "EVIDENCE_REQUIRED"].includes(
      value
    )
  ) {
    return "ACTIVE";
  }

  if (["RESOLVED", "CLOSED", "COMPLETED"].includes(value)) {
    return "RESOLVED";
  }

  if (["REJECTED", "CANCELLED", "CANCELED"].includes(value)) {
    return "REJECTED";
  }

  return "OTHER";
}

function matchesDisputeFilter(status, filter) {
  const value = String(status || "").trim().toUpperCase();

  if (filter === "ALL") return true;
  if (filter === "OPEN") return value === "OPEN";
  if (filter === "UNDER_REVIEW") {
    return ["UNDER_REVIEW", "PENDING", "INVESTIGATING", "EVIDENCE_REQUIRED"].includes(
      value
    );
  }
  if (filter === "RESOLVED") {
    return ["RESOLVED", "COMPLETED"].includes(value);
  }
  if (filter === "CLOSED") return value === "CLOSED";
  if (filter === "REJECTED") {
    return ["REJECTED", "CANCELLED", "CANCELED"].includes(value);
  }

  return value === filter;
}

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isNaN(number) ? 0 : number);
}

function formatDate(value) {
  return formatDateTime(value, "N/A");
}

function getFriendlyError(err, fallback) {
  const status = err?.response?.status;

  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 403) {
    return "You do not have access to these dispute records.";
  }

  if (status === 404) {
    return "Dispute information is temporarily unavailable.";
  }

  const data = err?.response?.data;

  if (typeof data === "string" && data.trim()) return data;

  return (
    data?.message ||
    data?.title ||
    data?.detail ||
    err?.message ||
    fallback
  );
}