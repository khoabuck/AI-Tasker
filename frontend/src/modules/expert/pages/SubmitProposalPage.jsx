import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import jobService from "../../../services/job.service";
import proposalService from "../../../services/proposal.service";
import { validateProposalForm } from "../../../utils/validateProposal";

const emptyForm = {
  coverLetter: "",
  proposedPrice: "",
  proposedTimelineDays: "",
  expectedOutputs: "",
  workingApproach: "",
  preliminaryMilestonePlan: "",
};

export default function SubmitProposalPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({});

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const formErrors = useMemo(() => validateProposalForm(formData), [formData]);

  useEffect(() => {
    loadJobDetail();
  }, [jobId]);

  const loadJobDetail = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await jobService.getJobById(jobId);
      setJob(data);
    } catch (err) {
      console.error("LOAD JOB DETAIL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load job detail."));
      setJob(null);
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

  const markTouched = (name) => {
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
  };

  const getFieldError = (name) => {
    if (!submitted && !touched[name]) return "";
    return formErrors[name] || "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSubmitted(true);
    setMessage("");
    setError("");

    const errors = validateProposalForm(formData);

    if (Object.keys(errors).length > 0) {
      setError("Please check the highlighted fields before submitting.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSubmitting(true);

      await proposalService.submitProposal(jobId, formData);

      setMessage("Proposal submitted successfully.");

      setTimeout(() => {
        navigate("/expert/proposals", { replace: true });
      }, 900);
    } catch (err) {
      console.error("SUBMIT PROPOSAL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot submit proposal."));
    } finally {
      setSubmitting(false);
    }
  };

  const isJobOpen = String(job?.status || "").toUpperCase() === "OPEN";

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading job information...
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
            onClick={() => navigate(`/expert/jobs/${jobId}`)}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Back to job detail
          </button>

          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
              Submit Proposal
            </p>

            <h1 className="text-3xl font-bold text-white md:text-4xl">
              Send proposal to client
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Fill in price, timeline, outputs, and working approach based on
              the backend proposal API.
            </p>
          </div>

          {error && (
            <Alert type="danger" title="Proposal error" message={error} />
          )}

          {message && (
            <Alert type="success" title="Success" message={message} />
          )}

          {!job && (
            <div className="rounded-2xl border border-white/10 bg-[#151a22] p-10 text-center">
              <p className="text-gray-400">Job not found.</p>

              <button
                type="button"
                onClick={() => navigate("/expert/jobs")}
                className="mt-5 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
              >
                Back to Jobs
              </button>
            </div>
          )}

          {job && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
              <form onSubmit={handleSubmit} className="space-y-6">
                {!isJobOpen && (
                  <Alert
                    type="warning"
                    title="Job is not open"
                    message="This job is not OPEN, so backend may reject proposal submission."
                  />
                )}

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
                      value={formData.proposedPrice}
                      onChange={(value) => updateField("proposedPrice", value)}
                      onBlur={() => markTouched("proposedPrice")}
                      error={getFieldError("proposedPrice")}
                      placeholder="500"
                    />

                    <NumberInput
                      label="Proposed Timeline Days"
                      required
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
                      value={formData.preliminaryMilestonePlan}
                      onChange={(value) =>
                        updateField("preliminaryMilestonePlan", value)
                      }
                      placeholder="Optional. Example: Milestone 1: UI, Milestone 2: API integration..."
                      rows={4}
                    />
                  </div>
                </Card>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/expert/jobs/${jobId}`)}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting || !isJobOpen}
                    className="rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Proposal"}
                  </button>
                </div>
              </form>

              <aside className="space-y-6">
                <section className="rounded-2xl border border-white/10 bg-[#151a22] p-6">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#00F0FF]">
                    Job Summary
                  </p>

                  <h2 className="text-xl font-bold text-white">
                    {job.title || "Untitled Job"}
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-gray-400">
                    {job.description || "No description."}
                  </p>

                  <div className="mt-5 space-y-3">
                    <Info label="Client" value={job.clientName || "Client"} />

                    <Info
                      label="Budget"
                      value={formatBudget(job.budgetMin, job.budgetMax)}
                    />

                    <Info
                      label="Duration"
                      value={
                        job.durationDays ? `${job.durationDays} days` : "N/A"
                      }
                    />

                    <Info label="Status" value={job.status || "OPEN"} />
                  </div>
                </section>

                <section className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-5 text-yellow-200">
                  <p className="font-bold">Backend rule</p>

                  <p className="mt-2 text-sm leading-6">
                    Expert profile must be approved and available for work.
                    Also, one expert can submit only one active proposal per
                    job.
                  </p>
                </section>
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
        className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF]"
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
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label} {required && <span className="text-red-300">*</span>}
      </label>

      <input
        type="number"
        min="1"
        step="1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF]"
      />

      <FieldError message={error} />
    </div>
  );
}

function FieldError({ message }) {
  if (!message) return null;

  return <p className="mt-2 text-xs font-semibold text-red-300">{message}</p>;
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 font-bold text-white">{value}</p>
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

function formatBudget(min, max) {
  const minValue = Number(min || 0);
  const maxValue = Number(max || 0);

  if (minValue && maxValue) return `$${minValue} - $${maxValue}`;
  if (minValue) return `From $${minValue}`;
  if (maxValue) return `Up to $${maxValue}`;

  return "Budget not set";
}

function getFriendlyError(err, fallback) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.title ||
    err?.message ||
    fallback
  );
}