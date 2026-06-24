import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import proposalService from "../../../services/proposal.service";
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
  milestones: [createEmptyMilestone()],
  resubmitNote: "",
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
    () => validateProposalForm(formData, { isResubmit: true }),
    [formData]
  );

  const milestoneTotal = useMemo(() => {
    return formData.milestones.reduce((total, milestone) => {
      const amount = Number(milestone.amount || 0);

      return total + (Number.isNaN(amount) ? 0 : amount);
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
      setMessage("");

      const data = await proposalService.getProposalById(proposalId);

      setProposal(data);
      setFormData(buildFormFromProposal(data));
      setTouched({});
      setSubmitted(false);
    } catch (err) {
      console.error(
        "LOAD PROPOSAL FOR RESUBMIT ERROR:",
        err?.response?.data || err
      );
      setError(getFriendlyError(err, "Cannot load proposal for resubmit."));
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

    const errors = validateProposalForm(formData, {
      isResubmit: true,
    });

    if (Object.keys(errors).length > 0) {
      setError("Please check the highlighted fields before resubmitting.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSubmitting(true);

      const result = await proposalService.resubmitProposal(
        proposalId,
        formData
      );

      setMessage("Proposal resubmitted successfully.");

      const nextProposalId = result?.proposalId || result?.id || proposalId;

      setTimeout(() => {
        navigate(`/expert/proposals/${nextProposalId}`, { replace: true });
      }, 900);
    } catch (err) {
      console.error("RESUBMIT PROPOSAL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot resubmit proposal."));
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

  if (!proposal) {
    return (
      <ExpertLayout>
        <div className="px-5 py-10 md:px-8">
          <div className="mx-auto max-w-5xl">
            <Alert
              type="danger"
              title="Cannot load proposal"
              message={error || "Proposal not found."}
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
              Update and resubmit proposal
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Edit your proposal content, pricing, timeline, milestone summary,
              and simple milestone list.
            </p>
          </div>

          {error && (
            <Alert type="danger" title="Resubmit error" message={error} />
          )}

          {message && (
            <Alert type="success" title="Success" message={message} />
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Card title="Resubmit Note" icon="edit_note">
                <TextArea
                  label="Resubmit Note"
                  required
                  value={formData.resubmitNote}
                  onChange={(value) => updateField("resubmitNote", value)}
                  onBlur={() => markTouched("resubmitNote")}
                  error={getFieldError("resubmitNote")}
                  placeholder="Explain what you changed in this resubmission..."
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
              </Card>

              <Card title="Delivery Plan" icon="task_alt">
                <div className="space-y-5">
                  <TextArea
                    label="Expected Outputs"
                    required
                    value={formData.expectedOutputs}
                    onChange={(value) => updateField("expectedOutputs", value)}
                    onBlur={() => markTouched("expectedOutputs")}
                    error={getFieldError("expectedOutputs")}
                    placeholder="List the final outputs you will deliver to the client..."
                    rows={5}
                  />

                  <TextArea
                    label="Working Approach"
                    required
                    value={formData.workingApproach}
                    onChange={(value) => updateField("workingApproach", value)}
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
                    Backend milestone schema
                  </p>

                  <p className="mt-2 text-xs leading-5 text-gray-400">
                    Each milestone only requires title, amount and duration
                    days.
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
                  className="rounded-xl border border-yellow-400/60 bg-yellow-400/10 px-5 py-3 text-sm font-bold text-yellow-300 transition hover:bg-yellow-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
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
                  {proposal.jobTitle || "Untitled Job"}
                </h2>

                <div className="mt-5 space-y-3">
                  <Info label="Client" value={proposal.clientName || "Client"} />

                  <Info
                    label="Current Price"
                    value={formatMoney(proposal.proposedPrice)}
                  />

                  <Info
                    label="Timeline"
                    value={`${proposal.proposedTimelineDays || 0} days`}
                  />

                  <Info label="Status" value={proposal.status || "N/A"} />

                  {proposal.version && (
                    <Info label="Version" value={`${proposal.version}`} />
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-5 text-yellow-200">
                <p className="font-bold">Backend rule</p>

                <p className="mt-2 text-sm leading-6">
                  Resubmit uses proposalId in the URL. The request body does not
                  include jobId, but it must include updated proposal fields,
                  milestones, and resubmitNote.
                </p>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </ExpertLayout>
  );
}

function buildFormFromProposal(proposal) {
  const milestones = Array.isArray(proposal?.milestones)
    ? proposal.milestones
    : [];

  return {
    coverLetter: proposal?.coverLetter || "",

    proposedPrice:
      proposal?.proposedPrice !== undefined && proposal?.proposedPrice !== null
        ? String(proposal.proposedPrice)
        : "",

    proposedTimelineDays:
      proposal?.proposedTimelineDays !== undefined &&
      proposal?.proposedTimelineDays !== null
        ? String(proposal.proposedTimelineDays)
        : "",

    expectedOutputs: proposal?.expectedOutputs || "",

    workingApproach: proposal?.workingApproach || "",

    preliminaryMilestonePlan: proposal?.preliminaryMilestonePlan || "",

    milestones:
      milestones.length > 0
        ? milestones.map((item) => ({
            title: item.title || "",

            amount:
              item.amount !== undefined && item.amount !== null
                ? String(item.amount)
                : "",

            durationDays:
              item.durationDays !== undefined && item.durationDays !== null
                ? String(item.durationDays)
                : item.deadlineOffsetDays !== undefined &&
                  item.deadlineOffsetDays !== null
                ? String(item.deadlineOffsetDays)
                : "",
          }))
        : [createEmptyMilestone()],

    resubmitNote: "",
  };
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

      <p className="mt-1 break-words font-bold">{value || "N/A"}</p>
    </div>
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

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isNaN(number) ? 0 : number);
}

function getFriendlyError(err, fallback) {
  const data = err?.response?.data;

  if (typeof data === "string") return data;

  if (data?.message) return data.message;
  if (data?.title) return data.title;

  if (data?.errors) {
    const allErrors = Object.values(data.errors).flat();

    if (allErrors.length > 0) {
      return allErrors.join(" ");
    }
  }

  return err?.message || fallback;
}