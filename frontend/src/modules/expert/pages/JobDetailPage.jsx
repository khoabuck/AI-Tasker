import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import jobService from "../../../services/job.service";

export default function JobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
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

  const getTitle = () => {
    return job?.title || job?.jobTitle || job?.name || "Untitled Job";
  };

  const getDescription = () => {
    return job?.description || job?.jobDescription || job?.summary || "";
  };

  const getStatus = () => {
    return job?.status || "OPEN";
  };

  const getSkills = () => {
    if (Array.isArray(job?.skills)) return job.skills;
    if (Array.isArray(job?.requiredSkills)) return job.requiredSkills;

    if (typeof job?.skills === "string") {
      return job.skills
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (typeof job?.requiredSkills === "string") {
      return job.requiredSkills
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
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

  const getClientName = () => {
    return (
      job?.clientName ||
      job?.client?.fullName ||
      job?.client?.name ||
      "Client"
    );
  };

  const formatDate = (value) => {
    if (!value) return "No date";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "No date";

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Back */}
          <button
            type="button"
            onClick={() => navigate("/expert/jobs")}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Back to jobs
          </button>

          {/* Loading */}
          {loading && (
            <div className={`${cardStyle} p-12 text-center text-gray-400`}>
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                hourglass_empty
              </span>
              Loading job detail...
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {!loading && job && (
            <>
              {/* Header */}
              <section className={`${cardStyle} mb-6 p-6 md:p-8`}>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-300">
                    {getStatus()}
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                    Posted {formatDate(job.createdAt || job.postedAt)}
                  </span>
                </div>

                <h1 className="text-3xl font-bold text-white md:text-4xl">
                  {getTitle()}
                </h1>

                <p className="mt-3 text-sm text-gray-400">
                  Posted by{" "}
                  <span className="font-semibold text-cyan-300">
                    {getClientName()}
                  </span>
                </p>
              </section>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
                {/* Main detail */}
                <div className="space-y-6">
                  {/* Description */}
                  <section className={`${cardStyle} p-6 md:p-8`}>
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                        <span className="material-symbols-outlined text-xl text-[#00F0FF]">
                          description
                        </span>
                      </div>

                      <div>
                        <h2 className="text-lg font-bold text-white">
                          Job Description
                        </h2>
                        <p className="text-sm text-gray-500">
                          What the client needs.
                        </p>
                      </div>
                    </div>

                    <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                      {getDescription() || "No description provided."}
                    </p>
                  </section>

                  {/* Skills */}
                  <section className={`${cardStyle} p-6 md:p-8`}>
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                        <span className="material-symbols-outlined text-xl text-[#00F0FF]">
                          psychology
                        </span>
                      </div>

                      <div>
                        <h2 className="text-lg font-bold text-white">
                          Required Skills
                        </h2>
                        <p className="text-sm text-gray-500">
                          Skills needed for this job.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {getSkills().length === 0 && (
                        <p className="text-sm text-gray-500">
                          No skills listed.
                        </p>
                      )}

                      {getSkills().map((skill, index) => (
                        <span
                          key={`${skill}-${index}`}
                          className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Sidebar */}
                <aside className="space-y-6">
                  <section className={`${cardStyle} p-6`}>
                    <h2 className="mb-5 text-lg font-bold text-white">
                      Job Summary
                    </h2>

                    <div className="space-y-5">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500">
                          Budget
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

                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500">
                          Client
                        </p>
                        <p className="mt-1 text-sm font-semibold text-gray-300">
                          {getClientName()}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className={`${cardStyle} p-6`}>
                    <h2 className="mb-4 text-lg font-bold text-white">
                      Ready to apply?
                    </h2>

                    <p className="mb-5 text-sm leading-6 text-gray-400">
                      Send a clear proposal with your price, estimated time, and
                      working plan.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/expert/jobs/${jobId}/proposal`)
                      }
                      className="w-full rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                    >
                      Submit Proposal
                    </button>
                  </section>
                </aside>
              </div>
            </>
          )}
        </div>
      </div>
    </ExpertLayout>
  );
}