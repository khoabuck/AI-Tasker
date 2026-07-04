import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import expertProfileService from "../../../services/expertProfile.service";
import jobService from "../../../services/job.service";
import { JobDetailModal } from "./JobDetailPage";

const JOBS_PER_PAGE = 6;

const BUDGET_FILTERS = [
  { key: "ALL", label: "Any budget" },
  { key: "NEGOTIABLE", label: "Negotiable" },
  { key: "UNDER_100", label: "Under $100,000" },
  { key: "100_500", label: "$100,000 - $500,000" },
  { key: "500_1000", label: "$500,000 - $1,000,000" },
  { key: "OVER_1000", label: "Over $1,000,000" },
];

const DURATION_FILTERS = [
  { key: "ALL", label: "Any duration" },
  { key: "FLEXIBLE", label: "Flexible" },
  { key: "SHORT", label: "1 - 7 days" },
  { key: "MEDIUM", label: "8 - 30 days" },
  { key: "LONG", label: "30+ days" },
];

export default function BrowseJobsPage() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [profile, setProfile] = useState(null);

  const [keyword, setKeyword] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [budgetFilter, setBudgetFilter] = useState("ALL");
  const [durationFilter, setDurationFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("NEWEST");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedJobId, setSelectedJobId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPageData();
  }, []);

  const expertProfile = useMemo(() => normalizeProfile(profile), [profile]);

  const activeJobs = useMemo(() => {
    return jobs
      .map((job) => normalizeJob(job, expertProfile))
      .filter((job) => job.id)
      .filter(isActiveJob);
  }, [jobs, expertProfile]);

  const categories = useMemo(() => {
    return getUniqueValues(activeJobs.map((job) => job.category));
  }, [activeJobs]);

  const filteredJobs = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    let result = activeJobs.filter((job) => {
      const matchKeyword =
        !q ||
        job.title.toLowerCase().includes(q) ||
        job.description.toLowerCase().includes(q) ||
        job.category.toLowerCase().includes(q) ||
        job.skills.join(" ").toLowerCase().includes(q);

      const matchCategory =
        categoryFilter === "ALL" || job.category === categoryFilter;

      return (
        matchKeyword &&
        matchCategory &&
        matchesBudget(job, budgetFilter) &&
        matchesDuration(job, durationFilter)
      );
    });

    if (sortBy === "BEST_MATCH") {
      result = [...result].sort((a, b) => b.matchScore - a.matchScore);
    }

    if (sortBy === "BUDGET_HIGH") {
      result = [...result].sort((a, b) => b.budgetMax - a.budgetMax);
    }

    if (sortBy === "BUDGET_LOW") {
      result = [...result].sort((a, b) => a.budgetMin - b.budgetMin);
    }

    if (sortBy === "DEADLINE") {
      result = [...result].sort(
        (a, b) =>
          new Date(a.deadline || "9999-12-31") -
          new Date(b.deadline || "9999-12-31")
      );
    }

    if (sortBy === "NEWEST") {
      result = [...result].sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );
    }

    return result;
  }, [
    activeJobs,
    keyword,
    categoryFilter,
    budgetFilter,
    durationFilter,
    sortBy,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / JOBS_PER_PAGE));

  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * JOBS_PER_PAGE;
    return filteredJobs.slice(startIndex, startIndex + JOBS_PER_PAGE);
  }, [filteredJobs, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, categoryFilter, budgetFilter, durationFilter, sortBy]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const hasActiveFilter =
    keyword ||
    categoryFilter !== "ALL" ||
    budgetFilter !== "ALL" ||
    durationFilter !== "ALL" ||
    sortBy !== "NEWEST";

  const loadPageData = async () => {
    try {
      setLoading(true);
      setError("");

      const [jobsResult, profileResult] = await Promise.allSettled([
        jobService.getOpenJobs(),
        expertProfileService.getMyExpertProfile(),
      ]);

      if (jobsResult.status === "fulfilled") {
        setJobs(Array.isArray(jobsResult.value) ? jobsResult.value : []);
      } else {
        throw jobsResult.reason;
      }

      if (profileResult.status === "fulfilled") {
        setProfile(profileResult.value);
      } else {
        console.warn(
          "LOAD EXPERT PROFILE WARNING:",
          profileResult.reason?.response?.data || profileResult.reason
        );
        setProfile(null);
      }
    } catch (err) {
      console.error("LOAD JOBS ERROR:", err?.response?.data || err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Cannot load jobs right now."
      );
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setKeyword("");
    setCategoryFilter("ALL");
    setBudgetFilter("ALL");
    setDurationFilter("ALL");
    setSortBy("NEWEST");
    setCurrentPage(1);
  };

  const handleViewDetail = (job) => {
    if (!job?.id) {
      setError("This job is unavailable right now. Please try another job.");
      return;
    }

    setSelectedJobId(job.id);
  };

  return (
    <ExpertLayout>
      <div className="px-5 py-8 md:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="mb-6 rounded-3xl border border-white/10 bg-[#151a22] p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                  Browse Jobs
                </p>

                <h1 className="max-w-3xl text-2xl font-extrabold leading-tight text-white md:text-4xl">
                  Find active projects you can apply for
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-400">
                  Browse all open jobs from clients. Each card explains why the
                  project may fit your skills, budget preference, or timeline.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate("/expert/recommended-jobs")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-purple-400/40 bg-purple-400/10 px-5 py-3 text-sm font-bold text-purple-300 transition hover:bg-purple-400 hover:text-black"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    auto_awesome
                  </span>
                  AI Recommended
                </button>

                <button
                  type="button"
                  onClick={loadPageData}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    refresh
                  </span>
                  Refresh
                </button>
              </div>
            </div>
          </section>

          <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard
              icon="work"
              label="Active Jobs"
              value={activeJobs.length}
              description="Open for proposals"
            />

            <StatCard
              icon="search"
              label="Showing"
              value={filteredJobs.length}
              description="After filters"
              tone="green"
            />

            <StatCard
              icon="auto_awesome"
              label="Strong Matches"
              value={activeJobs.filter((job) => job.matchScore >= 70).length}
              description="Based on your profile"
              tone="purple"
            />

            <StatCard
              icon="sell"
              label="Categories"
              value={categories.length}
              description="Available fields"
              tone="yellow"
            />
          </section>

          <section className="mb-5 rounded-2xl border border-white/10 bg-[#151a22] p-4">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-extrabold text-white">
                  Search projects
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Filter by keyword, category, budget, duration, or sort by best
                  fit.
                </p>
              </div>

              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="w-fit rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
                >
                  Clear filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-gray-500">
                  search
                </span>

                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Search by title, skill, or category..."
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
                />
              </div>

              <SelectFilter
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={[
                  { key: "ALL", label: "Any category" },
                  ...categories.map((category) => ({
                    key: category,
                    label: category,
                  })),
                ]}
              />

              <SelectFilter
                value={budgetFilter}
                onChange={setBudgetFilter}
                options={BUDGET_FILTERS}
              />

              <SelectFilter
                value={durationFilter}
                onChange={setDurationFilter}
                options={DURATION_FILTERS}
              />

              <SelectFilter
                value={sortBy}
                onChange={setSortBy}
                options={[
                  { key: "NEWEST", label: "Newest" },
                  { key: "BEST_MATCH", label: "Best fit" },
                  { key: "DEADLINE", label: "Deadline" },
                  { key: "BUDGET_HIGH", label: "Highest budget" },
                  { key: "BUDGET_LOW", label: "Lowest budget" },
                ]}
              />
            </div>
          </section>

          {loading && (
            <div className="flex min-h-[40vh] items-center justify-center rounded-3xl border border-white/10 bg-[#151a22] text-gray-400">
              Loading active jobs...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-5 text-red-300">
              <p className="font-bold">Cannot load jobs</p>
              <p className="mt-1 text-sm">{error}</p>

              <button
                type="button"
                onClick={loadPageData}
                className="mt-5 rounded-xl border border-red-400/40 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && filteredJobs.length === 0 && (
            <EmptyState
              title="No active jobs found"
              description="Try changing your search filters or refresh the page."
            />
          )}

          {!loading && !error && filteredJobs.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-4">
                {paginatedJobs.map((job) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    onViewDetail={() => handleViewDetail(job)}
                    onSubmit={() => navigate(`/expert/jobs/${job.id}/proposal`)}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
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

function JobRow({ job, onViewDetail, onSubmit }) {
  const visibleSkills = job.skills.slice(0, 5);
  const hiddenSkillCount = Math.max(job.skills.length - visibleSkills.length, 0);

  return (
    <article className="rounded-2xl border border-white/10 bg-[#151a22] p-4 transition hover:border-cyan-400/40">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_290px] lg:items-center">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <FitBadge score={job.matchScore} />
            <Badge>{job.category}</Badge>
            <Badge tone="green">Open</Badge>
            {job.complexity && <Badge tone="purple">{job.complexity}</Badge>}
          </div>
                    <h2 className="text-lg font-extrabold text-white">{job.title}</h2>

          <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-400">
            {job.description || "No description provided."}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
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

          <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3">
            <div className="mb-1 flex items-center gap-2 text-cyan-300">
              <span className="material-symbols-outlined text-[17px]">
                psychology
              </span>
              <p className="text-xs font-bold uppercase tracking-wider">
                Why it may fit you
              </p>
            </div>

            <p className="text-sm leading-6 text-cyan-50">
              {job.matchReason}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <InfoBox
              icon="payments"
              label="Budget"
              value={formatBudget(job.budgetMin, job.budgetMax)}
            />

            <InfoBox
              icon="schedule"
              label="Timeline"
              value={formatDuration(job.durationDays)}
            />
          </div>

          <InfoBox
            icon="event"
            label="Deadline"
            value={formatDate(job.deadline)}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onViewDetail}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
            >
              Detail
            </button>

            <button
              type="button"
              onClick={onSubmit}
              className="flex-1 rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          className={`h-10 min-w-10 rounded-xl border px-3 text-sm font-extrabold transition ${
            currentPage === page
              ? "border-cyan-400 bg-cyan-400 text-black"
              : "border-white/10 bg-white/[0.04] text-gray-300 hover:border-cyan-400/50 hover:text-cyan-300"
          }`}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

function SelectFilter({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-xl border border-white/10 bg-[#151a22] px-3 text-sm font-semibold text-white outline-none transition focus:border-[#00F0FF]"
    >
      {options.map((item) => (
        <option key={item.key} value={item.key}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

function InfoBox({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-cyan-300">
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </div>

      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-white">{value || "N/A"}</p>
    </div>
  );
}

function StatCard({ icon, label, value, description, tone = "cyan" }) {
  const toneClass =
    tone === "green"
      ? "border-green-400/20 bg-green-400/10 text-green-300"
      : tone === "purple"
      ? "border-purple-400/20 bg-purple-400/10 text-purple-300"
      : tone === "yellow"
      ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
      : "border-cyan-400/20 bg-cyan-400/10 text-[#00F0FF]";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22] p-5">
      <div
        className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl border ${toneClass}`}
      >
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>

      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
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

function FitBadge({ score }) {
  const value = Math.round(Number(score || 0));

  const style =
    value >= 80
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : value >= 60
      ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
      : value >= 40
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : "border-white/10 bg-white/[0.04] text-gray-400";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {getFitLabel(value)} · {value}%
    </span>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#151a22] px-6 py-14 text-center">
      <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
        work_off
      </span>

      <h2 className="text-xl font-bold text-white">{title}</h2>
      <p className="mt-2 text-sm text-gray-400">{description}</p>
    </div>
  );
}

function normalizeProfile(profile) {
  return {
    skills: normalizeSkills(profile?.skills || profile?.Skills).map((item) =>
      item.toLowerCase()
    ),
    budgetMin: Number(
      profile?.expectedProjectBudgetMin ??
        profile?.ExpectedProjectBudgetMin ??
        0
    ),
    budgetMax: Number(
      profile?.expectedProjectBudgetMax ??
        profile?.ExpectedProjectBudgetMax ??
        0
    ),
    preferredDurationDays: Number(
      profile?.preferredProjectDurationDays ??
        profile?.PreferredProjectDurationDays ??
        0
    ),
    yearsOfExperience: Number(
      profile?.yearsOfExperience ?? profile?.YearsOfExperience ?? 0
    ),
  };
}

function normalizeJob(job, profile) {
  const normalized = {
    raw: job,
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
    status: String(job?.status || job?.Status || "OPEN").toUpperCase(),
    complexity: job?.complexity || job?.Complexity || "",
    skills: normalizeSkills(job?.skills || job?.Skills),
    budgetMin: Number(job?.budgetMin ?? job?.BudgetMin ?? 0),
    budgetMax: Number(job?.budgetMax ?? job?.BudgetMax ?? 0),
    durationDays: Number(
      job?.durationDays ??
        job?.DurationDays ??
        job?.estimatedDurationDays ??
        job?.EstimatedDurationDays ??
        0
    ),
    deadline: job?.deadline || job?.Deadline || null,
    createdAt: job?.createdAt || job?.CreatedAt || null,
  };

  const match = calculateMatch(normalized, profile);

  return {
    ...normalized,
    matchScore: match.score,
    matchReason: match.reason,
  };
}

function calculateMatch(job, profile) {
  const expertSkills = Array.isArray(profile?.skills) ? profile.skills : [];
  const jobSkills = job.skills.map((item) => item.toLowerCase());

  const matchedSkills = jobSkills.filter((skill) =>
    expertSkills.some(
      (expertSkill) =>
        expertSkill.includes(skill) || skill.includes(expertSkill)
    )
  );

  let score = 20;
  const reasons = [];

  if (jobSkills.length > 0 && matchedSkills.length > 0) {
    const skillScore = Math.round(
      (matchedSkills.length / jobSkills.length) * 55
    );
    score += Math.min(55, skillScore);
    reasons.push(
      `Your profile matches ${matchedSkills.length} required skill${
        matchedSkills.length > 1 ? "s" : ""
      }: ${matchedSkills.slice(0, 3).join(", ")}.`
    );
  }

  if (jobSkills.length === 0) {
    score += 10;
    reasons.push("The client has not listed strict skill requirements.");
  }

  const budgetFits =
    profile?.budgetMin > 0 &&
    profile?.budgetMax > 0 &&
    job.budgetMax > 0 &&
    job.budgetMin <= profile.budgetMax &&
    job.budgetMax >= profile.budgetMin;

  if (budgetFits) {
    score += 15;
    reasons.push("The budget is close to your preferred project range.");
  }

  const durationFits =
    profile?.preferredDurationDays > 0 &&
    job.durationDays > 0 &&
    job.durationDays <= profile.preferredDurationDays;

  if (durationFits) {
    score += 10;
    reasons.push("The timeline fits your preferred project duration.");
  }

  if (reasons.length === 0) {
    reasons.push(
      "This project is active and may still be worth reviewing based on your availability."
    );
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reason: reasons.join(" "),
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
      .filter(Boolean)
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isActiveJob(job) {
  const status = String(job?.status || "").toUpperCase();

  return ["OPEN", "ACTIVE", "PUBLISHED", "AVAILABLE"].includes(status);
}

function getUniqueValues(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b))
  );
}

function matchesBudget(job, filter) {
  if (filter === "ALL") return true;
  if (filter === "NEGOTIABLE") return job.budgetMin === 0 && job.budgetMax === 0;
  if (filter === "UNDER_100") return job.budgetMax > 0 && job.budgetMax < 100000;
  if (filter === "100_500") {
    return job.budgetMax >= 100000 && job.budgetMin <= 500000;
  }
  if (filter === "500_1000") {
    return job.budgetMax >= 500000 && job.budgetMin <= 1000000;
  }
  if (filter === "OVER_1000") return job.budgetMax > 1000000;

  return true;
}

function matchesDuration(job, filter) {
  if (filter === "ALL") return true;
  if (filter === "FLEXIBLE") return !job.durationDays || job.durationDays <= 0;
  if (filter === "SHORT") return job.durationDays >= 1 && job.durationDays <= 7;
  if (filter === "MEDIUM") return job.durationDays >= 8 && job.durationDays <= 30;
  if (filter === "LONG") return job.durationDays > 30;

  return true;
}

function getFitLabel(score) {
  if (score >= 80) return "Excellent fit";
  if (score >= 60) return "Good fit";
  if (score >= 40) return "Possible fit";
  return "Explore";
}

function formatBudget(min, max) {
  const minNumber = Number(min || 0);
  const maxNumber = Number(max || 0);

  if (minNumber <= 0 && maxNumber <= 0) return "Negotiable";
  if (minNumber > 0 && maxNumber > 0) {
    return `${formatMoney(minNumber)} - ${formatMoney(maxNumber)}`;
  }

  if (maxNumber > 0) return `Up to ${formatMoney(maxNumber)}`;
  return `From ${formatMoney(minNumber)}`;
}

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isNaN(number) ? 0 : number);
}

function formatDuration(days) {
  const number = Number(days || 0);

  if (!number || number <= 0) return "Flexible";
  if (number === 1) return "1 day";
  return `${number} days`;
}

function formatDate(value) {
  if (!value) return "Flexible";

  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}