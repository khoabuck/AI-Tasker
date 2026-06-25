import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import proposalService, {
  getFriendlyProposalError,
} from "../../../services/proposal.service";
import { validateProposalForm } from "../../../utils/validateProposal";

const createEmptyMilestone = () => ({
  title: "",
  amount: "",
  durationDays: "",
});

const createEmptyForm = () => ({
  coverLetter: "",
  proposedPrice: "",
  proposedTimelineDays: "",
  expectedOutputs: "",
  workingApproach: "",
  preliminaryMilestonePlan: "",
  resubmitNote: "",
  milestones: [createEmptyMilestone()],
});

export default function ResubmitProposalPage() {
  const { proposalId } = useParams();
  const navigate = useNavigate();

  const [proposal, setProposal] = useState(null);
  const [formData, setFormData] = useState(createEmptyForm);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({});

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const formErrors = useMemo(
    () =>
      validateProposalForm(formData, {
        isResubmit: true,
      }),
    [formData]
  );

  const milestoneTotal = useMemo(() => {
    return formData.milestones.reduce((total, milestone) => {
      const amount = Number(milestone.amount || 0);
      return total + (Number.isNaN(amount) ? 0 : amount);
    }, 0);
  }, [formData.milestones]);

  const milestoneDuration = useMemo(() => {
    return formData.milestones.reduce((total, milestone) => {
      const durationDays = Number(milestone.durationDays || 0);
      return total + (Number.isNaN(durationDays) ? 0 : durationDays);
    }, 0);
  }, [formData.milestones]);

  const priceDifference = Number(formData.proposedPrice || 0) - milestoneTotal;

  useEffect(() => {
    loadProposal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId]);

  const loadProposal = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await proposalService.getProposalById(proposalId);
      const data = unwrapMaybe(result);

      setProposal(data);
      setFormData(buildFormFromProposal(data));
    } catch (err) {
      console.error("LOAD PROPOSAL ERROR:", err?.response?.data || err);
      setError(getFriendlyProposalError(err, "Cannot load proposal."));
      setProposal(null);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (name, value) => {
    setMessage("");
    setError("");

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const updateMilestone = (index, name, value) => {
    setMessage("");
    setError("");

    setFormData((prev) => {
      const nextMilestones = [...prev.milestones];

      nextMilestones[index] = {
        ...nextMilestones[index],
        [name]: value,
      };

      return {
        ...prev,
        milestones: nextMilestones,
      };
    });
  };

  const addMilestone = () => {
    setFormData((prev) => ({
      ...prev,
      milestones: [...prev.milestones, createEmptyMilestone()],
    }));
  };

  const removeMilestone = (index) => {
    setFormData((prev) => {
      const nextMilestones = prev.milestones.filter((_, i) => i !== index);

      return {
        ...prev,
        milestones:
          nextMilestones.length > 0 ? nextMilestones : [createEmptyMilestone()],
      };
    });
  };

  const syncFromMilestones = () => {
    setMessage("");
    setError("");

    setFormData((prev) => ({
      ...prev,
      proposedPrice: String(milestoneTotal || ""),
      proposedTimelineDays: String(milestoneDuration || ""),
    }));
  };

  const markTouched = (name) => {
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
  };

  const markMilestoneTouched = (index, name) => {
    markTouched(`milestones.${index}.${name}`);
  };

  const getFieldError = (name) => {
    if (!submitted && !touched[name]) return "";
    return formErrors[name] || "";
  };

  const getMilestoneFieldError = (index, name) => {
    const key = `milestones.${index}.${name}`;

    if (!submitted && !touched[key]) return "";

    return formErrors?.milestones?.[index]?.[name] || "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSubmitted(true);
    setMessage("");
    setError("");

    const normalizedFormData = {
      ...formData,
      proposedPrice: String(formData.proposedPrice || milestoneTotal || ""),
      proposedTimelineDays: String(
        formData.proposedTimelineDays || milestoneDuration || ""
      ),
    };

    const errors = validateProposalForm(normalizedFormData, {
      isResubmit: true,
    });

    if (Object.keys(errors).length > 0) {
      setError("Please check the highlighted fields before resubmitting.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSubmitting(true);

      const updatedProposal = await proposalService.resubmitProposal(
        proposalId,
        normalizedFormData
      );

      const nextProposalId =
        updatedProposal?.proposalId || updatedProposal?.id || proposalId;

      setMessage("Proposal resubmitted successfully.");

      setTimeout(() => {
        navigate(`/expert/proposals/${nextProposalId}`, { replace: true });
      }, 700);
    } catch (err) {
      console.error("RESUBMIT PROPOSAL ERROR:", err?.response?.data || err);
      setError(getFriendlyProposalError(err, "Cannot resubmit proposal."));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading proposal...
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
            onClick={() => navigate(`/expert/proposals/${proposalId}`)}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Back to proposal detail
          </button>

          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
              Resubmit Proposal
            </p>

            <h1 className="text-3xl font-bold text-white md:text-4xl">
              Update and resubmit your proposal
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Improve your proposal details and submit a new version for client
              review.
            </p>
          </div>

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
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
              <form onSubmit={handleSubmit} className="space-y-6">
                <Card title="Resubmit Note" icon="edit_note">
                  <TextArea
                    label="What did you change?"
                    required
                    value={formData.resubmitNote}
                    onChange={(value) => updateField("resubmitNote", value)}
                    onBlur={() => markTouched("resubmitNote")}
                    error={getFieldError("resubmitNote")}
                    placeholder="Briefly explain what you improved in this version..."
                    rows={4}
                  />
                </Card>

                <Card title="Proposal Content" icon="description">
                  <TextArea
                    label="Cover Letter"
                    required
                    value={formData.coverLetter}
                    onChange={(value) => updateField("coverLetter", value)}
                    onBlur={() => markTouched("coverLetter")}
                    error={getFieldError("coverLetter")}
                    placeholder="Introduce yourself and explain why you are suitable for this job..."
                    rows={6}
                  />
                </Card>

                <Card title="Price & Timeline" icon="payments">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <NumberInput
                      label="Proposed Price"
                      required
                      min="0"
                      value={formData.proposedPrice}
                      onChange={(value) => updateField("proposedPrice", value)}
                      onBlur={() => markTouched("proposedPrice")}
                      error={getFieldError("proposedPrice")}
                      placeholder="500"
                    />

                    <NumberInput
                      label="Proposed Timeline Days"
                      required
                      min="1"
                      value={formData.proposedTimelineDays}
                      onChange={(value) =>
                        updateField("proposedTimelineDays", value)
                      }
                      onBlur={() => markTouched("proposedTimelineDays")}
                      error={getFieldError("proposedTimelineDays")}
                      placeholder="14"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={syncFromMilestones}
                    className="mt-5 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                  >
                    Sync price and timeline from milestones
                  </button>
                </Card>

                <Card title="Delivery Plan" icon="task_alt">
                  <div className="space-y-5">
                    <TextArea
                      label="Expected Outputs"
                      required
                      value={formData.expectedOutputs}
                      onChange={(value) =>
                        updateField("expectedOutputs", value)
                      }
                      onBlur={() => markTouched("expectedOutputs")}
                      error={getFieldError("expectedOutputs")}
                      placeholder="List the final outputs you will deliver to the client..."
                      rows={5}
                    />

                    <TextArea
                      label="Working Approach"
                      required
                      value={formData.workingApproach}
                      onChange={(value) =>
                        updateField("workingApproach", value)
                      }
                      onBlur={() => markTouched("workingApproach")}
                      error={getFieldError("workingApproach")}
                      placeholder="Explain your working method, communication plan, and implementation steps..."
                      rows={5}
                    />

                    <TextArea
                      label="Preliminary Milestone Plan"
                      required
                      value={formData.preliminaryMilestonePlan}
                      onChange={(value) =>
                        updateField("preliminaryMilestonePlan", value)
                      }
                      onBlur={() => markTouched("preliminaryMilestonePlan")}
                      error={getFieldError("preliminaryMilestonePlan")}
                      placeholder="Example: Milestone 1: analysis, Milestone 2: implementation, Milestone 3: testing..."
                      rows={4}
                    />
                  </div>
                </Card>

                <Card title="Milestones" icon="flag">
                  <div className="mb-5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                    <p className="text-sm font-bold text-cyan-300">
                      Milestone requirement
                    </p>

                    <p className="mt-2 text-xs leading-5 text-gray-400">
                      Each milestone only sends title, amount, and duration days
                      to backend.
                    </p>
                  </div>

                  <div className="space-y-5">
                    {formData.milestones.map((milestone, index) => (
                      <MilestoneEditor
                        key={index}
                        index={index}
                        milestone={milestone}
                        canRemove={formData.milestones.length > 1}
                        onChange={updateMilestone}
                        onBlur={markMilestoneTouched}
                        onRemove={removeMilestone}
                        getError={getMilestoneFieldError}
                      />
                    ))}

                    <button
                      type="button"
                      onClick={addMilestone}
                      className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        add
                      </span>
                      Add Milestone
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Info
                      label="Proposed Price"
                      value={formatMoney(formData.proposedPrice)}
                    />

                    <Info
                      label="Milestone Total"
                      value={formatMoney(milestoneTotal)}
                    />

                    <Info
                      label="Difference"
                      value={formatMoney(priceDifference)}
                      tone={
                        Math.abs(priceDifference) < 0.01
                          ? "green"
                          : priceDifference > 0
                          ? "warning"
                          : "danger"
                      }
                    />
                  </div>
                </Card>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/expert/proposals/${proposalId}`)}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? "Resubmitting..." : "Resubmit Proposal"}
                  </button>
                </div>
              </form>

              <aside className="space-y-6">
                <section className="rounded-2xl border border-white/10 bg-[#151a22] p-6">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#00F0FF]">
                    Current Proposal
                  </p>

                  <h2 className="text-xl font-bold text-white">
                    {formatDisplayValue(proposal.jobTitle || "Untitled Job")}
                  </h2>

                  <div className="mt-5 space-y-3">
                    <Info label="Status" value={proposal.status || "N/A"} />

                    <Info
                      label="Current Price"
                      value={formatMoney(proposal.proposedPrice)}
                    />

                    <Info
                      label="Current Timeline"
                      value={`${proposal.proposedTimelineDays || 0} days`}
                    />

                    <Info
                      label="Version"
                      value={formatProposalVersion(proposal)}
                    />
                  </div>
                </section>

                {(proposal.rejectionReason || proposal.decisionNote) && (
                  <section className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-5 text-yellow-200">
                    <p className="font-bold">Client feedback</p>

                    <p className="mt-2 text-sm leading-6">
                      {formatDisplayValue(
                        proposal.rejectionReason ||
                          proposal.decisionNote ||
                          "Please improve your proposal and submit again."
                      )}
                    </p>
                  </section>
                )}
              </aside>
            </div>
          )}
        </div>
      </div>
    </ExpertLayout>
  );
}

function Card({ title, icon, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#151a22] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)] md:p-8">
      <div className="mb-6 flex items-center gap-3">
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

function MilestoneEditor({
  index,
  milestone,
  canRemove,
  onChange,
  onBlur,
  onRemove,
  getError,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-white">
            Milestone {index + 1}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Define title, payment amount and estimated duration.
          </p>
        </div>

        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-400 hover:text-black"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_180px_180px]">
        <TextInput
          label="Title"
          required
          value={milestone.title}
          onChange={(value) => onChange(index, "title", value)}
          onBlur={() => onBlur(index, "title")}
          error={getError(index, "title")}
          placeholder="Milestone title"
        />

        <NumberInput
          label="Amount"
          required
          min="0"
          value={milestone.amount}
          onChange={(value) => onChange(index, "amount", value)}
          onBlur={() => onBlur(index, "amount")}
          error={getError(index, "amount")}
          placeholder="200"
        />

        <NumberInput
          label="Duration Days"
          required
          min="1"
          value={milestone.durationDays}
          onChange={(value) => onChange(index, "durationDays", value)}
          onBlur={() => onBlur(index, "durationDays")}
          error={getError(index, "durationDays")}
          placeholder="7"
        />
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  required,
  error,
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label} {required && <span className="text-red-300">*</span>}
      </label>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] ${
          error ? "border-red-400/60" : "border-white/10"
        }`}
      />

      <FieldError message={error} />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  required,
  error,
  rows = 4,
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label} {required && <span className="text-red-300">*</span>}
      </label>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        rows={rows}
        placeholder={placeholder}
        className={`w-full resize-none rounded-xl border bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] ${
          error ? "border-red-400/60" : "border-white/10"
        }`}
      />

      <FieldError message={error} />
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  required,
  error,
  min = "0",
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label} {required && <span className="text-red-300">*</span>}
      </label>

      <input
        type="number"
        min={min}
        step="1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] ${
          error ? "border-red-400/60" : "border-white/10"
        }`}
      />

      <FieldError message={error} />
    </div>
  );
}

function FieldError({ message }) {
  if (!message) return null;

  return <p className="mt-2 text-xs font-semibold text-red-300">{message}</p>;
}

function Info({ label, value, tone = "default" }) {
  const toneClass =
    tone === "green"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : tone === "warning"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-200"
      : tone === "danger"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : "border-white/10 bg-white/[0.03] text-white";

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>

      <p className="mt-1 break-words font-bold">
        {formatDisplayValue(value)}
      </p>
    </div>
  );
}

function Alert({ type, title, message }) {
  const style =
    type === "success"
      ? "border-green-500/30 bg-green-500/10 text-green-300"
      : type === "warning"
      ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-200"
      : "border-red-500/30 bg-red-500/10 text-red-300";

  return (
    <div className={`mb-5 rounded-xl border px-5 py-4 text-sm ${style}`}>
      <p className="font-bold">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}

function buildFormFromProposal(proposal) {
  const milestones = Array.isArray(proposal?.milestones)
    ? proposal.milestones
    : [];

  return {
    coverLetter: proposal?.coverLetter || "",
    proposedPrice: String(proposal?.proposedPrice || ""),
    proposedTimelineDays: String(proposal?.proposedTimelineDays || ""),
    expectedOutputs: proposal?.expectedOutputs || "",
    workingApproach: proposal?.workingApproach || "",
    preliminaryMilestonePlan: proposal?.preliminaryMilestonePlan || "",
    resubmitNote: "",
    milestones:
      milestones.length > 0
        ? milestones.map((item) => ({
            title: item?.title || "",
            amount: String(item?.amount || ""),
            durationDays: String(item?.durationDays || ""),
          }))
        : [createEmptyMilestone()],
  };
}

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isNaN(number) ? 0 : number);
}

function formatProposalVersion(proposal) {
  const version = proposal?.version || proposal?.latestVersion;

  if (!version) return "N/A";

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

function unwrapMaybe(result) {
  if (!result) return result;
  if (result.data?.data) return result.data.data;
  if (result.data) return result.data;
  return result;
}