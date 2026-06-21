import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import jobService from "../../../services/job.service";
import { JobDetailModal } from "./JobDetailPage";

export default function RecommendedJobsPage() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadRecommendedJobs();
  }, []);

  const normalizedJobs = useMemo(() => {
    return jobs.map(normalizeJob).filter((job) => job.id);
  }, [jobs]);

  const topMatch = useMemo(() => {
    if (normalizedJobs.length === 0) return 0;

    return Math.max(...normalizedJobs.map((job) => Number(job.matchScore || 0)));
  }, [normalizedJobs]);

  const averageMatch = useMemo(() => {
    if (normalizedJobs.length === 0) return 0;

    const total = normalizedJobs.reduce(
      (sum, job) => sum + Number(job.matchScore || 0),
      0
    );

    return Math.round(total / normalizedJobs.length);
  }, [normalizedJobs]);

  const loadRecommendedJobs = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await jobService.getRecommendedJobs(10);

      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("LOAD RECOMMENDED JOBS ERROR:", err?.response?.data || err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Cannot load recommended jobs right now."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (job) => {
    if (!job?.id) {
      setError("This recommendation is unavailable right now.");
      return;
    }

    setSelectedJobId(job.id);
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Finding recommended jobs...
        </div>
      </ExpertLayout>
    );
  }

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="mb-8 overflow-hidden rounded-3xl border border-white/10 bg-[#151a22] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-8">
            <div className="relative">
              <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="absolute bottom-0 right-32 h-36 w-36 rounded-full bg-purple-400/10 blur-3xl" />

              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                    AI Recommended Jobs
                  </p>

                  <h1 className="max-w-3xl text-3xl font-extrabold leading-tight text-white md:text-5xl">
                    Opportunities matched to your expert profile
                  </h1>

                  <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-400">
                    Review projects selected for your skills and experience.
                    Open details only when you want to see the full scope.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => navigate("/expert/jobs")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      work
                    </span>
                    Browse All Jobs
                  </button>

                  <button
                    type="button"
                    onClick={loadRecommendedJobs}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      refresh
                    </span>
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard
              icon="auto_awesome"
              label="Recommendations"
              value={normalizedJobs.length}
              description="Curated opportunities"
              tone="cyan"
            />

            <StatCard
              icon="workspace_premium"
              label="Top Match"
              value={`${Math.round(topMatch)}%`}
              description="Highest skill alignment"
              tone="green"
            />

            <StatCard
              icon="monitoring"
              label="Average Match"
              value={`${averageMatch}%`}
              description="Across recommended jobs"
              tone="purple"
            />
          </section>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-5 text-red-300">
              <p className="font-bold">Cannot load recommendations</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          )}

          {!error && normalizedJobs.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {normalizedJobs.map((job) => (
                <RecommendedJobCard
                  key={job.id}
                  job={job}
                  onViewDetail={() => handleViewDetail(job)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedJobId && (
        <JobDetailModal
          jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)}
        />
      )}
    </ExpertLayout>
  );
}

function RecommendedJobCard({ job, onViewDetail }) {
  const visibleSkills = job.skills.slice(0, 3);
  const hiddenSkillCount = Math.max(job.skills.length - visibleSkills.length, 0);

  return (
    <article className="group rounded-3xl border border-white/10 bg-[#151a22] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.25)] transition hover:-translate-y-1 hover:border-cyan-400/40 hover:bg-[#171d26]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Badge tone="green">{Math.round(job.matchScore || 0)}% match</Badge>
          <Badge>{job.category || "General"}</Badge>
          {job.complexity && <Badge tone="purple">{job.complexity}</Badge>}
        </div>

        <div className="shrink-0 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
            Match
          </p>

          <p className="text-xl font-black text-white">
            {Math.round(job.matchScore || 0)}%
          </p>
        </div>
      </div>

      <h2 className="line-clamp-2 text-xl font-extrabold leading-snug text-white transition group-hover:text-cyan-200">
        {job.title}
      </h2>

      <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-400">
        {job.description || "No description provided."}
      </p>

      {job.matchReason && (
        <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-cyan-300">
            <span className="material-symbols-outlined text-[18px]">
              psychology
            </span>

            <p className="text-xs font-bold uppercase tracking-wider">
              Why this matches you
            </p>
          </div>

          <p className="line-clamp-2 text-sm leading-6 text-cyan-50">
            {job.matchReason}
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {visibleSkills.length > 0 ? (
          <>
            {visibleSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-300"
              >
                {skill}
              </span>
            ))}

            {hiddenSkillCount > 0 && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-500">
                +{hiddenSkillCount} more
              </span>
            )}
          </>
        ) : (
          <span className="text-xs text-gray-500">No skills listed</span>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <InfoBox
          icon="payments"
          label="Budget"
          value={formatBudget(job.budgetMin, job.budgetMax)}
        />

        <InfoBox icon="event" label="Deadline" value={formatDate(job.deadline)} />
      </div>

      <button
        type="button"
        onClick={onViewDetail}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
      >
        View Details
        <span className="material-symbols-outlined text-[18px]">
          visibility
        </span>
      </button>
    </article>
  );
}

function InfoBox({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-cyan-300">
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </div>

      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 font-bold text-white">{value || "N/A"}</p>
    </div>
  );
}

function StatCard({ icon, label, value, description, tone }) {
  const toneClass =
    tone === "green"
      ? "border-green-400/20 bg-green-400/10 text-green-300"
      : tone === "purple"
      ? "border-purple-400/20 bg-purple-400/10 text-purple-300"
      : "border-cyan-400/20 bg-cyan-400/10 text-[#00F0FF]";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22] p-5">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${toneClass}`}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-gray-500">{description}</p>
    </div>
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

function EmptyState() {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#151a22] px-6 py-14 text-center">
      <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
        auto_awesome_motion
      </span>

      <h2 className="text-xl font-bold text-white">
        No recommended jobs found
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">
        Keep your expert profile updated with skills, portfolio, and certificates
        to receive better project recommendations.
      </p>
    </div>
  );
}

function normalizeJob(job) {
  return {
    ...job,
    id:
      job?.id ||
      job?.jobId ||
      job?.JobId ||
      job?.jobPostingId ||
      job?.JobPostingId ||
      job?.Id,
    title:
      job?.title ||
      job?.Title ||
      job?.jobTitle ||
      job?.JobTitle ||
      "Untitled Project",
    description:
      job?.description ||
      job?.Description ||
      job?.jobDescription ||
      job?.JobDescription ||
      "",
    category:
      job?.projectType ||
      job?.ProjectType ||
      job?.category ||
      job?.Category ||
      "General",
    complexity: job?.complexity || job?.Complexity || "",
    skills: normalizeSkills(job?.skills || job?.Skills),
    budgetMin: Number(job?.budgetMin ?? job?.BudgetMin ?? 0),
    budgetMax: Number(job?.budgetMax ?? job?.BudgetMax ?? 0),
    deadline: job?.deadline || job?.Deadline || null,
    matchScore: Number(job?.matchScore ?? job?.MatchScore ?? 0),
    matchReason: job?.matchReason || job?.MatchReason || "",
  };
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
  if (!value) return "Flexible";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Flexible";

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}