import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import proposalService, {
  getFriendlyProposalError,
} from "../../../services/proposal.service";

export default function ProposalDetailPage() {
  const { proposalId } = useParams();
  const navigate = useNavigate();

  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const status = getProposalStatus(proposal);
  const statusGroup = getProposalStatusGroup(status);
  const contractId = getContractId(proposal);
  const currentProposalId = getProposalId(proposal) || proposalId;

  const milestones = useMemo(() => {
    return Array.isArray(proposal?.milestones) ? proposal.milestones : [];
  }, [proposal]);

  const milestoneTotal = useMemo(() => {
    return milestones.reduce((total, milestone) => {
      const amount = Number(milestone?.amount || 0);
      return total + (Number.isNaN(amount) ? 0 : amount);
    }, 0);
  }, [milestones]);

  const milestoneDuration = useMemo(() => {
    return milestones.reduce((total, milestone) => {
      const durationDays = Number(
        milestone?.durationDays ||
          milestone?.DurationDays ||
          milestone?.deadlineOffsetDays ||
          milestone?.DeadlineOffsetDays ||
          0
      );

      return total + (Number.isNaN(durationDays) ? 0 : durationDays);
    }, 0);
  }, [milestones]);

  useEffect(() => {
    loadProposal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId]);

  const loadProposal = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await proposalService.getProposalById(proposalId);
      setProposal(data);
    } catch (err) {
      console.error("LOAD PROPOSAL DETAIL ERROR:", err?.response?.data || err);
      setError(getFriendlyProposalError(err, "Cannot load proposal detail."));
      setProposal(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelProposal = async () => {
    const ok = window.confirm("Are you sure you want to cancel this proposal?");

    if (!ok) return;

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      await proposalService.withdrawProposal(proposalId);

      setMessage("Proposal cancelled successfully.");
      await loadProposal();
    } catch (err) {
      console.error("CANCEL PROPOSAL ERROR:", err?.response?.data || err);
      setError(getFriendlyProposalError(err, "Cannot cancel proposal."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewContract = () => {
    if (contractId) {
      navigate(`/expert/contracts/${contractId}`);
      return;
    }

    if (currentProposalId) {
      navigate(`/expert/proposals/${currentProposalId}/contract`);
      return;
    }

    setError("Cannot open contract because proposal id is missing.");
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading proposal detail...
        </div>
      </ExpertLayout>
    );
  }

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() => navigate("/expert/proposals")}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Back to proposals
          </button>

          {error && (
            <Alert type="danger" title="Proposal error" message={error} />
          )}

          {message && (
            <Alert type="success" title="Success" message={message} />
          )}

          {!proposal && (
            <div className="rounded-2xl border border-white/10 bg-[#151a22] p-10 text-center">
              <p className="text-gray-400">Proposal not found.</p>

              <button
                type="button"
                onClick={() => navigate("/expert/proposals")}
                className="mt-5 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
              >
                Back to Proposals
              </button>
            </div>
          )}

          {proposal && (
            <>
              <section className="mb-6 rounded-3xl border border-white/10 bg-[#151a22] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <StatusBadge status={status} />

                      {hasVersion(proposal) && (
                        <span className="rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1 text-xs font-bold text-purple-300">
                          {formatProposalVersion(proposal)}
                        </span>
                      )}

                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                        Submitted{" "}
                        {formatDate(proposal?.submittedAt || proposal?.createdAt)}
                      </span>
                    </div>

                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                      Proposal Detail
                    </p>

                    <h1 className="text-3xl font-bold text-white md:text-4xl">
                      {formatDisplayValue(
                        proposal?.jobTitle ||
                          proposal?.JobTitle ||
                          proposal?.projectTitle ||
                          proposal?.ProjectTitle ||
                          "Untitled Job"
                      )}
                    </h1>

                    <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                      Client:{" "}
                      <span className="font-bold text-gray-300">
                        {formatDisplayValue(
                          proposal?.clientName ||
                            proposal?.ClientName ||
                            proposal?.client?.fullName ||
                            proposal?.Client?.FullName ||
                            "Client"
                        )}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/expert/proposals/${proposalId}/versions`)
                      }
                      className="rounded-xl border border-purple-400/50 bg-purple-400/10 px-5 py-3 text-sm font-bold text-purple-300 transition hover:bg-purple-400 hover:text-black"
                    >
                      View Versions
                    </button>

                    {canViewContract(statusGroup, contractId) && (
                      <button
                        type="button"
                        onClick={handleViewContract}
                        className="rounded-xl border border-green-400/50 bg-green-400/10 px-5 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black"
                      >
                        View Contract
                      </button>
                    )}

                    {canResubmitProposal(statusGroup) && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/expert/proposals/${proposalId}/resubmit`)
                        }
                        className="rounded-xl border border-yellow-400/50 bg-yellow-400/10 px-5 py-3 text-sm font-bold text-yellow-300 transition hover:bg-yellow-400 hover:text-black"
                      >
                        Resubmit
                      </button>
                    )}

                    {canCancelProposal(statusGroup) && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={handleCancelProposal}
                        className="rounded-xl border border-red-400/50 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionLoading ? "Cancelling..." : "Cancel"}
                      </button>
                    )}

                    {getJobId(proposal) && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/expert/jobs/${getJobId(proposal)}`)
                        }
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
                      >
                        View Job
                      </button>
                    )}
                  </div>
                </div>
              </section>

              {statusGroup === "ACCEPTED" && (
                <AcceptedContractNotice
                  contractId={contractId}
                  onViewContract={handleViewContract}
                />
              )}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
                <main className="space-y-6">
                  <Card title="Cover Letter" icon="description">
                    <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                      {formatDisplayValue(proposal?.coverLetter)}
                    </p>
                  </Card>

                  <Card title="Delivery Plan" icon="task_alt">
                    <DetailBlock
                      label="Expected Outputs"
                      value={proposal?.expectedOutputs}
                    />

                    <DetailBlock
                      label="Working Approach"
                      value={proposal?.workingApproach}
                    />

                    <DetailBlock
                      label="Preliminary Milestone Plan"
                      value={proposal?.preliminaryMilestonePlan}
                    />
                  </Card>

                  <Card title="Milestones" icon="flag">
                    {milestones.length === 0 ? (
                      <EmptyState message="No milestones found." />
                    ) : (
                      <div className="space-y-4">
                        {milestones.map((milestone, index) => (
                          <MilestoneCard
                            key={
                              milestone?.proposalMilestoneId ||
                              milestone?.id ||
                              index
                            }
                            milestone={milestone}
                            index={index}
                          />
                        ))}
                      </div>
                    )}
                  </Card>

                  {(proposal?.counterMessage ||
                    proposal?.decisionNote ||
                    proposal?.rejectionReason) && (
                    <Card title="Client Message" icon="chat">
                      <p className="whitespace-pre-line text-sm leading-7 text-yellow-100">
                        {formatDisplayValue(
                          proposal?.counterMessage ||
                            proposal?.decisionNote ||
                            proposal?.rejectionReason
                        )}
                      </p>
                    </Card>
                  )}
                </main>

                <aside className="space-y-6">
                  <Card title="Summary" icon="monitoring">
                    <div className="space-y-4">
                      <Info
                        label="Status"
                        value={getProposalStatusLabel(statusGroup)}
                      />

                      <Info
                        label="Proposed Price"
                        value={formatMoney(
                          proposal?.proposedPrice ||
                            proposal?.ProposedPrice ||
                            proposal?.bidAmount ||
                            proposal?.BidAmount
                        )}
                      />

                      <Info
                        label="Timeline"
                        value={`${formatNumber(
                          proposal?.proposedTimelineDays ||
                            proposal?.ProposedTimelineDays ||
                            proposal?.estimatedDurationDays ||
                            proposal?.EstimatedDurationDays ||
                            0
                        )} days`}
                      />

                      <Info
                        label="Milestone Total"
                        value={formatMoney(milestoneTotal)}
                      />

                      <Info
                        label="Milestone Days"
                        value={`${milestoneDuration} days`}
                      />

                      <Info
                        label="Version"
                        value={formatProposalVersion(proposal)}
                      />

                      <Info
                        label="Contract"
                        value={
                          contractId
                            ? `#${contractId}`
                            : statusGroup === "ACCEPTED"
                            ? "Available from accepted proposal"
                            : "N/A"
                        }
                      />
                    </div>
                  </Card>

                  <Card title="Dates" icon="event">
                    <div className="space-y-4">
                      <Info
                        label="Submitted At"
                        value={formatDate(
                          proposal?.submittedAt || proposal?.createdAt
                        )}
                      />

                      <Info
                        label="Updated At"
                        value={formatDate(proposal?.updatedAt)}
                      />

                      <Info
                        label="Decided At"
                        value={formatDate(proposal?.decidedAt)}
                      />
                    </div>
                  </Card>
                </aside>
              </div>
            </>
          )}
        </div>
      </div>
    </ExpertLayout>
  );
}

function AcceptedContractNotice({ contractId, onViewContract }) {
  return (
    <section className="mb-6 rounded-3xl border border-green-400/30 bg-green-400/10 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)] md:p-7">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-green-400/40 bg-green-400/10 text-green-300">
            <span className="material-symbols-outlined">verified</span>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">
              Your proposal was accepted
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-green-100/80">
              The client has accepted this proposal. Open the contract to review
              the final terms, milestones, payment amount and confirmation
              status.
            </p>

            {!contractId && (
              <p className="mt-2 text-xs font-semibold text-green-200/80">
                The contract will be loaded using this proposal ID.
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onViewContract}
          className="shrink-0 rounded-xl border border-green-400/50 bg-green-400/10 px-5 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black"
        >
          View Contract
        </button>
      </div>
    </section>
  );
}

function Card({ title, icon, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#151a22] p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
          <span className="material-symbols-outlined text-xl text-[#00F0FF]">
            {icon}
          </span>
        </div>

        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>

      {children}
    </section>
  );
}

function DetailBlock({ label, value }) {
  return (
    <div className="mb-5 last:mb-0">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
        {formatDisplayValue(value)}
      </p>
    </div>
  );
}

function MilestoneCard({ milestone, index }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-bold text-white">
            {formatDisplayValue(milestone?.title || `Milestone ${index + 1}`)}
          </p>

          <p className="mt-1 text-xs text-gray-500">Milestone {index + 1}</p>
        </div>

        <span className="w-fit rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
          {formatMoney(milestone?.amount)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Info
          label="Amount"
          value={formatMoney(milestone?.amount || milestone?.Amount)}
        />

        <Info
          label="Duration"
          value={`${formatNumber(
            milestone?.durationDays ||
              milestone?.DurationDays ||
              milestone?.deadlineOffsetDays ||
              milestone?.DeadlineOffsetDays ||
              0
          )} days`}
        />
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>

      <p className="mt-1 break-words font-bold text-white">
        {formatDisplayValue(value)}
      </p>
    </div>
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

function EmptyState({ message }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm text-gray-400">
      {message}
    </div>
  );
}

function getProposalId(proposal) {
  return (
    proposal?.proposalId ||
    proposal?.ProposalId ||
    proposal?.id ||
    proposal?.Id ||
    ""
  );
}

function getContractId(proposal) {
  return (
    proposal?.contractId ||
    proposal?.ContractId ||
    proposal?.contractID ||
    proposal?.ContractID ||
    proposal?.contract?.contractId ||
    proposal?.contract?.id ||
    proposal?.Contract?.ContractId ||
    proposal?.Contract?.Id ||
    ""
  );
}

function getJobId(proposal) {
  return (
    proposal?.jobId ||
    proposal?.JobId ||
    proposal?.projectId ||
    proposal?.ProjectId ||
    proposal?.job?.jobId ||
    proposal?.Job?.JobId ||
    ""
  );
}

function getProposalStatus(proposal) {
  return String(proposal?.status || proposal?.Status || "SUBMITTED")
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

  if (["ACCEPTED", "APPROVED", "SELECTED"].includes(value)) {
    return "ACCEPTED";
  }

  if (["WITHDRAWN", "CANCELLED", "CANCELED"].includes(value)) {
    return "CANCELLED";
  }

  return "SUBMITTED";
}

function canViewContract(statusGroup, contractId) {
  return statusGroup === "ACCEPTED" || Boolean(contractId);
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
      proposal?.LatestVersion
  );
}

function formatProposalVersion(proposal) {
  const version =
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

  if (Number.isNaN(number)) return 0;

  return number;
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