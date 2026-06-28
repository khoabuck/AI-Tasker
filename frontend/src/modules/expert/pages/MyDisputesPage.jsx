import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import disputeService from "../../../services/dispute.service";
import {
  DISPUTE_STATUS_LABEL,
  RESOLUTION_TYPE_LABEL,
} from "../../../constants/disputeStatus";

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "UNDER_REVIEW", label: "Under Review" },
  { key: "RESOLVED", label: "Resolved" },
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

    return disputes.filter(
      (item) => String(item.status || "").toUpperCase() === filter
    );
  }, [disputes, filter]);

  const loadDisputes = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await disputeService.getMyDisputes();

      setDisputes(data);
    } catch (err) {
      console.error("LOAD MY DISPUTES ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load disputes."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
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

          {loading && (
            <div className="rounded-2xl border border-white/10 bg-[#151a22] p-12 text-center text-gray-400">
              Loading disputes...
            </div>
          )}

          {!loading && filteredDisputes.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#151a22] p-12 text-center">
              <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                gavel
              </span>

              <h2 className="text-xl font-bold text-white">
                No disputes found
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                You can open a dispute from a project detail page.
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

function DisputeCard({ dispute, onDetail, onProject }) {
  const status = String(dispute.status || "").toUpperCase();

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
            {dispute.projectTitle || `Dispute #${dispute.disputeId}`}
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Respondent: {dispute.respondentName || "Respondent"}
          </p>

          <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-400">
            {dispute.reason || "No reason."}
          </p>

          {dispute.resolutionType && (
            <div className="mt-4 rounded-xl border border-green-400/30 bg-green-400/10 p-4 text-green-200">
              <p className="text-xs font-bold uppercase tracking-wider">
                Resolution
              </p>

              <p className="mt-2 text-sm leading-6">
                {RESOLUTION_TYPE_LABEL[dispute.resolutionType] ||
                  dispute.resolutionType}
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
                dispute.milestoneId
                  ? `#${dispute.milestoneId}`
                  : "Whole project"
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
  const style =
    status === "RESOLVED"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : status === "UNDER_REVIEW"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : "border-red-400/30 bg-red-400/10 text-red-300";

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

function formatMoney(value) {
  const number = Number(value || 0);
  if (!number) return "$0";
  return `$${number.toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString();
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