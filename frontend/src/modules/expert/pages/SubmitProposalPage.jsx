import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import jobService from "../../../services/job.service";
import proposalService from "../../../services/proposal.service";

export default function SubmitProposalPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);

  const [formData, setFormData] = useState({
    coverLetter: "",
    proposedBudget: "",
    estimatedDurationDays: "",
    workPlan: "",
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
      setError("Cannot load job detail. Please check backend API.");
      setJob(null);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const validateForm = () => {
    const budget = Number(formData.proposedBudget);
    const duration = Number(formData.estimatedDurationDays);

    if (!formData.coverLetter.trim()) {
      return "Cover letter is required.";
    }

    if (formData.coverLetter.trim().length < 30) {
      return "Cover letter must be at least 30 characters.";
    }

    if (formData.proposedBudget === "") {
      return "Proposed budget is required.";
    }

    if (Number.isNaN(budget) || budget <= 0) {
      return "Proposed budget must be greater than 0.";
    }

    if (formData.estimatedDurationDays === "") {
      return "Estimated duration is required.";
    }

    if (Number.isNaN(duration) || duration < 1 || !Number.isInteger(duration)) {
      return "Estimated duration must be an integer and at least 1 day.";
    }

    if (!formData.workPlan.trim()) {
      return "Work plan is required.";
    }

    if (formData.workPlan.trim().length < 30) {
      return "Work plan must be at least 30 characters.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    const validateError = validateForm();

    if (validateError) {
      setError(validateError);
      return;
    }

    try {
      setSubmitting(true);

      await proposalService.submitProposal(jobId, formData);

      setMessage("Proposal submitted successfully.");

      setTimeout(() => {
        navigate("/expert/proposals");
      }, 800);
    } catch (err) {
      console.error(err);
      setError("Cannot submit proposal. Please check backend API.");
    } finally {
      setSubmitting(false);
    }
  };

  const getJobTitle = () => {
    return job?.title || job?.jobTitle || job?.name || "Untitled Job";
  };

  const getJobDescription = () => {
    return job?.description || job?.jobDescription || job?.summary || "";
  };

  const getBudgetText = () => {
    const min =
      job?.budgetMin ||
      job?.minBudget ||
      job?.expectedBudgetMin ||
      job?.projectBudgetMin;

    const max =
      job?.budgetMax ||
      job?.maxBudget ||
      job?.expectedBudgetMax ||
      job?.projectBudgetMax;

    if (min && max) return `$${min} - $${max}`;
    if (min) return `From $${min}`;
    if (max) return `Up to $${max}`;

    return "Budget not set";
  };

  const getDurationText = () => {
    const duration =
      job?.durationDays ||
      job?.preferredProjectDurationDays ||
      job?.estimatedDurationDays;

    if (!duration) return "Duration not set";

    return `${duration} days`;
  };

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

  const inputStyle =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]";

  const labelStyle =
    "mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400";

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
              Write a clear proposal with your price, estimated duration and
              work plan.
            </p>
          </div>

          {loading && (
            <div className={`${cardStyle} p-12 text-center text-gray-400`}>
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                hourglass_empty
              </span>
              Loading job information...
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-5 rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-4 text-sm text-green-300">
              {message}
            </div>
          )}

          {!loading && job && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
              {/* Proposal form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <section className={`${cardStyle} p-6 md:p-8`}>
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                      <span className="material-symbols-outlined text-xl text-[#00F0FF]">
                        description
                      </span>
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-white">
                        Proposal Content
                      </h2>
                      <p className="text-sm text-gray-500">
                        Tell the client why you are suitable.
                      </p>
                    </div>
                  </div>

                  <label className={labelStyle}>Cover Letter</label>

                  <textarea
                    name="coverLetter"
                    value={formData.coverLetter}
                    onChange={handleChange}
                    rows="6"
                    placeholder="Introduce yourself and explain why you can complete this job..."
                    className={`${inputStyle} resize-none`}
                  />

                  <p className="mt-2 text-xs text-gray-500">
                    Minimum 30 characters.
                  </p>
                </section>

                <section className={`${cardStyle} p-6 md:p-8`}>
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                      <span className="material-symbols-outlined text-xl text-[#00F0FF]">
                        payments
                      </span>
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-white">
                        Price & Time
                      </h2>
                      <p className="text-sm text-gray-500">
                        Your proposed budget and delivery time.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className={labelStyle}>Proposed Budget</label>
                      <input
                        type="number"
                        name="proposedBudget"
                        value={formData.proposedBudget}
                        onChange={handleChange}
                        min="1"
                        placeholder="500"
                        className={inputStyle}
                      />
                    </div>

                    <div>
                      <label className={labelStyle}>
                        Estimated Duration Days
                      </label>
                      <input
                        type="number"
                        name="estimatedDurationDays"
                        value={formData.estimatedDurationDays}
                        onChange={handleChange}
                        min="1"
                        step="1"
                        placeholder="14"
                        className={inputStyle}
                      />
                    </div>
                  </div>
                </section>

                <section className={`${cardStyle} p-6 md:p-8`}>
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                      <span className="material-symbols-outlined text-xl text-[#00F0FF]">
                        checklist
                      </span>
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-white">
                        Work Plan
                      </h2>
                      <p className="text-sm text-gray-500">
                        Explain how you will complete the job.
                      </p>
                    </div>
                  </div>

                  <label className={labelStyle}>Work Plan</label>

                  <textarea
                    name="workPlan"
                    value={formData.workPlan}
                    onChange={handleChange}
                    rows="6"
                    placeholder="Step 1: Analyze requirements. Step 2: Build solution. Step 3: Test and deliver..."
                    className={`${inputStyle} resize-none`}
                  />

                  <p className="mt-2 text-xs text-gray-500">
                    Minimum 30 characters.
                  </p>
                </section>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-8 py-3 text-sm font-bold text-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.15)] transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Proposal"}
                  </button>
                </div>
              </form>

              {/* Job summary */}
              <aside className="space-y-6">
                <section className={`${cardStyle} p-6`}>
                  <h2 className="mb-4 text-lg font-bold text-white">
                    Job Summary
                  </h2>

                  <h3 className="text-xl font-bold text-white">
                    {getJobTitle()}
                  </h3>

                  <p className="mt-3 line-clamp-5 text-sm leading-6 text-gray-400">
                    {getJobDescription() || "No description provided."}
                  </p>

                  <div className="mt-6 space-y-5">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500">
                        Client Budget
                      </p>
                      <p className="mt-1 text-xl font-bold text-white">
                        {getBudgetText()}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500">
                        Duration
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-300">
                        {getDurationText()}
                      </p>
                    </div>
                  </div>
                </section>

                <section className={`${cardStyle} p-6`}>
                  <h2 className="mb-4 text-lg font-bold text-white">
                    Tips for better proposal
                  </h2>

                  <ul className="space-y-3 text-sm leading-6 text-gray-400">
                    <li>• Explain your relevant experience.</li>
                    <li>• Give a clear working plan.</li>
                    <li>• Make your budget reasonable.</li>
                    <li>• Keep your proposal short and clear.</li>
                  </ul>
                </section>
              </aside>
            </div>
          )}
        </div>
      </div>
    </ExpertLayout>
  );
}