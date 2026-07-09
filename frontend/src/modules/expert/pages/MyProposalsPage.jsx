import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import proposalService, {
  getFriendlyProposalError,
} from "../../../services/proposal.service";

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "SUBMITTED", label: "Submitted" },
  { key: "ACCEPTED", label: "Accepted" },
  { key: "REJECTED", label: "Rejected" },
  { key: "CANCELLED", label: "Cancel" },
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

    return proposals.filter((proposal) => {
      return getProposalStatusGroup(getProposalStatus(proposal)) === filter;
    });
  }, [proposals, filter]);

  const counters = useMemo(() => {
    return proposals.reduce(
      (result, proposal) => {
        const group = getProposalStatusGroup(getProposalStatus(proposal));

        result.ALL += 1;
        result[group] = (result[group] || 0) + 1;

        return result;
      },
      { ALL: 0 }
    );
  }, [proposals]);

  const loadProposals = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await proposalService.getMyProposals();
      setProposals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("LOAD PROPOSALS ERROR:", err?.response?.data || err);
      setError(getFriendlyProposalError(err, "Cannot load proposals."));
      setProposals([]);
    } finally {
      setLoading(false);
    }
  };

  const goToProposalDetail = (proposal) => {
    const proposalId = getProposalId(proposal);

    if (!proposalId) {
      setError("Cannot open this proposal because proposal id is missing.");
      return;
    }

    navigate(`/expert/proposals/${proposalId}`);
  };

  const goToProposalVersions = (proposal) => {
    const proposalId = getProposalId(proposal);

    if (!proposalId) {
      setError("Cannot open proposal versions because proposal id is missing.");
      return;
    }

    navigate(`/expert/proposals/${proposalId}/versions`);
  };

  const goToProposalResubmit = (proposal) => {
    const proposalId = getProposalId(proposal);

    if (!proposalId) {
      setError("Cannot resubmit this proposal because proposal id is missing.");
      return;
    }

    navigate(`/expert/proposals/${proposalId}/resubmit`);
  };

  const goToJob = (proposal) => {
    const jobId = getJobId(proposal);

    if (!jobId) {
      setError("Cannot open job because job id is missing.");
      return;
    }

    navigate(`/expert/jobs/${jobId}`);
  };

  const goToContract = (proposal) => {
    const proposalId = getProposalId(proposal);
    const contractId = getContractId(proposal);

    if (contractId) {
      navigate(`/expert/contracts/${contractId}`);
      return;
    }

    if (proposalId) {
      navigate(`/expert/proposals/${proposalId}/contract`);
      return;
    }

    setError("Cannot open contract because contract information is missing.");
  };

  const handleCancelProposal = async (proposal) => {
    const proposalId = getProposalId(proposal);

    if (!proposalId) {
      setError("Cannot cancel this proposal because proposal id is missing.");
      return;
    }

    const ok = window.confirm("Are you sure you want to cancel this proposal?");

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
      setError(getFriendlyProposalError(err, "Cannot cancel proposal."));
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <ExpertLayout>
      <div className="px-5 py-8 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                My Proposals
              </p>

              <h1 className="text-2xl font-bold text-white md:text-3xl">
                Proposal management
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                Track submitted proposals, update versions, or open contracts
                for accepted proposals.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/expert/jobs")}
              className="w-fit rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2.5 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
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

          <div className="mb-5 flex flex-wrap gap-2">
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
                <span className="ml-2 text-[11px] opacity-70">
                  {counters[item.key] || 0}
                </span>
              </button>
            ))}
          </div>

          {loading && (
            <div className="rounded-2xl border border-white/10 bg-[#151a22] p-10 text-center text-gray-400">
              Loading proposals...
            </div>
          )}

          {!loading && filteredProposals.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#151a22] p-10 text-center">
              <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                description
              </span>

              <h2 className="text-xl font-bold text-white">
                No proposals found
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                Browse open jobs and send your first proposal.
              </p>

              <button
                type="button"
                onClick={() => navigate("/expert/jobs")}
                className="mt-5 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
              >
                Browse Jobs
              </button>
            </div>
          )}

          {!loading && filteredProposals.length > 0 && (
            <div className="space-y-3">
              {filteredProposals.map((proposal, index) => (
                <ProposalRow
                  key={getProposalId(proposal) || index}
                  proposal={proposal}
                  actionLoadingId={actionLoadingId}
                  onDetail={() => goToProposalDetail(proposal)}
                  onVersions={() => goToProposalVersions(proposal)}
                  onResubmit={() => goToProposalResubmit(proposal)}
                  onJob={() => goToJob(proposal)}
                  onContract={() => goToContract(proposal)}
                  onCancel={() => handleCancelProposal(proposal)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ExpertLayout>
  );
}

function ProposalRow({
  proposal,
  actionLoadingId,
  onDetail,
  onVersions,
  onResubmit,
  onJob,
  onContract,
  onCancel,
}) {
  const proposalId = getProposalId(proposal);
  const jobId = getJobId(proposal);
  const contractId = getContractId(proposal);
  const status = getProposalStatus(proposal);
  const statusGroup = getProposalStatusGroup(status);

  const milestones = Array.isArray(proposal?.milestones)
    ? proposal.milestones
    : [];

  const milestoneTotal = milestones.reduce((total, milestone) => {
    const amount = Number(milestone?.amount || milestone?.Amount || 0);
    return total + (Number.isNaN(amount) ? 0 : amount);
  }, 0);

  const title = formatDisplayValue(
    proposal?.jobTitle ||
      proposal?.JobTitle ||
      proposal?.projectTitle ||
      proposal?.ProjectTitle ||
      "Untitled Job"
  );

  const clientName = formatDisplayValue(
    proposal?.clientName ||
      proposal?.ClientName ||
      proposal?.client?.fullName ||
      proposal?.Client?.FullName ||
      "Client"
  );

  const price =
    proposal?.proposedPrice ||
    proposal?.ProposedPrice ||
    proposal?.bidAmount ||
    proposal?.BidAmount ||
    0;

  const timeline =
    proposal?.proposedTimelineDays ||
    proposal?.ProposedTimelineDays ||
    proposal?.estimatedDurationDays ||
    proposal?.EstimatedDurationDays ||
    0;

  const shouldShowContract = statusGroup === "ACCEPTED" || Boolean(contractId);

  return (
    <article className="rounded-2xl border border-white/10 bg-[#151a22] p-4 transition hover:border-cyan-400/40">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px] lg:items-center">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
              {formatDate(proposal?.submittedAt || proposal?.createdAt)}
            </span>

            {hasVersion(proposal) && (
              <span className="rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1 text-xs font-bold text-purple-300">
                {formatProposalVersion(proposal)}
              </span>
            )}

            {contractId && (
              <span className="rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1 text-xs font-bold text-green-300">
                Contract #{contractId}
              </span>
            )}
          </div>

          <h2 className="truncate text-lg font-bold text-white">{title}</h2>

          <p className="mt-1 text-sm text-gray-500">Client: {clientName}</p>

          <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-400">
            {formatDisplayValue(
              proposal?.coverLetter ||
                proposal?.CoverLetter ||
                proposal?.description ||
                proposal?.Description ||
                "No cover letter."
            )}
          </p>

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-400">
            <MiniInfo label="Price" value={formatMoney(price)} />
            <MiniInfo
              label="Timeline"
              value={`${formatNumber(timeline)} days`}
            />
            <MiniInfo label="Milestones" value={`${milestones.length}`} />
            <MiniInfo label="Total" value={formatMoney(milestoneTotal)} />
          </div>
        </div>

        <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
          <ActionButton label="Detail" tone="cyan" onClick={onDetail} />
          <ActionButton label="Versions" tone="purple" onClick={onVersions} />

          {jobId && <ActionButton label="Job" tone="gray" onClick={onJob} />}

          {shouldShowContract && (
            <ActionButton
              label="Contract"
              tone="green"
              onClick={onContract}
            />
          )}

          {canResubmitProposal(statusGroup) && (
            <ActionButton label="Resubmit" tone="yellow" onClick={onResubmit} />
          )}

          {canCancelProposal(statusGroup) && (
            <ActionButton
              label={actionLoadingId === proposalId ? "Cancelling..." : "Cancel"}
              tone="red"
              disabled={actionLoadingId === proposalId}
              onClick={onCancel}
            />
          )}
        </div>
      </div>
    </article>
  );
}

function MiniInfo({ label, value }) {
  return (
    <span className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1">
      <span className="text-gray-500">{label}: </span>
      <span className="font-bold text-gray-200">
        {formatDisplayValue(value)}
      </span>
    </span>
  );
}

function ActionButton({ label, tone = "gray", disabled = false, onClick }) {
  const styleMap = {
    cyan: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400 hover:text-black",
    purple:
      "border-purple-400/40 bg-purple-400/10 text-purple-300 hover:bg-purple-400 hover:text-black",
    yellow:
      "border-yellow-400/40 bg-yellow-400/10 text-yellow-300 hover:bg-yellow-400 hover:text-black",
    red: "border-red-400/40 bg-red-400/10 text-red-300 hover:bg-red-400 hover:text-black",
    green:
      "border-green-400/40 bg-green-400/10 text-green-300 hover:bg-green-400 hover:text-black",
    gray: "border-white/10 bg-white/[0.04] text-gray-300 hover:border-cyan-400/50 hover:text-cyan-300",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg border px-4 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${styleMap[tone]}`}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }) {
  const group = getProposalStatusGroup(status);

  const map = {
    SUBMITTED: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
    ACCEPTED: "border-green-400/30 bg-green-400/10 text-green-300",
    REJECTED: "border-red-400/30 bg-red-400/10 text-red-300",
    CANCELLED: "border-white/10 bg-white/[0.04] text-gray-400",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
        map[group] || "border-white/10 bg-white/[0.04] text-gray-300"
      }`}
    >
      {getProposalStatusLabel(group)}
    </span>
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
      <p className="mt-1">{formatDisplayValue(message)}</p>
    </div>
  );
}

function getProposalId(proposal) {
  const raw = proposal?.raw || proposal?.Raw || proposal || {};

  return (
    proposal?.proposalId ||
    proposal?.ProposalId ||
    proposal?.id ||
    proposal?.Id ||
    proposal?.expertProposalId ||
    proposal?.ExpertProposalId ||
    raw?.proposalId ||
    raw?.ProposalId ||
    raw?.id ||
    raw?.Id ||
    raw?.expertProposalId ||
    raw?.ExpertProposalId ||
    ""
  );
}

function getJobId(proposal) {
  const raw = proposal?.raw || proposal?.Raw || proposal || {};

  return (
    proposal?.jobId ||
    proposal?.JobId ||
    proposal?.projectId ||
    proposal?.ProjectId ||
    proposal?.job?.jobId ||
    proposal?.Job?.JobId ||
    raw?.jobId ||
    raw?.JobId ||
    raw?.projectId ||
    raw?.ProjectId ||
    raw?.job?.jobId ||
    raw?.Job?.JobId ||
    ""
  );
}

function getContractId(proposal) {
  const raw = proposal?.raw || proposal?.Raw || proposal || {};

  return (
    proposal?.contractId ||
    proposal?.ContractId ||
    proposal?.contract?.contractId ||
    proposal?.Contract?.ContractId ||
    proposal?.projectContractId ||
    proposal?.ProjectContractId ||
    raw?.contractId ||
    raw?.ContractId ||
    raw?.contract?.contractId ||
    raw?.Contract?.ContractId ||
    raw?.projectContractId ||
    raw?.ProjectContractId ||
    ""
  );
}

function getProposalStatus(proposal) {
  const raw = proposal?.raw || proposal?.Raw || proposal || {};

  return String(
    proposal?.status || proposal?.Status || raw?.status || raw?.Status || "SUBMITTED"
  )
    .trim()
    .toUpperCase();
}

function getProposalStatusGroup(status) {
  const value = String(status || "").trim().toUpperCase();

  if (
    [
      "SUBMITTED",
      "PENDING",
      "REVISION_REQUESTED",
      "NEEDS_REVISION",
      "RESUBMISSION_REQUESTED",
    ].includes(value)
  ) {
    return "SUBMITTED";
  }

  if (["REJECTED", "NOT_SELECTED"].includes(value)) {
    return "REJECTED";
  }

  if (value === "ACCEPTED") return "ACCEPTED";

  if (["WITHDRAWN", "CANCELLED", "CANCELED"].includes(value)) {
    return "CANCELLED";
  }

  return "SUBMITTED";
}

function canResubmitProposal(statusGroup) {
  return statusGroup === "SUBMITTED";
}

function canCancelProposal(statusGroup) {
  return statusGroup === "SUBMITTED";
}

function getProposalStatusLabel(statusGroup) {
  const map = {
    SUBMITTED: "Submitted",
    ACCEPTED: "Accepted",
    REJECTED: "Rejected",
    CANCELLED: "Cancel",
  };

  return map[statusGroup] || "Submitted";
}

function hasVersion(proposal) {
  return Boolean(
    proposal?.version ||
      proposal?.Version ||
      proposal?.latestVersion ||
      proposal?.LatestVersion ||
      proposal?.latestVersionNumber ||
      proposal?.LatestVersionNumber
  );
}

function formatProposalVersion(proposal) {
  const version =
    proposal?.latestVersionNumber ||
    proposal?.LatestVersionNumber ||
    proposal?.version ||
    proposal?.Version ||
    proposal?.latestVersion ||
    proposal?.LatestVersion;

  if (!version) return "Version N/A";

  if (typeof version === "object") {
    const versionNumber =
      version.versionNumber ||
      version.VersionNumber ||
      version.version ||
      version.Version ||
      version.proposalVersionId ||
      version.ProposalVersionId ||
      "N/A";

    return `Version ${versionNumber}`;
  }

  return `Version ${version}`;
}

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isNaN(number) ? 0 : number);
}

function formatNumber(value) {
  const number = Number(value || 0);
  return Number.isNaN(number) ? 0 : number;
}

function formatDate(value) {
  if (!value) return "N/A";

  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function formatDisplayValue(value) {
  if (value === undefined || value === null || value === "") return "N/A";

  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(formatDisplayValue).join(", ") : "N/A";
  }

  if (typeof value === "object") {
    return (
      value.name ||
      value.Name ||
      value.title ||
      value.Title ||
      value.label ||
      value.Label ||
      value.status ||
      value.Status ||
      value.versionNumber ||
      value.VersionNumber ||
      value.message ||
      value.Message ||
      "N/A"
    );
  }

  return String(value);
}