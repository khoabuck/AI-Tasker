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
      console.error(err);
      setError("Unable to load job information. Please try again.");
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
      setError("Please complete all required fields correctly before submitting.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSubmitting(true);

      await proposalService.submitProposal(jobId, formData);

      setMessage(
        "Your proposal has been sent successfully. We will notify you when there is an update."
      );

      setTimeout(() => {
        navigate("/expert/proposals", { replace: true });
      }, 900);
    } catch (err) {
      console.error(err);
      setError("We couldn't submit your proposal. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  const isJobOpen = String(job?.status || "").toUpperCase() === "OPEN";

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading job details...
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
              Fill in price, timeline, outputs, and working approach.
            </p>
          </div>

          {error && (
            <Alert type="danger" title="Notice" message={error} />
          )}

          {message && (
            <Alert type="success" title="Success" message={message} />
          )}

          {!job && (
            <div className="rounded-2xl border border-white/10 bg-[#151a22] p-10 text-center">
              <p className="text-gray-400">
                This job is no longer available.
              </p>

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
                    title="Notice"
                    message="This job is currently not open for new proposals."
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
                    placeholder="Introduce yourself..."
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
                    />

                    <NumberInput
                      label="Timeline (days)"
                      required
                      value={formData.proposedTimelineDays}
                      onChange={(value) =>
                        updateField("proposedTimelineDays", value)
                      }
                      onBlur={() => markTouched("proposedTimelineDays")}
                      error={getFieldError("proposedTimelineDays")}
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
                      rows={5}
                    />

                    <TextArea
                      label="Milestone Plan (optional)"
                      value={formData.preliminaryMilestonePlan}
                      onChange={(value) =>
                        updateField("preliminaryMilestonePlan", value)
                      }
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
                    {job.description || "No description available."}
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
              </aside>
            </div>
          )}
        </div>
      </div>
    </ExpertLayout>
  );
}

/* KEEP UI COMPONENTS UNCHANGED */
function Card({ title, icon, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#151a22] p-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="material-symbols-outlined text-[#00F0FF]">
          {icon}
        </span>
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function TextArea(props) {
  return (
    <div>
      <label className="mb-2 block text-xs text-gray-400">
        {props.label} {props.required && "*"}
      </label>

      <textarea
        {...props}
        className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
      />

      {props.error && (
        <p className="mt-1 text-xs text-red-300">{props.error}</p>
      )}
    </div>
  );
}

function NumberInput(props) {
  return (
    <div>
      <label className="mb-2 block text-xs text-gray-400">
        {props.label} {props.required && "*"}
      </label>

      <input
        type="number"
        {...props}
        className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"
      />

      {props.error && (
        <p className="mt-1 text-xs text-red-300">{props.error}</p>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="flex justify-between text-sm text-gray-400">
      <span>{label}</span>
      <span className="text-white">{value}</span>
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
    <div className={`mb-5 rounded-xl border p-4 text-sm ${style}`}>
      <p className="font-bold">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}

function formatBudget(min, max) {
  if (min && max) return `$${min} - $${max}`;
  if (min) return `From $${min}`;
  if (max) return `Up to $${max}`;
  return "Not set";
}