import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import jobService from "../../../services/job.service";

export default function BrowseJobsPage() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function getJobId(job) {
    return job.id || job.jobId || job.jobID;
  }

  function getJobTitle(job) {
    return job.title || job.jobTitle || job.name || "Untitled Job";
  }

  function getJobDescription(job) {
    return job.description || job.jobDescription || job.summary || "";
  }

  function getJobSkills(job) {
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
  }

  function getBudgetText(job) {
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
  }

  function getDurationText(job) {
    const duration =
      job.durationDays ||
      job.preferredProjectDurationDays ||
      job.estimatedDurationDays;

    if (!duration) return "Duration not set";

    return `${duration} days`;
  }

  function getStatus(job) {
    return job.status || "OPEN";
  }

  function formatDate(value) {
    if (!value) return "No date";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "No date";

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  }

  useEffect(() => {
    loadOpenJobs();
  }, []);

  const loadOpenJobs = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await jobService.getOpenJobs();
      setJobs(data);
    } catch (err) {
      console.error(err);
      setError("Cannot load open jobs. Please check backend API.");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) return jobs;

    return jobs.filter((job) => {
      const title = getJobTitle(job).toLowerCase();
      const description = getJobDescription(job).toLowerCase();
      const skills = getJobSkills(job).join(", ").toLowerCase();

      return (
        title.includes(keyword) ||
        description.includes(keyword) ||
        skills.includes(keyword)
      );
    });
  }, [jobs, searchText]);

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Expert Jobs
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                Browse open jobs
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Find AI projects that match your skills and send a proposal to
                the client.
              </p>
            </div>

            <button
              type="button"
              onClick={loadOpenJobs}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
            >
              Refresh Jobs
            </button>
          </div>

          <div className={`${cardStyle} mb-6 p-6`}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_180px]">
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                  Search Job
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

              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-center">
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Open Jobs
                </p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {filteredJobs.length}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {loading && (
            <div className={`${cardStyle} p-12 text-center text-gray-400`}>
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                hourglass_empty
              </span>
              Loading open jobs...
            </div>
          )}

          {!loading && filteredJobs.length === 0 && (
            <div className={`${cardStyle} p-12 text-center`}>
              <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                work_off
              </span>

              <h2 className="text-xl font-bold text-white">
                No open jobs found
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                Try another keyword or refresh the job list.
              </p>
            </div>
          )}

          {!loading && filteredJobs.length > 0 && (
            <div className="grid grid-cols-1 gap-5">
              {filteredJobs.map((job) => {
                const jobId = getJobId(job);
                const skills = getJobSkills(job);

                return (
                  <article
                    key={jobId}
                    className={`${cardStyle} p-6 transition hover:border-cyan-400/40 hover:shadow-[0_0_35px_rgba(0,240,255,0.08)]`}
                  >
                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                      <div className="flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
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

                      <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 md:w-64">
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