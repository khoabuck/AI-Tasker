import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import jobService from "../../../services/job.service";

export default function BrowseJobsPage() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    keyword: "",
    category: "all",
    skill: "all",
    budgetPreset: "all",
    minBudget: "",
    maxBudget: "",
    durationPreset: "all",
    deadline: "all",
    sortBy: "newest",
  });

  useEffect(() => {
    loadOpenJobs();
  }, []);

  const loadOpenJobs = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await jobService.getOpenJobs();

      console.log("NORMALIZED JOBS:", data);

      setJobs(data);
    } catch (err) {
      console.error("LOAD OPEN JOBS ERROR:", err?.response?.data || err);
      setError("We could not load open jobs right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (job) => {
    console.log("JOB CLICK:", job);

    if (!job?.id) {
      alert("This job does not have a valid ID. Please check backend response.");
      return;
    }

    navigate(`/expert/jobs/${job.id}`);
  };

  const categoryOptions = useMemo(() => {
    return [
      ...new Set(
        jobs
          .map((job) => job.category)
          .filter(Boolean)
          .map((item) => String(item).trim())
      ),
    ];
  }, [jobs]);

  const skillOptions = useMemo(() => {
    return [
      ...new Set(
        jobs
          .flatMap((job) => job.skills || [])
          .filter(Boolean)
          .map((item) => String(item).trim())
      ),
    ];
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();

    let result = jobs.filter((job) => {
      const title = String(job.title || "").toLowerCase();
      const description = String(job.description || "").toLowerCase();
      const category = String(job.category || "").toLowerCase();
      const skills = (job.skills || []).join(" ").toLowerCase();

      const matchesKeyword =
        !keyword ||
        title.includes(keyword) ||
        description.includes(keyword) ||
        category.includes(keyword) ||
        skills.includes(keyword);

      const matchesCategory =
        filters.category === "all" ||
        String(job.category || "").toLowerCase() ===
          filters.category.toLowerCase();

      const matchesSkill =
        filters.skill === "all" ||
        (job.skills || []).some(
          (skill) => String(skill).toLowerCase() === filters.skill.toLowerCase()
        );

      const budgetMin = Number(job.budgetMin || 0);
      const budgetMax = Number(job.budgetMax || 0);
      const displayBudget = budgetMax || budgetMin;

      let matchesBudgetPreset = true;

      if (filters.budgetPreset === "under-100") {
        matchesBudgetPreset = displayBudget > 0 && displayBudget < 100;
      }

      if (filters.budgetPreset === "100-500") {
        matchesBudgetPreset = displayBudget >= 100 && displayBudget <= 500;
      }

      if (filters.budgetPreset === "500-1000") {
        matchesBudgetPreset = displayBudget > 500 && displayBudget <= 1000;
      }

      if (filters.budgetPreset === "over-1000") {
        matchesBudgetPreset = displayBudget > 1000;
      }

      const minBudget = Number(filters.minBudget || 0);
      const maxBudget = Number(filters.maxBudget || 0);

      const matchesMinBudget = !minBudget || displayBudget >= minBudget;
      const matchesMaxBudget = !maxBudget || displayBudget <= maxBudget;

      const durationDays = Number(job.durationDays || 0);

      let matchesDuration = true;

      if (filters.durationPreset === "short") {
        matchesDuration = durationDays > 0 && durationDays <= 7;
      }

      if (filters.durationPreset === "medium") {
        matchesDuration = durationDays > 7 && durationDays <= 30;
      }

      if (filters.durationPreset === "long") {
        matchesDuration = durationDays > 30;
      }

      const matchesDeadline = checkDeadline(job.deadline, filters.deadline);

      return (
        matchesKeyword &&
        matchesCategory &&
        matchesSkill &&
        matchesBudgetPreset &&
        matchesMinBudget &&
        matchesMaxBudget &&
        matchesDuration &&
        matchesDeadline
      );
    });

    result = sortJobs(result, filters.sortBy);

    return result;
  }, [jobs, filters]);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      keyword: "",
      category: "all",
      skill: "all",
      budgetPreset: "all",
      minBudget: "",
      maxBudget: "",
      durationPreset: "all",
      deadline: "all",
      sortBy: "newest",
    });
  };

  const formatMoney = (value) => {
    const number = Number(value || 0);

    if (!number) return "Negotiable";

    return `$${number.toLocaleString("en-US")}`;
  };

  const formatBudgetRange = (job) => {
    const min = Number(job.budgetMin || 0);
    const max = Number(job.budgetMax || 0);

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

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          <div className="text-center">
            <span className="material-symbols-outlined mb-3 block text-5xl text-[#00F0FF]">
              work
            </span>
            Loading open jobs...
          </div>
        </div>
      </ExpertLayout>
    );
  }

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Manual Job Search
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                Find jobs manually
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Search and filter open jobs by skills, budget, category,
                timeline, and deadline.
              </p>
            </div>

            <button
              type="button"
              onClick={loadOpenJobs}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
            >
              <span className="material-symbols-outlined text-[18px]">
                refresh
              </span>
              Refresh Jobs
            </button>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="mb-6 rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
            <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px_220px]">
              <div className="relative">
                <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-gray-500">
                  search
                </span>

                <input
                  type="text"
                  value={filters.keyword}
                  onChange={(event) =>
                    handleFilterChange("keyword", event.target.value)
                  }
                  placeholder="Search by title, skill, category, or description..."
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
                />
              </div>

              <SelectFilter
                value={filters.category}
                onChange={(value) => handleFilterChange("category", value)}
                options={[
                  { label: "All categories", value: "all" },
                  ...categoryOptions.map((category) => ({
                    label: category,
                    value: category,
                  })),
                ]}
              />

              <SelectFilter
                value={filters.skill}
                onChange={(value) => handleFilterChange("skill", value)}
                options={[
                  { label: "All skills", value: "all" },
                  ...skillOptions.map((skill) => ({
                    label: skill,
                    value: skill,
                  })),
                ]}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SelectFilter
                value={filters.budgetPreset}
                onChange={(value) => handleFilterChange("budgetPreset", value)}
                options={[
                  { label: "All budgets", value: "all" },
                  { label: "Under $100", value: "under-100" },
                  { label: "$100 - $500", value: "100-500" },
                  { label: "$500 - $1000", value: "500-1000" },
                  { label: "Over $1000", value: "over-1000" },
                ]}
              />

              <SelectFilter
                value={filters.durationPreset}
                onChange={(value) =>
                  handleFilterChange("durationPreset", value)
                }
                options={[
                  { label: "All durations", value: "all" },
                  { label: "Short: 1 - 7 days", value: "short" },
                  { label: "Medium: 8 - 30 days", value: "medium" },
                  { label: "Long: 30+ days", value: "long" },
                ]}
              />

              <SelectFilter
                value={filters.deadline}
                onChange={(value) => handleFilterChange("deadline", value)}
                options={[
                  { label: "All deadlines", value: "all" },
                  { label: "Next 7 days", value: "7" },
                  { label: "Next 14 days", value: "14" },
                  { label: "Next 30 days", value: "30" },
                  { label: "No deadline", value: "none" },
                ]}
              />

              <SelectFilter
                value={filters.sortBy}
                onChange={(value) => handleFilterChange("sortBy", value)}
                options={[
                  { label: "Newest first", value: "newest" },
                  { label: "Budget high to low", value: "budget-high" },
                  { label: "Budget low to high", value: "budget-low" },
                  { label: "Shortest duration", value: "duration-short" },
                  { label: "Deadline soon", value: "deadline-soon" },
                ]}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <SmallInput
                value={filters.minBudget}
                onChange={(value) => handleFilterChange("minBudget", value)}
                placeholder="Min budget"
              />

              <SmallInput
                value={filters.maxBudget}
                onChange={(value) => handleFilterChange("maxBudget", value)}
                placeholder="Max budget"
              />
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {filteredJobs.length === 0 ? (
            <EmptyState hasJobs={jobs.length > 0} onClear={clearFilters} />
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {filteredJobs.map((job, index) => (
                <JobCard
                  key={job.id || `${job.title}-${index}`}
                  job={job}
                  formatBudgetRange={formatBudgetRange}
                  formatDate={formatDate}
                  onViewDetail={() => handleViewDetail(job)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ExpertLayout>
  );
}

function checkDeadline(deadline, filter) {
  if (filter === "all") return true;

  if (!deadline) return filter === "none";

  const date = new Date(deadline);

  if (Number.isNaN(date.getTime())) return filter === "none";

  if (filter === "none") return false;

  const days = Number(filter);
  const now = new Date();
  const target = new Date();

  target.setDate(now.getDate() + days);

  return date >= now && date <= target;
}

function sortJobs(jobs, sortBy) {
  const result = [...jobs];

  if (sortBy === "budget-high") {
    return result.sort(
      (a, b) => Number(b.budgetMax || 0) - Number(a.budgetMax || 0)
    );
  }

  if (sortBy === "budget-low") {
    return result.sort(
      (a, b) => Number(a.budgetMax || 0) - Number(b.budgetMax || 0)
    );
  }

  if (sortBy === "duration-short") {
    return result.sort(
      (a, b) => Number(a.durationDays || 9999) - Number(b.durationDays || 9999)
    );
  }

  if (sortBy === "deadline-soon") {
    return result.sort((a, b) => {
      const aTime = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const bTime = b.deadline ? new Date(b.deadline).getTime() : Infinity;

      return aTime - bTime;
    });
  }

  return result.sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

    return bTime - aTime;
  });
}

function SelectFilter({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-xl border border-white/10 bg-[#10151d] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
    >
      {options.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

function SmallInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(event) => {
        const nextValue = event.target.value;

        if (/^\d*$/.test(nextValue)) {
          onChange(nextValue);
        }
      }}
      placeholder={placeholder}
      className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
    />
  );
}

function JobCard({ job, formatBudgetRange, formatDate, onViewDetail }) {
  return (
    <article className="group rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)] transition hover:border-cyan-400/30 hover:bg-[#171e29]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-green-300">
              {job.status || "OPEN"}
            </span>

            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-cyan-300">
              {job.category || "General"}
            </span>
          </div>

          <h2 className="line-clamp-2 text-xl font-extrabold leading-snug text-white">
            {job.title}
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Posted by {job.clientName || "Client"}
          </p>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
          <span className="material-symbols-outlined">work</span>
        </div>
      </div>

      <p className="line-clamp-3 text-sm leading-6 text-gray-400">
        {job.description}
      </p>

      {job.skills.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {job.skills.slice(0, 6).map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-gray-300"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SmallInfo
          icon="payments"
          label="Budget"
          value={formatBudgetRange(job)}
        />

        <SmallInfo
          icon="calendar_month"
          label="Duration"
          value={job.durationDays ? `${job.durationDays} days` : "Flexible"}
        />

        <SmallInfo
          icon="event"
          label="Deadline"
          value={formatDate(job.deadline)}
        />
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onViewDetail}
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
        >
          <span className="material-symbols-outlined text-[18px]">
            visibility
          </span>
          View Detail
        </button>
      </div>
    </article>
  );
}

function SmallInfo({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-1 flex items-center gap-2 text-gray-500">
        <span className="material-symbols-outlined text-[17px]">{icon}</span>
        <span className="text-[11px] font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>

      <p className="text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function EmptyState({ hasJobs, onClear }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 px-6 py-14 text-center shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
      <span className="material-symbols-outlined mb-4 block text-6xl text-gray-600">
        search_off
      </span>

      <h2 className="text-xl font-bold text-white">
        {hasJobs ? "No matching jobs found" : "No open jobs right now"}
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
        {hasJobs
          ? "Try changing your search keyword or filters."
          : "There are no available jobs at the moment. Please check again later."}
      </p>

      {hasJobs && (
        <button
          type="button"
          onClick={onClear}
          className="mt-6 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}