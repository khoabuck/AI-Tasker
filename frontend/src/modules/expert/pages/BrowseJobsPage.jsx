import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import jobService from "../../../services/job.service";
import { JobDetailModal } from "./JobDetailPage";

const BUDGET_FILTERS = [
  { key: "ALL", label: "Budget" },
  { key: "NEGOTIABLE", label: "Negotiable" },
  { key: "UNDER_100", label: "Under $100" },
  { key: "100_500", label: "$100 - $500" },
  { key: "500_1000", label: "$500 - $1,000" },
  { key: "OVER_1000", label: "Over $1,000" },
];

const DURATION_FILTERS = [
  { key: "ALL", label: "Duration" },
  { key: "FLEXIBLE", label: "Flexible" },
  { key: "SHORT", label: "1 - 7 days" },
  { key: "MEDIUM", label: "8 - 30 days" },
  { key: "LONG", label: "30+ days" },
];

export default function BrowseJobsPage() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [budgetFilter, setBudgetFilter] = useState("ALL");
  const [durationFilter, setDurationFilter] = useState("ALL");
  const [complexityFilter, setComplexityFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("NEWEST");

  const [selectedJobId, setSelectedJobId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadOpenJobs();
  }, []);

  const normalizedJobs = useMemo(() => {
    return jobs.map(normalizeJob).filter((job) => job.id);
  }, [jobs]);

  const categories = useMemo(() => {
    return getUniqueValues(normalizedJobs.map((job) => job.category));
  }, [normalizedJobs]);

  const complexities = useMemo(() => {
    return getUniqueValues(normalizedJobs.map((job) => job.complexity));
  }, [normalizedJobs]);

  const filteredJobs = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    let result = normalizedJobs.filter((job) => {
      const matchKeyword =
        !q ||
        job.title.toLowerCase().includes(q) ||
        job.description.toLowerCase().includes(q) ||
        job.category.toLowerCase().includes(q) ||
        job.skills.join(" ").toLowerCase().includes(q);

      const matchCategory =
        categoryFilter === "ALL" || job.category === categoryFilter;

      const matchBudget = matchesBudget(job, budgetFilter);
      const matchDuration = matchesDuration(job, durationFilter);

      const matchComplexity =
        complexityFilter === "ALL" || job.complexity === complexityFilter;

      return (
        matchKeyword &&
        matchCategory &&
        matchBudget &&
        matchDuration &&
        matchComplexity
      );
    });

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
    normalizedJobs,
    keyword,
    categoryFilter,
    budgetFilter,
    durationFilter,
    complexityFilter,
    sortBy,
  ]);

  const hasActiveFilter =
    keyword ||
    categoryFilter !== "ALL" ||
    budgetFilter !== "ALL" ||
    durationFilter !== "ALL" ||
    complexityFilter !== "ALL" ||
    sortBy !== "NEWEST";

  const loadOpenJobs = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await jobService.getOpenJobs();

      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("LOAD OPEN JOBS ERROR:", err?.response?.data || err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Cannot load open jobs right now."
      );
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setKeyword("");
    setCategoryFilter("ALL");
    setBudgetFilter("ALL");
    setDurationFilter("ALL");
    setComplexityFilter("ALL");
    setSortBy("NEWEST");
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
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="mb-8 overflow-hidden rounded-3xl border border-white/10 bg-[#151a22] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-8">
            <div className="relative">
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />

              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                    Job Marketplace
                  </p>

                  <h1 className="max-w-3xl text-3xl font-extrabold leading-tight text-white md:text-5xl">
                    Find projects that match your expertise
                  </h1>

                  <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-400">
                    Browse open client projects. Cards show a short overview;
                    open details only when you want the full scope.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => navigate("/expert/recommended-jobs")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      auto_awesome
                    </span>
                    AI Matches
                  </button>

                  <button
                    type="button"
                    onClick={loadOpenJobs}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      refresh
                    </span>
                    {loading ? "Loading..." : "Refresh"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard
              icon="work"
              label="Open Jobs"
              value={normalizedJobs.length}
              description="Available projects"
              tone="cyan"
            />

            <StatCard
              icon="filter_alt"
              label="Filtered Results"
              value={filteredJobs.length}
              description="Matching current filters"
              tone="green"
            />

            <StatCard
              icon="category"
              label="Categories"
              value={categories.length}
              description="Project fields"
              tone="purple"
            />
          </section>

          <section className="mb-6 rounded-2xl border border-white/10 bg-[#151a22] p-4">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-extrabold text-white">
                  Find the right project
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Search and filter projects by budget, timeline, category and
                  complexity.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      close
                    </span>
                    Clear
                  </button>
                )}

                <button
                  type="button"
                  onClick={loadOpenJobs}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    refresh
                  </span>
                  Refresh
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1fr]">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-gray-500">
                  search
                </span>

                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Search projects..."
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
                />
              </div>

              <SelectFilter
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={[
                  { key: "ALL", label: "Category" },
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
                value={complexityFilter}
                onChange={setComplexityFilter}
                options={[
                  { key: "ALL", label: "Complexity" },
                  ...complexities.map((item) => ({
                    key: item,
                    label: item,
                  })),
                ]}
              />

              <SelectFilter
                value={sortBy}
                onChange={setSortBy}
                options={[
                  { key: "NEWEST", label: "Newest" },
                  { key: "DEADLINE", label: "Deadline" },
                  { key: "BUDGET_HIGH", label: "Highest $" },
                  { key: "BUDGET_LOW", label: "Lowest $" },
                ]}
              />
            </div>
          </section>

          {loading && (
            <div className="flex min-h-[40vh] items-center justify-center rounded-3xl border border-white/10 bg-[#151a22] text-gray-400">
              Loading jobs...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-5 text-red-300">
              <p className="font-bold">Cannot load jobs</p>
              <p className="mt-1 text-sm">{error}</p>

              <button
                type="button"
                onClick={loadOpenJobs}
                className="mt-5 rounded-xl border border-red-400/40 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && filteredJobs.length === 0 && (
            <EmptyState
              title="No jobs found"
              description="Try changing your filters to see more opportunities."
            />
          )}

          {!loading && !error && filteredJobs.length > 0 && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {filteredJobs.map((job) => (
                <JobCard
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

function JobCard({ job, onViewDetail }) {
  const visibleSkills = job.skills.slice(0, 3);
  const hiddenSkillCount = Math.max(job.skills.length - visibleSkills.length, 0);

  return (
    <article className="group rounded-3xl border border-white/10 bg-[#151a22] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.25)] transition hover:-translate-y-1 hover:border-cyan-400/40 hover:bg-[#171d26]">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge>{job.category || "General"}</Badge>
        <Badge tone="green">{job.status || "Open"}</Badge>
        {job.complexity && <Badge tone="purple">{job.complexity}</Badge>}
      </div>

      <h2 className="line-clamp-2 text-xl font-extrabold leading-snug text-white transition group-hover:text-cyan-200">
        {job.title}
      </h2>

      <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-400">
        {job.description || "No description provided."}
      </p>

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
      job?.category ||
      job?.Category ||
      job?.projectType ||
      job?.ProjectType ||
      "General",
    status: job?.status || job?.Status || "Open",
    complexity: job?.complexity || job?.Complexity || "",
    skills: normalizeSkills(job?.skills || job?.Skills),
    budgetMin: Number(job?.budgetMin ?? job?.BudgetMin ?? 0),
    budgetMax: Number(job?.budgetMax ?? job?.BudgetMax ?? 0),
    durationDays: Number(job?.durationDays ?? job?.DurationDays ?? 0),
    deadline: job?.deadline || job?.Deadline || null,
    createdAt: job?.createdAt || job?.CreatedAt || null,
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

function getUniqueValues(values) {
  return Array.from(
    new Set(values.map((item) => String(item || "").trim()).filter(Boolean))
  );
}

function matchesBudget(job, filter) {
  if (filter === "ALL") return true;

  const min = Number(job.budgetMin || 0);
  const max = Number(job.budgetMax || 0);

  if (filter === "NEGOTIABLE") {
    return !min && !max;
  }

  if (!min && !max) return false;

  const low = min || 0;
  const high = max || min;

  if (filter === "UNDER_100") {
    return rangeOverlaps(low, high, 0, 100);
  }

  if (filter === "100_500") {
    return rangeOverlaps(low, high, 100, 500);
  }

  if (filter === "500_1000") {
    return rangeOverlaps(low, high, 500, 1000);
  }

  if (filter === "OVER_1000") {
    return high >= 1000 || low >= 1000;
  }

  return true;
}

function rangeOverlaps(low, high, filterLow, filterHigh) {
  return low <= filterHigh && high >= filterLow;
}

function matchesDuration(job, filter) {
  if (filter === "ALL") return true;

  const days = Number(job.durationDays || 0);

  if (filter === "FLEXIBLE") return days <= 0;
  if (filter === "SHORT") return days >= 1 && days <= 7;
  if (filter === "MEDIUM") return days >= 8 && days <= 30;
  if (filter === "LONG") return days > 30;

  return true;
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