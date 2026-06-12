import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import jobService from "../../../services/job.service";

export default function BrowseJobsPage() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadOpenJobs();
  }, []);

  const loadOpenJobs = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await jobService.getOpenJobs();
      const validJobs = data.filter((job) => job?.id);

      setJobs(validJobs);
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

  const filteredJobs = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    if (!q) return jobs;

    return jobs.filter((job) => {
      return (
        String(job.title || "").toLowerCase().includes(q) ||
        String(job.description || "").toLowerCase().includes(q) ||
        String(job.category || "").toLowerCase().includes(q) ||
        String(job.status || "").toLowerCase().includes(q) ||
        (job.skills || []).join(" ").toLowerCase().includes(q)
      );
    });
  }, [jobs, keyword]);

  const handleViewDetail = (job) => {
    if (!job?.id) {
      alert("Job id is missing. Please check backend field JobPostingId.");
      return;
    }

    navigate(`/expert/jobs/${job.id}`);
  };

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Expert Jobs
              </p>

              <h1 className="text-3xl font-extrabold text-white md:text-4xl">
                Browse Open Jobs
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Find open client jobs and view detail before submitting your
                proposal.
              </p>
            </div>

            <button
              type="button"
              onClick={loadOpenJobs}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
            >
              Reload Jobs
            </button>
          </div>

          <div className="mb-6 rounded-2xl border border-white/10 bg-[#151a22] p-4">
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Search by title, skill, category..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-[#00F0FF]"
            />
          </div>

          {loading && (
            <div className="flex min-h-[40vh] items-center justify-center text-gray-400">
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
            <div className="rounded-2xl border border-white/10 bg-[#151a22] px-6 py-12 text-center text-gray-400">
              No open jobs found.
            </div>
          )}

          {!loading && !error && filteredJobs.length > 0 && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {filteredJobs.map((job) => (
                <article
                  key={job.id}
                  className="rounded-2xl border border-white/10 bg-[#151a22] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.25)]"
                >
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Badge>{job.category || "General"}</Badge>
                    <Badge>{job.status || "OPEN"}</Badge>
                    {job.complexity && <Badge>{job.complexity}</Badge>}
                  </div>

                  <h2 className="text-xl font-extrabold text-white">
                    {job.title}
                  </h2>

                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-400">
                    {job.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {job.skills.length > 0 ? (
                      job.skills.slice(0, 6).map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-300"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500">
                        No skills listed
                      </span>
                    )}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <InfoBox
                      label="Budget"
                      value={formatBudget(job.budgetMin, job.budgetMax)}
                    />

                    <InfoBox
                      label="Duration"
                      value={
                        job.durationDays ? `${job.durationDays} days` : "Flexible"
                      }
                    />

                    <InfoBox label="Client" value={job.clientName || "Client"} />

                    <InfoBox label="Posted" value={formatDate(job.createdAt)} />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleViewDetail(job)}
                    className="mt-5 w-full rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                  >
                    View Detail
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </ExpertLayout>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 font-bold text-white">{value || "N/A"}</p>
    </div>
  );
}

function Badge({ children }) {
  return (
    <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300">
      {children}
    </span>
  );
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