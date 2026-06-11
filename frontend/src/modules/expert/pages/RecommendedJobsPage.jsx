import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import jobService from "../../../services/job.service";

export default function RecommendedJobsPage() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [minMatchScore, setMinMatchScore] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadRecommendedJobs();
  }, []);

  const loadRecommendedJobs = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await jobService.getRecommendedJobs();
      setJobs(data);
    } catch (err) {
      console.error(err);
      setError("Cannot load recommended jobs. Please check backend API.");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const getJobId = (job) => {
    return job.id || job.jobId || job.jobID;
  };

  const getJobTitle = (job) => {
    return job.title || job.jobTitle || job.name || "Untitled Job";
  };

  const getJobDescription = (job) => {
    return job.description || job.jobDescription || job.summary || "";
  };

  const getJobSkills = (job) => {
    if (Array.isArray(job.skills)) return job.skills;
    if (Array.isArray(job.requiredSkills)) return job.requiredSkills;

    if (typeof job.skills === "string") {
      return job.skills
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (typeof job.requiredSkills === "string") {
      return job.requiredSkills
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  };

  const getMatchScore = (job) => {
    return job.matchScore || job.score || job.recommendationScore || 0;
  };

  const getBudgetText = (job) => {
    const min =
      job.budgetMin ||
      job.minBudget ||
      job.expectedBudgetMin ||
      job.projectBudgetMin;

    const max =
      job.budgetMax ||
      job.maxBudget ||
      job.expectedBudgetMax ||
      job.projectBudgetMax;

    if (min && max) return `$${min} - $${max}`;
    if (min) return `From $${min}`;
    if (max) return `Up to $${max}`;

    return "Budget not set";
  };

  const getDurationText = (job) => {
    const duration =
      job.durationDays ||
      job.preferredProjectDurationDays ||
      job.estimatedDurationDays;

    if (!duration) return "Duration not set";

    return `${duration} days`;
  };

  const getReason = (job) => {
    return (
      job.reason ||
      job.recommendationReason ||
      job.matchReason ||
      "This job may match your skills and profile."
    );
  };

  const getStatus = (job) => {
    return job.status || "OPEN";
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

  const filteredJobs = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return jobs.filter((job) => {
      const title = getJobTitle(job).toLowerCase();
      const description = getJobDescription(job).toLowerCase();
      const skills = getJobSkills(job).join(", ").toLowerCase();
      const score = Number(getMatchScore(job));

      const matchSearch =
        !keyword ||
        title.includes(keyword) ||
        description.includes(keyword) ||
        skills.includes(keyword);

      const matchScore =
        minMatchScore === "ALL" || score >= Number(minMatchScore);

      return matchSearch && matchScore;
    });
  }, [jobs, searchText, minMatchScore]);

  const getScoreClass = (score) => {
    const value = Number(score);

    if (value >= 80) {
      return "border-green-400/30 bg-green-400/10 text-green-300";
    }

    if (value >= 50) {
      return "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";
    }

    return "border-gray-400/30 bg-gray-400/10 text-gray-300";
  };

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                AI Recommended Jobs
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                Recommended jobs
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Jobs recommended based on your expert profile, skills,
                portfolio, experience and availability.
              </p>
            </div>

            <button
              type="button"
              onClick={loadRecommendedJobs}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
            >
              Refresh
            </button>
          </div>

          {/* Filters */}
          <div className={`${cardStyle} mb-6 p-6`}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_220px_160px]">
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                  Search Recommended Job
                </label>

                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-500">
                    search
                  </span>

                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search by title, description, or skill..."
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                  Match Score
                </label>

                <select
                  value={minMatchScore}
                  onChange={(event) => setMinMatchScore(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#151a22] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
                >
                  <option value="ALL">All scores</option>
                  <option value="80">80% and above</option>
                  <option value="50">50% and above</option>
                </select>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-center">
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Results
                </p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {filteredJobs.length}
                </p>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className={`${cardStyle} p-12 text-center text-gray-400`}>
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                hourglass_empty
              </span>
              Loading recommended jobs...
            </div>
          )}

          {/* Empty */}
          {!loading && filteredJobs.length === 0 && (
            <div className={`${cardStyle} p-12 text-center`}>
              <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                auto_awesome
              </span>

              <h2 className="text-xl font-bold text-white">
                No recommended jobs found
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                Complete your expert profile or refresh the job list.
              </p>

              <button
                type="button"
                onClick={() => navigate("/expert/profile")}
                className="mt-6 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
              >
                Complete Profile
              </button>
            </div>
          )}

          {/* List */}
          {!loading && filteredJobs.length > 0 && (
            <div className="grid grid-cols-1 gap-5">
              {filteredJobs.map((job) => {
                const jobId = getJobId(job);
                const skills = getJobSkills(job);
                const score = getMatchScore(job);

                return (
                  <article
                    key={jobId}
                    className={`${cardStyle} p-6 transition hover:border-cyan-400/40 hover:shadow-[0_0_35px_rgba(0,240,255,0.08)]`}
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getScoreClass(
                              score
                            )}`}
                          >
                            {score || 0}% Match
                          </span>

                          <span className="rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-300">
                            {getStatus(job)}
                          </span>

                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                            Posted {formatDate(job.createdAt || job.postedAt)}
                          </span>
                        </div>

                        <h2 className="text-xl font-bold text-white">
                          {getJobTitle(job)}
                        </h2>

                        <p className="mt-3 text-sm leading-6 text-gray-400">
                          {getJobDescription(job) ||
                            "No description provided."}
                        </p>

                        <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                          <p className="text-xs uppercase tracking-wider text-cyan-300">
                            Why recommended
                          </p>

                          <p className="mt-2 text-sm leading-6 text-gray-300">
                            {getReason(job)}
                          </p>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {skills.length === 0 && (
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-500">
                              No skills listed
                            </span>
                          )}

                          {skills.map((skill, index) => (
                            <span
                              key={`${skill}-${index}`}
                              className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 lg:w-72">
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs uppercase tracking-wider text-gray-500">
                              Budget
                            </p>
                            <p className="mt-1 text-lg font-bold text-white">
                              {getBudgetText(job)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wider text-gray-500">
                              Duration
                            </p>
                            <p className="mt-1 text-sm font-semibold text-gray-300">
                              {getDurationText(job)}
                            </p>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/expert/jobs/${jobId}`)
                              }
                              className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-cyan-400/50 hover:text-cyan-300"
                            >
                              Detail
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/expert/jobs/${jobId}/proposal`)
                              }
                              className="flex-1 rounded-lg border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                            >
                              Proposal
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ExpertLayout>
  );
}