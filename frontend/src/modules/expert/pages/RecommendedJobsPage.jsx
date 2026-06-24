import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import jobService from "../../../services/job.service";

export default function RecommendedJobsPage() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadRecommendedJobs();
  }, []);

  const loadRecommendedJobs = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await jobService.getRecommendedJobs(10);

      setJobs((data || []).filter((job) => job?.id));
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
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                AI Recommended Jobs
              </p>

              <h1 className="text-3xl font-extrabold text-white md:text-4xl">
                Jobs matched to your expert profile
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Backend source: GET /api/recommendations/experts/me/jobs.
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

          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-5 text-red-300">
              <p className="font-bold">Cannot load recommendations</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          )}

          {!error && jobs.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#151a22] px-6 py-14 text-center text-gray-400">
              No recommended jobs found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {jobs.map((job) => (
                <article
                  key={job.id}
                  className="rounded-2xl border border-white/10 bg-[#151a22] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.25)]"
                >
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Badge>{Math.round(job.matchScore || 0)}% match</Badge>
                    <Badge>{job.projectType || job.category || "General"}</Badge>

                    {job.complexity && <Badge>{job.complexity}</Badge>}
                  </div>

                  <h2 className="text-xl font-extrabold text-white">
                    {job.title}
                  </h2>

                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-400">
                    {job.description}
                  </p>

                  {job.matchReason && (
                    <p className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm text-cyan-100">
                      {job.matchReason}
                    </p>
                  )}

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <InfoBox
                      label="Budget"
                      value={formatBudget(job.budgetMin, job.budgetMax)}
                    />

                    <InfoBox label="Deadline" value={formatDate(job.deadline)} />
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/expert/jobs/${job.id}`)}
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

function Badge({ children }) {
  return (
    <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300">
      {children}
    </span>
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