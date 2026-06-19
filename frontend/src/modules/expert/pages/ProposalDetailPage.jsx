import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import proposalService from "../../../services/proposal.service";
import {
  canWithdrawProposal,
  PROPOSAL_STATUS_LABEL,
} from "../../../constants/proposalStatus";

const initialResubmitForm = {
  coverLetter: "",
  expectedOutputs: "",
  workingApproach: "",
  preliminaryMilestonePlan: "",
  proposedBudget: "",
  estimatedDurationDays: "",
  resubmitReason: "",
};

export default function ProposalDetailPage() {
  const { proposalId } = useParams();
  const navigate = useNavigate();

  const [proposal, setProposal] = useState(null);
  const [versions, setVersions] = useState([]);

  const [resubmitForm, setResubmitForm] = useState(initialResubmitForm);
  const [showResubmitModal, setShowResubmitModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [resubmitLoading, setResubmitLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resubmitError, setResubmitError] = useState("");

  useEffect(() => {
    loadProposal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId]);

  const status = String(proposal?.status || "").toUpperCase();

  const canResubmit = useMemo(() => {
    return canResubmitProposal(status);
  }, [status]);

  const proposalBudget = getProposalBudget(proposal);
  const proposalDuration = getProposalDuration(proposal);

  const loadProposal = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const [proposalResult, versionsResult] = await Promise.allSettled([
        proposalService.getProposalById(proposalId),
        proposalService.getProposalVersions(proposalId),
      ]);

      if (proposalResult.status === "rejected") {
        throw proposalResult.reason;
      }

      setProposal(proposalResult.value);

      if (versionsResult.status === "fulfilled") {
        setVersions(Array.isArray(versionsResult.value) ? versionsResult.value : []);
      } else {
        setVersions([]);
      }
    } catch (err) {
      console.error("LOAD PROPOSAL DETAIL ERROR:", err?.response?.data || err);

      setError(getFriendlyError(err, "Cannot load proposal detail."));
      setProposal(null);
      setVersions([]);
    } finally {
      setLoading(false);
    }
  };

  const openResubmitModal = () => {
    setResubmitError("");
    setError("");
    setMessage("");

    setResubmitForm({
      coverLetter: getText(
        proposal?.coverLetter,
        proposal?.proposalText,
        proposal?.message
      ),
      expectedOutputs: getText(proposal?.expectedOutputs),
      workingApproach: getText(proposal?.workingApproach),
      preliminaryMilestonePlan: getText(proposal?.preliminaryMilestonePlan),
      proposedBudget: String(proposalBudget || ""),
      estimatedDurationDays: String(proposalDuration || ""),
      resubmitReason: "",
    });

    setShowResubmitModal(true);
  };

  const closeResubmitModal = () => {
    if (resubmitLoading) return;

    setShowResubmitModal(false);
    setResubmitError("");
    setResubmitForm(initialResubmitForm);
  };

  const updateResubmitField = (name, value) => {
    setResubmitError("");

    setResubmitForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleResubmitProposal = async (event) => {
    event.preventDefault();

    setResubmitError("");
    setError("");
    setMessage("");

    const validationError = validateResubmitForm(resubmitForm);

    if (validationError) {
      setResubmitError(validationError);
      return;
    }

    try {
      setResubmitLoading(true);

      const updatedProposal = await proposalService.resubmitProposal(
        proposalId,
        resubmitForm
      );

      if (updatedProposal?.proposalId) {
        setProposal(updatedProposal);
      }

      setShowResubmitModal(false);
      setMessage("Proposal updated successfully.");

      await loadProposal();
    } catch (err) {
      console.error("RESUBMIT PROPOSAL ERROR:", err?.response?.data || err);

      setResubmitError(getFriendlyError(err, "Cannot update proposal."));
    } finally {
      setResubmitLoading(false);
    }
  };

  const handleCancelProposal = async () => {
    const ok = window.confirm(
      "Are you sure you want to cancel this proposal? This only cancels your submitted proposal."
    );

    if (!ok) return;

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const data = await proposalService.withdrawProposal(proposalId);

      if (data?.proposalId) {
        setProposal(data);
      } else {
        await loadProposal();
      }

      setMessage("Proposal cancelled successfully.");
    } catch (err) {
      console.error("CANCEL PROPOSAL ERROR:", err?.response?.data || err);

      setError(getFriendlyError(err, "Cannot cancel proposal."));
    } finally {
      setActionLoading(false);
    }
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

  if (!proposal) {
    return (
      <ExpertLayout>
        <div className="px-5 py-10 md:px-8">
          <div className="mx-auto max-w-5xl">
            <Alert
              type="danger"
              title="Proposal not found"
              message={error || "Cannot load proposal detail."}
            />

            <button
              type="button"
              onClick={() => navigate("/expert/proposals")}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
            >
              Back to Proposals
            </button>
          </div>
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

          <section className="mb-8 overflow-hidden rounded-3xl border border-white/10 bg-[#151a22] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="relative p-6 md:p-8">
              <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-purple-400/10 blur-3xl" />

              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                    Proposal Detail
                  </p>

                  <h1 className="max-w-3xl text-3xl font-extrabold leading-tight text-white md:text-5xl">
                    {proposal.jobTitle || "Untitled Project"}
                  </h1>

                  <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-400">
                    Review your submitted proposal, track updates, and manage
                    proposal actions from this workspace.
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <StatusBadge status={status} />

                    {proposal.version && (
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                        Version {proposal.version}
                      </span>
                    )}

                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                      {proposal.clientName || "Client"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {proposal.jobId && (
                    <button
                      type="button"
                      onClick={() => navigate(`/expert/jobs/${proposal.jobId}`)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-white/20 hover:text-white"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        work
                      </span>
                      View Job
                    </button>
                  )}

                  {canResubmit && (
                    <button
                      type="button"
                      onClick={openResubmitModal}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        edit_note
                      </span>
                      Update Proposal
                    </button>
                  )}

                  {proposal.contractId ? (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/expert/contracts/${proposal.contractId}`)
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-400/50 bg-green-400/10 px-5 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        description
                      </span>
                      View Contract
                    </button>
                  ) : (
                    status === "ACCEPTED" && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/expert/proposals/${proposal.proposalId}/contract`
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-400/50 bg-green-400/10 px-5 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          description
                        </span>
                        View Contract
                      </button>
                    )
                  )}

                  {canWithdrawProposal(status) && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleCancelProposal}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/40 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        cancel
                      </span>
                      {actionLoading ? "Cancelling..." : "Cancel Proposal"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {message && (
            <Alert type="success" title="Success" message={message} />
          )}

          {error && (
            <Alert type="danger" title="Proposal error" message={error} />
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <main className="space-y-6">
              <Card title="Cover Letter">
                <TextContent
                  value={getText(proposal.coverLetter, proposal.proposalText)}
                  empty="No cover letter."
                />
              </Card>

              <Card title="Expected Outputs">
                <TextContent
                  value={proposal.expectedOutputs}
                  empty="No expected outputs."
                />
              </Card>

              <Card title="Working Approach">
                <TextContent
                  value={proposal.workingApproach}
                  empty="No working approach."
                />
              </Card>

              <Card title="Preliminary Milestone Plan">
                <TextContent
                  value={proposal.preliminaryMilestonePlan}
                  empty="No preliminary milestone plan."
                />
              </Card>

              <Card title="Proposal Versions">
                {versions.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-gray-500">
                    No previous versions available.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {versions.map((version, index) => (
                      <VersionItem
                        key={
                          version.proposalVersionId ||
                          `${version.proposalId}-${index}`
                        }
                        version={version}
                      />
                    ))}
                  </div>
                )}
              </Card>
            </main>

            <aside className="space-y-6">
              <Card title="Proposal Summary">
                <Info label="Budget" value={formatMoney(proposalBudget)} />

                <Info
                  label="Timeline"
                  value={
                    proposalDuration
                      ? `${proposalDuration} days`
                      : "Not specified"
                  }
                />

                <Info
                  label="Status"
                  value={getProposalStatusLabel(status)}
                />

                <Info
                  label="Submitted At"
                  value={formatDate(proposal.submittedAt || proposal.createdAt)}
                />

                <Info
                  label="Last Updated"
                  value={formatDate(proposal.updatedAt)}
                />
              </Card>

              <Card title="Next Step">
                <NextStep status={status} />
              </Card>
            </aside>
          </div>
        </div>
      </div>

      {showResubmitModal && (
        <ResubmitModal
          formData={resubmitForm}
          loading={resubmitLoading}
          error={resubmitError}
          onChange={updateResubmitField}
          onClose={closeResubmitModal}
          onSubmit={handleResubmitProposal}
        />
      )}
    </ExpertLayout>
  );
}

function ResubmitModal({
  formData,
  loading,
  error,
  onChange,
  onClose,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-5">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#11161f] shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
                Proposal Update
              </p>

              <h2 className="text-xl font-extrabold text-white">
                Update your proposal
              </h2>

              <p className="mt-1 text-xs leading-5 text-gray-400">
                Submit an updated version of your proposal using the latest
                budget, timeline, and work plan.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-white/10 bg-white/[0.04] p-1.5 text-gray-400 transition hover:text-white disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="max-h-[calc(92vh-92px)] space-y-4 overflow-y-auto px-5 py-4"
        >
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Budget"
              type="number"
              min="1"
              value={formData.proposedBudget}
              onChange={(value) => onChange("proposedBudget", value)}
              placeholder="Enter budget"
            />

            <Input
              label="Timeline Days"
              type="number"
              min="1"
              value={formData.estimatedDurationDays}
              onChange={(value) => onChange("estimatedDurationDays", value)}
              placeholder="Enter duration"
            />
          </div>

          <Textarea
            label="Cover Letter"
            value={formData.coverLetter}
            onChange={(value) => onChange("coverLetter", value)}
            placeholder="Explain why you are a strong fit for this project..."
            rows={5}
          />

          <Textarea
            label="Expected Outputs"
            value={formData.expectedOutputs}
            onChange={(value) => onChange("expectedOutputs", value)}
            placeholder="Describe what you will deliver..."
            rows={4}
          />

          <Textarea
            label="Working Approach"
            value={formData.workingApproach}
            onChange={(value) => onChange("workingApproach", value)}
            placeholder="Describe your working process..."
            rows={4}
          />

          <Textarea
            label="Preliminary Milestone Plan"
            value={formData.preliminaryMilestonePlan}
            onChange={(value) => onChange("preliminaryMilestonePlan", value)}
            placeholder="Break the work into milestone phases..."
            rows={4}
          />

          <Textarea
            label="Update Note"
            value={formData.resubmitReason}
            onChange={(value) => onChange("resubmitReason", value)}
            placeholder="Briefly explain what you changed in this version..."
            rows={3}
          />

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VersionItem({ version }) {
  const status = String(version.status || "").toUpperCase();
  const budget = getProposalBudget(version);
  const duration = getProposalDuration(version);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300">
            Version {version.version || 1}
          </span>

          <StatusBadge status={status} />
        </div>

        <span className="text-xs text-gray-500">
          {formatDate(version.createdAt || version.submittedAt)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Info label="Budget" value={formatMoney(budget)} />
        <Info
          label="Timeline"
          value={duration ? `${duration} days` : "Not specified"}
        />
      </div>

      {version.changeNote && (
        <p className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-gray-300">
          {version.changeNote}
        </p>
      )}
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#151a22] p-6">
      <h2 className="mb-4 text-xl font-extrabold text-white">{title}</h2>
      {children}
    </section>
  );
}

function Info({ label, value }) {
  return (
    <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 break-words font-bold text-white">{value || "N/A"}</p>
    </div>
  );
}

function TextContent({ value, empty }) {
  return (
    <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
      {value || empty}
    </p>
  );
}

function StatusBadge({ status }) {
  const value = String(status || "SUBMITTED").toUpperCase();

  const style =
    value === "ACCEPTED"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : value === "REJECTED" ||
        value === "WITHDRAWN" ||
        value === "CANCELLED"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : value === "REVISION_REQUESTED" ||
        value === "NEEDS_REVISION" ||
        value === "RESUBMISSION_REQUESTED"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";

  return (
    <span
      className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {getProposalStatusLabel(value)}
    </span>
  );
}

function NextStep({ status }) {
  const value = String(status || "").toUpperCase();

  let text =
    "Your proposal is under client review. You can update or cancel it while it is still open.";

  if (value === "ACCEPTED") {
    text =
      "Your proposal has been accepted. Review the contract and confirm when everything looks correct.";
  }

  if (value === "REJECTED") {
    text =
      "This proposal was not selected. You can continue applying to other suitable projects.";
  }

  if (value === "WITHDRAWN" || value === "CANCELLED") {
    text =
      "This proposal has been cancelled and is no longer active.";
  }

  if (
    value === "REVISION_REQUESTED" ||
    value === "NEEDS_REVISION" ||
    value === "RESUBMISSION_REQUESTED"
  ) {
    text =
      "The client requested an update. Review the request and submit a revised proposal version.";
  }

  return <p className="text-sm leading-7 text-gray-400">{text}</p>;
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label}
      </span>

      <input
        type={type}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF]"
      />
    </label>
  );
}

function Textarea({ label, value, onChange, placeholder, rows = 4 }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label}
      </span>

      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm leading-6 text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF]"
      />
    </label>
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
      <p className="mt-1">{message}</p>
    </div>
  );
}

function canResubmitProposal(status) {
  const value = String(status || "").toUpperCase();

  return [
    "SUBMITTED",
    "PENDING",
    "REVISION_REQUESTED",
    "NEEDS_REVISION",
    "RESUBMISSION_REQUESTED",
    "COUNTER_OFFER",
  ].includes(value);
}

function getProposalStatusLabel(status) {
  const value = String(status || "").toUpperCase();

  if (value === "WITHDRAWN" || value === "CANCELLED") return "Cancelled";
  if (value === "REVISION_REQUESTED") return "Revision Requested";
  if (value === "NEEDS_REVISION") return "Needs Revision";
  if (value === "RESUBMISSION_REQUESTED") return "Update Requested";

  return PROPOSAL_STATUS_LABEL[value] || value || "Submitted";
}

function getProposalBudget(item) {
  return Number(
    item?.proposedBudget ??
      item?.budget ??
      item?.proposedPrice ??
      item?.price ??
      0
  );
}

function getProposalDuration(item) {
  return Number(
    item?.estimatedDurationDays ??
      item?.durationDays ??
      item?.proposedTimelineDays ??
      item?.timelineDays ??
      0
  );
}

function getText(...values) {
  const value = values.find(
    (item) => item !== undefined && item !== null && String(item).trim() !== ""
  );

  return String(value || "").trim();
}

function validateResubmitForm(formData) {
  const budget = Number(formData.proposedBudget);
  const duration = Number(formData.estimatedDurationDays);

  if (!String(formData.coverLetter || "").trim()) {
    return "Cover letter is required.";
  }

  if (!formData.proposedBudget || Number.isNaN(budget) || budget <= 0) {
    return "Budget must be greater than 0.";
  }

  if (
    !formData.estimatedDurationDays ||
    Number.isNaN(duration) ||
    duration <= 0
  ) {
    return "Timeline must be greater than 0.";
  }

  return "";
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
  const data = err?.response?.data;

  if (typeof data === "string") return data;

  return data?.message || data?.title || err?.message || fallback;
}