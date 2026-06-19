import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import proposalService from "../../../services/proposal.service";
import {
  canWithdrawProposal,
  PROPOSAL_STATUS_LABEL,
} from "../../../constants/proposalStatus";

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "SUBMITTED", label: "Submitted" },
  { key: "COUNTER_OFFER", label: "Counter Offer" },
  { key: "ACCEPTED", label: "Accepted" },
  { key: "REJECTED", label: "Rejected" },
  { key: "WITHDRAWN", label: "Cancelled" },
];

export default function MyProposalsPage() {
  const navigate = useNavigate();

  const [proposals, setProposals] = useState([]);
  const [filter, setFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProposals();
  }, []);

  const filteredProposals = useMemo(() => {
    if (filter === "ALL") return proposals;

    return proposals.filter(
      (proposal) => String(proposal.status || "").toUpperCase() === filter
    );
  }, [proposals, filter]);

  const loadProposals = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await proposalService.getMyProposals();
      setProposals(data);
    } catch (err) {
      console.error("LOAD PROPOSALS ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load proposals."));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelProposal = async (proposalId) => {
    const ok = window.confirm(
      "Are you sure you want to cancel this proposal? This only cancels your submitted proposal."
    );

    if (!ok) return;

    try {
      setActionLoadingId(proposalId);
      setError("");
      setMessage("");

      await proposalService.withdrawProposal(proposalId);

      setMessage("Proposal cancelled successfully.");
      await loadProposals();
    } catch (err) {
      console.error("CANCEL PROPOSAL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot cancel proposal."));
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                My Proposals
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                Proposal management
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                View proposals submitted by you and cancel proposals that are
                still pending.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/expert/jobs")}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
            >
              Browse Jobs
            </button>
          </div>

          {message && (
            <Alert type="success" title="Success" message={message} />
          )}

          {error && (
            <Alert type="danger" title="Proposal error" message={error} />
          )}

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
              Loading proposals...
            </div>
          )}

          {!loading && filteredProposals.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#151a22] p-12 text-center">
              <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                description
              </span>

              <h2 className="text-xl font-bold text-white">
                No proposals found
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                Browse jobs and send your first proposal.
              </p>

              <button
                type="button"
                onClick={() => navigate("/expert/jobs")}
                className="mt-6 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
              >
                Browse Jobs
              </button>
            </div>
          )}

          {!loading && filteredProposals.length > 0 && (
            <div className="grid grid-cols-1 gap-5">
              {filteredProposals.map((proposal) => (
                <ProposalCard
                  key={proposal.proposalId}
                  proposal={proposal}
                  actionLoadingId={actionLoadingId}
                  onCancelProposal={handleCancelProposal}
                  onViewDetail={() =>
                    navigate(`/expert/proposals/${proposal.proposalId}`)
                  }
                  onViewJob={() => navigate(`/expert/jobs/${proposal.jobId}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ExpertLayout>
  );
}

function ProposalCard({
  proposal,
  actionLoadingId,
  onCancelProposal,
  onViewDetail,
  onViewJob,
}) {
  const status = String(proposal.status || "").toUpperCase();

  return (
    <article className="rounded-2xl border border-white/10 bg-[#151a22] p-6 transition hover:border-cyan-400/40">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
              Submitted {formatDate(proposal.createdAt)}
            </span>
          </div>

          <h2 className="text-xl font-bold text-white">
            {proposal.jobTitle || "Untitled Job"}
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Client: {proposal.clientName || "Client"}
          </p>

          <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-400">
            {proposal.coverLetter || "No cover letter."}
          </p>

          {proposal.counterMessage && (
            <div className="mt-4 rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-4 text-yellow-100">
              <p className="text-xs font-bold uppercase tracking-wider">
                Counter Offer
              </p>

              <p className="mt-2 text-sm leading-6">
                {proposal.counterMessage}
              </p>
            </div>
          )}
        </div>

        <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 lg:w-72">
          <div className="space-y-4">
            <Info
              label="Proposed Price"
              value={`$${proposal.proposedPrice || 0}`}
            />

            <Info
              label="Timeline"
              value={`${proposal.proposedTimelineDays || 0} days`}
            />

            {proposal.counterPrice && (
              <Info label="Counter Price" value={`$${proposal.counterPrice}`} />
            )}

            {proposal.counterTimelineDays && (
              <Info
                label="Counter Timeline"
                value={`${proposal.counterTimelineDays} days`}
              />
            )}

            {proposal.contractId && (
              <Info label="Contract ID" value={`#${proposal.contractId}`} />
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onViewDetail}
                className="flex-1 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
              >
                Detail
              </button>

              <button
                type="button"
                onClick={onViewJob}
                className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-cyan-400/50 hover:text-cyan-300"
              >
                Job
              </button>
            </div>

            {canWithdrawProposal(status) && (
              <button
                type="button"
                disabled={actionLoadingId === proposal.proposalId}
                onClick={() => onCancelProposal(proposal.proposalId)}
                className="w-full rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoadingId === proposal.proposalId
                  ? "Cancelling..."
                  : "Cancel Proposal"}
              </button>
            )}
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
      <p className="mt-1 font-bold text-white">{value || "N/A"}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const style =
    status === "ACCEPTED"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : status === "REJECTED" || status === "WITHDRAWN"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : status === "COUNTER_OFFER"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {getProposalStatusLabel(status)}
    </span>
  );
}

function getProposalStatusLabel(status) {
  const value = String(status || "").toUpperCase();

  if (value === "WITHDRAWN") return "CANCELLED";

  return PROPOSAL_STATUS_LABEL[value] || value;
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

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString();
}

function getFriendlyError(err, fallback) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.title ||
    err?.message ||
    fallback
  );
}