import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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

      console.log("CURRENT JOB ID:", jobId);

      if (!jobId || jobId === "undefined" || jobId === "null") {
        setError("Invalid job ID. Please go back and choose another job.");
        return;
      }

      const data = await jobService.getJobById(jobId);

      if (!data) {
        setError(`Job not found. Job ID: ${jobId}`);
        return;
      }

      setJob(data);
    } catch (err) {
      console.error("LOAD JOB DETAIL ERROR:", err?.response?.data || err);
      console.error("CURRENT JOB ID:", jobId);

      const status = err?.response?.status;
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        err?.message ||
        "";

      if (status === 404) {
        setError(`Job not found. Job ID: ${jobId}`);
      } else if (status === 401 || status === 403) {
        setError("You do not have permission to view this job.");
      } else {
        setError(message || "We could not load this job. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value) => {
    const number = Number(value || 0);

    if (!number) return "Negotiable";

    return `$${number.toLocaleString("en-US")}`;
  };

  const formatBudgetRange = (job) => {
    const min = Number(job?.budgetMin || 0);
    const max = Number(job?.budgetMax || 0);

    if (!min && !max) return "Negotiable";
    if (min && !max) return `From ${formatMoney(min)}`;
    if (!min && max) return `Up to ${formatMoney(max)}`;

    return `${formatMoney(min)} - ${formatMoney(max)}`;
  };

  const formatDate = (value) => {
    if (!value) return "No deadline";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "No deadline";

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  const formatCreatedAt = (value) => {
    if (!value) return "Recently posted";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Recently posted";

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          <div className="text-center">
            <span className="material-symbols-outlined mb-3 block text-5xl text-[#00F0FF]">
              work
            </span>
            Loading job detail...
          </div>
        </div>
      </ExpertLayout>
    );
  }

  if (error) {
    return (
      <ExpertLayout>
        <div className="px-5 py-10 md:px-8">
          <div className="mx-auto max-w-5xl">
            <button
              type="button"
              onClick={() => navigate("/expert/jobs")}
              className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-gray-400 transition hover:text-cyan-300"
            >
              <span className="material-symbols-outlined text-[18px]">
                arrow_back
              </span>
              Back to jobs
            </button>

            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-10 text-center">
              <span className="material-symbols-outlined mb-3 block text-5xl text-red-300">
                error
              </span>

              <h2 className="text-xl font-bold text-white">
                Cannot load job detail
              </h2>

              <p className="mt-2 text-sm text-red-200">{error}</p>

              <button
                type="button"
                onClick={loadJobDetail}
                className="mt-6 rounded-xl border border-red-400/40 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-200 transition hover:bg-red-400 hover:text-black"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </ExpertLayout>
    );
  }

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <button
            type="button"
            onClick={() => navigate("/expert/jobs")}
            className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-gray-400 transition hover:text-cyan-300"
          >
            <span className="material-symbols-outlined text-[18px]">
              arrow_back
            </span>
            Back to jobs
          </button>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
            <main className="space-y-6">
              <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#151a22] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
                <div className="relative p-6 md:p-8">
                  <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
                  <div className="absolute bottom-0 left-20 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl" />

                  <div className="relative">
                    <div className="mb-5 flex flex-wrap items-center gap-2">
                      <StatusBadge status={job.status} />

                      <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                        {job.category || "General"}
                      </span>

                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Posted {formatCreatedAt(job.createdAt)}
                      </span>
                    </div>

                    <h1 className="max-w-4xl text-3xl font-extrabold leading-tight text-white md:text-5xl">
                      {job.title}
                    </h1>

                    <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-400 md:text-base">
                      {job.description || "No description provided."}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        to={`/expert/jobs/${jobId}/proposal`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          send
                        </span>
                        Apply for this job
                      </Link>

                      <button
                        type="button"
                        onClick={() => navigate("/expert/recommended-jobs")}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          auto_awesome
                        </span>
                        View AI Jobs
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
                <SectionHeader
                  icon="description"
                  title="Job Description"
                  description="Read the client requirements carefully before applying."
                />

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="whitespace-pre-line text-sm leading-7 text-gray-300 md:text-[15px]">
                    {job.description || "No description provided."}
                  </p>
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
                <SectionHeader
                  icon="psychology"
                  title="Required Skills"
                  description="Skills the client expects for this job."
                />

                {job.skills && job.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-bold text-cyan-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-gray-500">
                    No skills listed.
                  </p>
                )}
              </section>
            </main>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
                <h2 className="mb-5 text-lg font-extrabold text-white">
                  Job Summary
                </h2>

                <div className="space-y-4">
                  <SummaryItem
                    icon="payments"
                    label="Budget"
                    value={formatBudgetRange(job)}
                  />

                  <SummaryItem
                    icon="calendar_month"
                    label="Duration"
                    value={
                      job.durationDays ? `${job.durationDays} days` : "Flexible"
                    }
                  />

                  <SummaryItem
                    icon="event"
                    label="Deadline"
                    value={formatDate(job.deadline)}
                  />

                  <SummaryItem
                    icon="schedule"
                    label="Posted Date"
                    value={formatCreatedAt(job.createdAt)}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                  <span className="material-symbols-outlined text-[26px]">
                    rocket_launch
                  </span>
                </div>

                <h2 className="text-lg font-extrabold text-white">
                  Ready to apply?
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Write a clear proposal. Explain your experience, plan, price,
                  and delivery time.
                </p>

                <Link
                  to={`/expert/jobs/${jobId}/proposal`}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    send
                  </span>
                  Apply for this job
                </Link>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </ExpertLayout>
  );
}

function StatusBadge({ status }) {
  const value = String(status || "OPEN").toUpperCase();

  if (value === "OPEN" || value === "ACTIVE") {
    return (
      <span className="rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-green-300">
        {value}
      </span>
    );
  }

  if (value === "CLOSED" || value === "CANCELLED") {
    return (
      <span className="rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-red-300">
        {value}
      </span>
    );
  }

  return (
    <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-yellow-300">
      {value}
    </span>
  );
}

function SectionHeader({ icon, title, description }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <div>
        <h2 className="text-lg font-extrabold text-white">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-gray-500">{description}</p>
      </div>
    </div>
  );
}

function SummaryItem({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <span className="material-symbols-outlined mt-[2px] text-[20px] text-cyan-300">
        {icon}
      </span>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
          {label}
        </p>

        <p className="mt-1 text-sm font-bold text-white">{value}</p>
      </div>
    </div>
  );
}