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
  { key: "CANCELLED", label: "Cancelled" },
];

export default function MyProposalsPage() {
  const navigate = useNavigate();

  const [proposals, setProposals] = useState([]);
  const [draftCount, setDraftCount] = useState(0);

  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [cancelModal, setCancelModal] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadPage();
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
      {
        ALL: 0,
        SUBMITTED: 0,
        ACCEPTED: 0,
        REJECTED: 0,
        CANCELLED: 0,
      }
    );
  }, [proposals]);

  const loadPage = async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      setMessage("");

      const [proposalResult, draftResult] = await Promise.allSettled([
        proposalService.getMyProposals(),
        typeof proposalService.getMyDraftProposals === "function"
          ? proposalService.getMyDraftProposals()
          : Promise.resolve([]),
      ]);

      if (proposalResult.status === "fulfilled") {
        setProposals(
          Array.isArray(proposalResult.value) ? proposalResult.value : []
        );
      } else {
        throw proposalResult.reason;
      }

      if (draftResult.status === "fulfilled") {
        setDraftCount(
          Array.isArray(draftResult.value) ? draftResult.value.length : 0
        );
      }
    } catch (err) {
      console.error("LOAD PROPOSALS ERROR:", err?.response?.data || err);
      setError(getFriendlyProposalError(err, "Cannot load proposals."));
      setProposals([]);
      setDraftCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
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

    setError("Cannot open contract because proposal id is missing.");
  };

  const handleOpenCancelProposal = async (proposal) => {
    const proposalId = getProposalId(proposal);

    if (!proposalId) {
      setError("Cannot cancel this proposal because proposal id is missing.");
      return;
    }

    try {
      setActionLoadingId(proposalId);
      setError("");
      setMessage("");

      let warning = null;

      if (typeof proposalService.getWithdrawWarning === "function") {
        warning = await proposalService.getWithdrawWarning(proposalId);
      }

      setCancelModal({
        proposal,
        proposalId,
        warning: normalizeCancelWarning(warning),
        reason: "",
      });
    } catch (err) {
      console.error("LOAD CANCEL WARNING ERROR:", err?.response?.data || err);
      setCancelModal({
        proposal,
        proposalId,
        warning: normalizeCancelWarning(null),
        reason: "",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmCancelProposal = async () => {
    if (!cancelModal?.proposalId) return;

    const warning = cancelModal.warning || {};
    const reason = String(cancelModal.reason || "").trim();

    if (warning.requiresReason && !reason) {
      setError("Please enter a reason before cancelling this proposal.");
      return;
    }

    try {
      setActionLoadingId(cancelModal.proposalId);
      setError("");
      setMessage("");

      await proposalService.withdrawProposal(cancelModal.proposalId, reason);

      setCancelModal(null);
      setMessage("Proposal cancelled successfully.");
      await loadPage({ silent: true });
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
                Track submitted proposals, update versions, manage drafts, or
                open contracts for accepted proposals.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate("/expert/proposal/drafts")}
                className="relative w-fit rounded-xl border border-purple-400/50 bg-purple-400/10 px-4 py-2.5 text-sm font-bold text-purple-300 transition hover:bg-purple-400 hover:text-black"
              >
                My Drafts
                {draftCount > 0 && (
                  <span className="ml-2 rounded-full bg-purple-300 px-2 py-0.5 text-[11px] font-black text-black">
                    {draftCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate("/expert/jobs")}
                className="w-fit rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2.5 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
              >
                Browse Jobs
              </button>
            </div>
          </div>

          {message && (
            <Alert type="success" title="Success" message={message} />
          )}

          {error && (
            <Alert type="danger" title="Proposal error" message={error} />
          )}

          <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
            <SummaryCard label="Total" value={counters.ALL || 0} icon="list_alt" />
            <SummaryCard
              label="Submitted"
              value={counters.SUBMITTED || 0}
              icon="schedule"
            />
            <SummaryCard
              label="Accepted"
              value={counters.ACCEPTED || 0}
              icon="check_circle"
            />
            <SummaryCard label="Drafts" value={draftCount} icon="draft" />
          </section>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
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

            <button
              type="button"
              onClick={() => loadPage({ silent: true })}
              disabled={refreshing}
              className="text-xs font-black uppercase tracking-wider text-cyan-300 transition hover:text-cyan-200 disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
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

              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/expert/proposal/drafts")}
                  className="rounded-xl border border-purple-400/50 bg-purple-400/10 px-5 py-3 text-sm font-bold text-purple-300 transition hover:bg-purple-400 hover:text-black"
                >
                  View Drafts
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/expert/jobs")}
                  className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                >
                  Browse Jobs
                </button>
              </div>
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
                  onCancel={() => handleOpenCancelProposal(proposal)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {cancelModal && (
        <CancelProposalModal
          modal={cancelModal}
          actionLoadingId={actionLoadingId}
          onReasonChange={(reason) =>
            setCancelModal((prev) => ({
              ...prev,
              reason,
            }))
          }
          onClose={() => setCancelModal(null)}
          onConfirm={handleConfirmCancelProposal}
        />
      )}
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

          {statusGroup !== "REJECTED" && (
            <ActionButton label="Versions" tone="purple" onClick={onVersions} />
          )}

          {jobId && <ActionButton label="Job" tone="gray" onClick={onJob} />}

          {shouldShowContract && statusGroup !== "REJECTED" && (
            <ActionButton label="Contract" tone="green" onClick={onContract} />
          )}

          {canResubmitProposal(statusGroup) && (
            <ActionButton label="Resubmit" tone="yellow" onClick={onResubmit} />
          )}

          {canCancelProposal(statusGroup) && (
            <ActionButton
              label={
                String(actionLoadingId) === String(proposalId)
                  ? "Loading..."
                  : "Cancel Proposal"
              }
              tone="red"
              disabled={String(actionLoadingId) === String(proposalId)}
              onClick={onCancel}
            />
          )}
        </div>
      </div>
    </article>
  );
}

function CancelProposalModal({
  modal,
  actionLoadingId,
  onReasonChange,
  onClose,
  onConfirm,
}) {
  const proposal = modal.proposal;
  const warning = modal.warning || {};
  const proposalId = modal.proposalId;
  const isLoading = String(actionLoadingId) === String(proposalId);

  const title = formatDisplayValue(
    proposal?.jobTitle ||
      proposal?.JobTitle ||
      proposal?.projectTitle ||
      proposal?.ProjectTitle ||
      "this proposal"
  );

  const consequences = Array.isArray(warning.consequences)
    ? warning.consequences.filter(Boolean)
    : [];

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-red-400/30 bg-[#151a22] shadow-[0_30px_120px_rgba(0,0,0,0.65)]">
        <div className="border-b border-white/10 p-5">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-400/30 bg-red-400/10">
              <span className="material-symbols-outlined text-3xl text-red-300">
                cancel
              </span>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-red-300">
                Cancel Proposal
              </p>

              <h2 className="mt-2 text-xl font-extrabold text-white">
                Are you sure?
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-400">
                You are about to cancel your proposal for{" "}
                <span className="font-bold text-white">{title}</span>.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4">
            <p className="text-sm leading-6 text-red-100">
              {warning.message ||
                "After cancelling, this proposal will no longer be considered for this job."}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-gray-500">
              What will happen
            </p>

            <ul className="space-y-2 text-sm leading-6 text-gray-300">
              {consequences.length > 0 ? (
                consequences.map((item, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="material-symbols-outlined mt-0.5 text-[17px] text-yellow-300">
                      warning
                    </span>
                    <span>{formatDisplayValue(item)}</span>
                  </li>
                ))
              ) : (
                <>
                  <li className="flex gap-2">
                    <span className="material-symbols-outlined mt-0.5 text-[17px] text-yellow-300">
                      warning
                    </span>
                    <span>
                      Your proposal will no longer be active for this job.
                    </span>
                  </li>

                  <li className="flex gap-2">
                    <span className="material-symbols-outlined mt-0.5 text-[17px] text-yellow-300">
                      warning
                    </span>
                    <span>The client will not be able to accept it.</span>
                  </li>

                  <li className="flex gap-2">
                    <span className="material-symbols-outlined mt-0.5 text-[17px] text-yellow-300">
                      warning
                    </span>
                    <span>This action cannot be undone.</span>
                  </li>
                </>
              )}
            </ul>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-gray-400">
              Reason {warning.requiresReason ? "(required)" : "(optional)"}
            </label>

            <textarea
              value={modal.reason || ""}
              onChange={(event) => onReasonChange(event.target.value)}
              rows={3}
              placeholder="Example: I am no longer available for this project."
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-red-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Keep Proposal
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className="rounded-xl border border-red-400/50 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Cancelling..." : "Cancel Proposal"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#151a22] p-5">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-white">
        {formatNumber(value)}
      </p>
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

function normalizeCancelWarning(warning) {
  const raw = warning?.raw || warning?.Raw || warning || {};

  const consequences =
    raw.consequences ||
    raw.Consequences ||
    raw.notes ||
    raw.Notes ||
    raw.items ||
    raw.Items ||
    [];

  return {
    canWithdraw:
      raw.canWithdraw === undefined && raw.CanWithdraw === undefined
        ? true
        : Boolean(raw.canWithdraw ?? raw.CanWithdraw),
    title: raw.title || raw.Title || "Cancel Proposal",
    message:
      raw.message ||
      raw.Message ||
      raw.warningMessage ||
      raw.WarningMessage ||
      raw.detail ||
      raw.Detail ||
      "After cancelling, this proposal will no longer be considered for this job.",
    consequences: Array.isArray(consequences)
      ? consequences
      : String(consequences || "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
    requiresReason: Boolean(
      raw.requiresReason ??
        raw.RequiresReason ??
        raw.reasonRequired ??
        raw.ReasonRequired ??
        false
    ),
    raw,
  };
}

function getProposalId(proposal) {
  const raw = proposal?.raw || proposal?.Raw || proposal || {};

  return (
    proposal?.proposalId ||
    proposal?.ProposalId ||
    proposal?.proposalID ||
    proposal?.ProposalID ||
    proposal?.id ||
    proposal?.Id ||
    proposal?.expertProposalId ||
    proposal?.ExpertProposalId ||
    raw?.proposalId ||
    raw?.ProposalId ||
    raw?.proposalID ||
    raw?.ProposalID ||
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
    proposal?.jobPostingId ||
    proposal?.JobPostingId ||
    proposal?.projectId ||
    proposal?.ProjectId ||
    proposal?.job?.jobId ||
    proposal?.job?.id ||
    proposal?.Job?.JobId ||
    proposal?.Job?.Id ||
    raw?.jobId ||
    raw?.JobId ||
    raw?.jobPostingId ||
    raw?.JobPostingId ||
    raw?.projectId ||
    raw?.ProjectId ||
    raw?.job?.jobId ||
    raw?.job?.id ||
    raw?.Job?.JobId ||
    raw?.Job?.Id ||
    ""
  );
}

function getContractId(proposal) {
  const raw = proposal?.raw || proposal?.Raw || proposal || {};

  return (
    proposal?.contractId ||
    proposal?.ContractId ||
    proposal?.contractID ||
    proposal?.ContractID ||
    proposal?.contract?.contractId ||
    proposal?.contract?.ContractId ||
    proposal?.contract?.contractID ||
    proposal?.contract?.ContractID ||
    proposal?.contract?.id ||
    proposal?.contract?.Id ||
    proposal?.Contract?.ContractId ||
    proposal?.Contract?.ContractID ||
    proposal?.Contract?.Id ||
    proposal?.projectContractId ||
    proposal?.ProjectContractId ||
    proposal?.projectContractID ||
    proposal?.ProjectContractID ||
    raw?.contractId ||
    raw?.ContractId ||
    raw?.contractID ||
    raw?.ContractID ||
    raw?.contract?.contractId ||
    raw?.contract?.ContractId ||
    raw?.contract?.contractID ||
    raw?.contract?.ContractID ||
    raw?.contract?.id ||
    raw?.contract?.Id ||
    raw?.Contract?.ContractId ||
    raw?.Contract?.ContractID ||
    raw?.Contract?.Id ||
    raw?.projectContractId ||
    raw?.ProjectContractId ||
    raw?.projectContractID ||
    raw?.ProjectContractID ||
    ""
  );
}

function getProposalStatus(proposal) {
  const raw = proposal?.raw || proposal?.Raw || proposal || {};

  return String(
    proposal?.status ||
      proposal?.Status ||
      raw?.status ||
      raw?.Status ||
      "SUBMITTED"
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
      "PENDING_REVIEW",
      "UNDER_REVIEW",
      "REVISION_REQUESTED",
      "NEEDS_REVISION",
      "RESUBMISSION_REQUESTED",
      "RESUBMITTED",
    ].includes(value)
  ) {
    return "SUBMITTED";
  }

  if (["REJECTED", "NOT_SELECTED", "DECLINED"].includes(value)) {
    return "REJECTED";
  }

  if (["ACCEPTED", "APPROVED", "SELECTED"].includes(value)) {
    return "ACCEPTED";
  }

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
    CANCELLED: "Cancelled",
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
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("vi-VN");
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