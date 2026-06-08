import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminJobService from "../../../services/adminJob.service";

export default function ManageJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await adminJobService.getAllJobs();
      setJobs(data);
    } catch (err) {
      console.error(err);
      setError("Cannot load jobs. Please check backend API.");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const getJobId = (job) => {
    return job.id || job.jobId || job.jobID;
  };

  const getTitle = (job) => {
    return job.title || job.jobTitle || job.name || "Untitled Job";
  };

  const getDescription = (job) => {
    return job.description || job.jobDescription || job.summary || "";
  };

  const getStatus = (job) => {
    return job.status || "OPEN";
  };

  const getClientName = (job) => {
    return (
      job.clientName ||
      job.client?.fullName ||
      job.client?.name ||
      "Client"
    );
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

  const getCreatedAt = (job) => {
    return job.createdAt || job.postedAt || job.createdDate;
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

  const getStatusClass = (status) => {
    const value = String(status).toUpperCase();

    if (value === "OPEN" || value === "ACTIVE") {
      return "border-green-400/30 bg-green-400/10 text-green-300";
    }

    if (value === "PENDING") {
      return "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";
    }

    if (value === "CLOSED" || value === "COMPLETED") {
      return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
    }

    if (value === "REJECTED" || value === "CANCELLED") {
      return "border-red-400/30 bg-red-400/10 text-red-300";
    }

    return "border-gray-400/30 bg-gray-400/10 text-gray-300";
  };

  const filteredJobs = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return jobs.filter((job) => {
      const status = String(getStatus(job)).toUpperCase();
      const title = getTitle(job).toLowerCase();
      const description = getDescription(job).toLowerCase();
      const clientName = getClientName(job).toLowerCase();

      const matchStatus =
        statusFilter === "ALL" || status === statusFilter.toUpperCase();

      const matchSearch =
        !keyword ||
        title.includes(keyword) ||
        description.includes(keyword) ||
        clientName.includes(keyword);

      return matchStatus && matchSearch;
    });
  }, [jobs, searchText, statusFilter]);

  const handleUpdateStatus = async (jobId, status) => {
    const confirmUpdate = window.confirm(
      `Are you sure you want to change this job status to ${status}?`
    );

    if (!confirmUpdate) return;

    try {
      setActionLoadingId(jobId);
      setMessage("");
      setError("");

      await adminJobService.updateJobStatus(jobId, status);

      setMessage("Job status updated successfully.");
      await loadJobs();
    } catch (err) {
      console.error(err);
      setError("Cannot update job status. Please check backend API.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

  const labelStyle =
    "mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400";

  return (
    <AdminLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Admin Jobs
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                Manage jobs
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Review all client jobs, check status, budget, client info, and
                control job visibility.
              </p>
            </div>

            <button
              type="button"
              onClick={loadJobs}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
            >
              Refresh
            </button>
          </div>

          {message && (
            <div className="mb-5 rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-4 text-sm text-green-300">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <section className={`${cardStyle} mb-6 p-6`}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_220px_160px]">
              <div>
                <label className={labelStyle}>Search Job</label>

                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-500">
                    search
                  </span>

                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search by title, description, or client..."
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
                  />
                </div>
              </div>

              <div>
                <label className={labelStyle}>Status</label>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#151a22] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
                >
                  <option value="ALL">All</option>
                  <option value="OPEN">Open</option>
                  <option value="PENDING">Pending</option>
                  <option value="ACTIVE">Active</option>
                  <option value="CLOSED">Closed</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-center">
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Total
                </p>

                <p className="mt-1 text-2xl font-bold text-white">
                  {filteredJobs.length}
                </p>
              </div>
            </div>
          </section>

          {loading && (
            <div className={`${cardStyle} p-12 text-center text-gray-400`}>
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                hourglass_empty
              </span>
              Loading jobs...
            </div>
          )}

          {!loading && filteredJobs.length === 0 && (
            <div className={`${cardStyle} p-12 text-center`}>
              <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                work_off
              </span>

              <h2 className="text-xl font-bold text-white">No jobs found</h2>

              <p className="mt-2 text-sm text-gray-400">
                There are no jobs that match your filter.
              </p>
            </div>
          )}

          {!loading && filteredJobs.length > 0 && (
            <div className="grid grid-cols-1 gap-5">
              {filteredJobs.map((job) => {
                const jobId = getJobId(job);
                const status = getStatus(job);

                return (
                  <article
                    key={jobId}
                    className={`${cardStyle} p-6 transition hover:border-cyan-400/40`}
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getStatusClass(
                              status
                            )}`}
                          >
                            {status}
                          </span>

                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                            Posted {formatDate(getCreatedAt(job))}
                          </span>
                        </div>

                        <h2 className="text-xl font-bold text-white">
                          {getTitle(job)}
                        </h2>

                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-400">
                          {getDescription(job) || "No description provided."}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                            Client: {getClientName(job)}
                          </span>

                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                            Budget: {getBudgetText(job)}
                          </span>
                        </div>
                      </div>

                      <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 lg:w-80">
                        <p className="mb-3 text-xs uppercase tracking-wider text-gray-500">
                          Admin Actions
                        </p>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={actionLoadingId === jobId}
                            onClick={() => handleUpdateStatus(jobId, "OPEN")}
                            className="rounded-lg border border-green-400/40 bg-green-400/10 px-4 py-2 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:opacity-50"
                          >
                            Open
                          </button>

                          <button
                            type="button"
                            disabled={actionLoadingId === jobId}
                            onClick={() => handleUpdateStatus(jobId, "CLOSED")}
                            className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:opacity-50"
                          >
                            Close
                          </button>

                          <button
                            type="button"
                            disabled={actionLoadingId === jobId}
                            onClick={() =>
                              handleUpdateStatus(jobId, "REJECTED")
                            }
                            className="rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:opacity-50"
                          >
                            Reject
                          </button>

                          <button
                            type="button"
                            disabled={actionLoadingId === jobId}
                            onClick={() =>
                              handleUpdateStatus(jobId, "CANCELLED")
                            }
                            className="rounded-lg border border-gray-400/40 bg-gray-400/10 px-4 py-2 text-sm font-bold text-gray-300 transition hover:bg-gray-400 hover:text-black disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>

                        {actionLoadingId === jobId && (
                          <p className="mt-3 text-xs text-gray-500">
                            Updating status...
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}