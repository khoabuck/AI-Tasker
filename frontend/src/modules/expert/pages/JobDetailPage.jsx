import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import jobService from "../../../services/job.service";

export default function JobDetailPage() {
  const navigate = useNavigate();
  const { jobId } = useParams();

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
      const normalizedJobId = getJobId(data);

      if (!normalizedJobId) {
        throw new Error("Job detail does not have a valid id.");
      }

      setJob({
        ...data,
        id: normalizedJobId,
      });
    } catch (err) {
      console.error("LOAD JOB DETAIL ERROR:", err?.response?.data || err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Cannot load job detail right now."
      );
    } finally {
      setLoading(false);
    }
  };

  const skills = useMemo(() => normalizeSkills(job?.skills), [job]);
  const hasExpectedDeliverables = Boolean(
    String(job?.expectedDeliverables || "").trim()
  );

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading job detail...
        </div>
      </ExpertLayout>
    );
  }

  if (error) {
    return (
      <ExpertLayout>
        <div className="px-5 py-10 md:px-8">
          <div className="mx-auto max-w-5xl">
            <BackButton onClick={() => navigate("/expert/jobs")} />

            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-10 text-center text-red-300">
              <h2 className="text-xl font-bold text-white">
                Cannot load job detail
              </h2>

              <p className="mt-2 text-sm">{error}</p>

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
          <BackButton onClick={() => navigate("/expert/jobs")} />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
            <main className="space-y-6">
              <section className="rounded-3xl border border-white/10 bg-[#151a22] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-8">
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <Badge tone="green">{job.status || "OPEN"}</Badge>
                  <Badge>{job.category || "General"}</Badge>
                  {job.complexity && <Badge tone="purple">{job.complexity}</Badge>}
                </div>

                <h1 className="max-w-4xl text-3xl font-extrabold leading-tight text-white md:text-5xl">
                  {job.title || "Untitled Job"}
                </h1>

                <p className="mt-5 max-w-4xl whitespace-pre-line text-sm leading-7 text-gray-400 md:text-base">
                  {job.description || "No project description provided."}
                </p>

                <div className="mt-7 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <MiniInfo
                    icon="payments"
                    label="Budget"
                    value={formatBudget(job.budgetMin, job.budgetMax)}
                  />

                  <MiniInfo
                    icon="schedule"
                    label="Timeline"
                    value={
                      job.durationDays ? `${job.durationDays} days` : "Flexible"
                    }
                  />

                  <MiniInfo
                    icon="event"
                    label="Deadline"
                    value={formatDate(job.deadline)}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-[#151a22] p-6">
                <SectionHeader
                  icon="article"
                  title="Project Description"
                  description="Understand what the client needs before writing your proposal."
                />

                <p className="mt-5 whitespace-pre-line text-sm leading-7 text-gray-300">
                  {job.description || "No project description provided."}
                </p>
              </section>

              {job.aiGeneratedDescription && (
                <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-6">
                  <SectionHeader
                    icon="auto_awesome"
                    title="Suggested Project Scope"
                    description="AI-assisted summary to help you understand the project faster."
                  />

                  <p className="mt-5 whitespace-pre-line text-sm leading-7 text-gray-300">
                    {job.aiGeneratedDescription}
                  </p>
                </section>
              )}

              <section className="rounded-2xl border border-white/10 bg-[#151a22] p-6">
                <SectionHeader
                  icon="psychology"
                  title="Required Skills"
                  description="Skills the client expects for this project."
                />

                {skills.length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-bold text-cyan-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-gray-500">
                    No specific skills listed.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-white/10 bg-[#151a22] p-6">
                <SectionHeader
                  icon="task_alt"
                  title="Expected Outcomes"
                  description="What the client expects to receive when the project is completed."
                />

                <p className="mt-5 whitespace-pre-line text-sm leading-7 text-gray-300">
                  {hasExpectedDeliverables
                    ? job.expectedDeliverables
                    : "The client has not listed specific deliverables yet. You can clarify expected outcomes in your proposal."}
                </p>
              </section>
            </main>

            <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
              <section className="rounded-2xl border border-white/10 bg-[#151a22] p-6">
                <h2 className="mb-5 text-lg font-extrabold text-white">
                  Project Snapshot
                </h2>

                <div className="space-y-4">
                  <SummaryItem
                    icon="payments"
                    label="Client Budget"
                    value={formatBudget(job.budgetMin, job.budgetMax)}
                  />

                  <SummaryItem
                    icon="schedule"
                    label="Estimated Timeline"
                    value={
                      job.durationDays ? `${job.durationDays} days` : "Flexible"
                    }
                  />

                  <SummaryItem
                    icon="event_available"
                    label="Deadline"
                    value={formatDate(job.deadline)}
                  />

                  <SummaryItem
                    icon="person"
                    label="Client"
                    value={job.clientName || "Client"}
                  />

                  <SummaryItem
                    icon="calendar_month"
                    label="Posted"
                    value={formatDate(job.createdAt)}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                  <span className="material-symbols-outlined">send</span>
                </div>

                <h2 className="text-lg font-extrabold text-white">
                  Ready to apply?
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Send one clear proposal with your plan, timeline, price, and
                  why you are a good fit.
                </p>

                <Link
                  to={`/expert/jobs/${job.id}/proposal`}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                >
                  Submit Proposal
                </Link>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </ExpertLayout>
  );
}

function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-gray-400 transition hover:text-cyan-300"
    >
      ← Back to jobs
    </button>
  );
}

function Badge({ children, tone = "cyan" }) {
  const style =
    tone === "green"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : tone === "purple"
      ? "border-purple-400/30 bg-purple-400/10 text-purple-300"
      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {children}
    </span>
  );
}

function MiniInfo({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>

      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 font-bold text-white">{value || "N/A"}</p>
    </div>
  );
}

function SectionHeader({ icon, title, description }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <div>
        <h2 className="text-xl font-extrabold text-white">{title}</h2>

        {description && (
          <p className="mt-1 text-sm leading-6 text-gray-500">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function SummaryItem({ icon, label, value }) {
  return (
    <div className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-cyan-300">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
        <p className="mt-1 font-bold text-white">{value || "N/A"}</p>
      </div>
    </div>
  );
}

function getJobId(job) {
  return job?.id || job?.jobId || job?.JobId || job?.ID || job?.Id;
}

function normalizeSkills(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        return item?.name || item?.Name || item?.skillName || item?.SkillName;
      })
      .filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatBudget(min, max) {
  const minValue = Number(min || 0);
  const maxValue = Number(max || 0);

  if (!minValue && !maxValue) return "Negotiable";
  if (minValue && !maxValue) return `From $${minValue}`;
  if (!minValue && maxValue) return `Up to $${maxValue}`;

  return `$${minValue} - $${maxValue}`;
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}