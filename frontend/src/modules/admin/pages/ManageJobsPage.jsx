import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminJobService from "../../../services/adminJob.service";

import { formatDateTime } from "../../../utils/dateTime.utils";
const STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "OPEN", label: "Open" },
  { value: "ACTIVE", label: "Active" },
  { value: "IN_PROGRESS", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CLOSED", label: "Closed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const EMPTY_CANCEL_FORM = {
  reason: "",
};

export default function ManageJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobProposals, setJobProposals] = useState([]);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelForm, setCancelForm] = useState(EMPTY_CANCEL_FORM);
  const [cancelErrors, setCancelErrors] = useState({});

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!message) return;

    const timeoutId = window.setTimeout(() => {
      setMessage("");
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [message]);

  useEffect(() => {
    loadJobs();
  }, []);

  const filteredJobs = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return jobs.filter((job) => {
      const status = String(job.status || "OPEN").toUpperCase();

      const matchStatus =
        statusFilter === "ALL" ||
        status === statusFilter ||
        (statusFilter === "CANCELLED" && status === "CANCELED");

      const matchSearch =
        !keyword ||
        String(job.title || "").toLowerCase().includes(keyword) ||
        String(job.description || "").toLowerCase().includes(keyword) ||
        String(job.clientName || "").toLowerCase().includes(keyword) ||
        String(job.category || "").toLowerCase().includes(keyword);

      return matchStatus && matchSearch;
    });
  }, [jobs, searchText, statusFilter]);

  const stats = useMemo(() => {
    return jobs.reduce(
      (result, job) => {
        const status = String(job.status || "OPEN").toUpperCase();

        result.total += 1;

        if (["DRAFT", "OPEN"].includes(status)) result.open += 1;
        if (["ACTIVE", "IN_PROGRESS", "ONGOING"].includes(status)) {
          result.inProgress += 1;
        }
        if (["COMPLETED", "CLOSED"].includes(status)) result.completed += 1;
        if (["CANCELLED", "CANCELED"].includes(status)) result.cancelled += 1;

        return result;
      },
      {
        total: 0,
        open: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
      }
    );
  }, [jobs]);

  const loadJobs = async ({ keepMessage = false } = {}) => {
    try {
      setLoading(true);
      setError("");

      if (!keepMessage) {
        setMessage("");
      }

      const data = await adminJobService.getAllJobs();
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("LOAD ADMIN JOBS ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load jobs."));
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const openDetailModal = async (job) => {
    const jobId = getJobId(job);

    if (!jobId) {
      setError("Job information is unavailable. Please refresh and try again.");
      return;
    }

    try {
      setDetailLoading(true);
      setProposalLoading(true);
      setError("");
      setSelectedJob(job);
      setJobProposals([]);

      const [detail, proposals] = await Promise.all([
        adminJobService.getJobById(jobId),
        adminJobService.getJobProposals(jobId),
      ]);

      setSelectedJob(detail || job);
      setJobProposals(Array.isArray(proposals) ? proposals : []);
    } catch (err) {
      console.error("LOAD ADMIN JOB DETAIL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load job detail or proposals."));
    } finally {
      setDetailLoading(false);
      setProposalLoading(false);
    }
  };

  const openCancelModal = (job) => {
    const status = String(job?.status || "").toUpperCase();

    if (!["DRAFT", "OPEN"].includes(status)) {
      setError("Only Draft or Open jobs can be cancelled.");
      return;
    }

    setCancelTarget(job);
    setCancelForm(EMPTY_CANCEL_FORM);
    setCancelErrors({});
    setError("");
    setMessage("");
  };

  const closeCancelModal = () => {
    if (cancelling) return;

    setCancelTarget(null);
    setCancelForm(EMPTY_CANCEL_FORM);
    setCancelErrors({});
  };

  const requestCancelJob = () => {
    const jobId = getJobId(cancelTarget);

    if (!jobId) {
      setError("Job information is unavailable. Please refresh and try again.");
      return;
    }

    const reason = cancelForm.reason.trim();
    const errors = {};

    if (!reason) {
      errors.reason = "Please enter a cancellation reason.";
    } else if (reason.length < 10) {
      errors.reason = "Cancellation reason must be at least 10 characters.";
    } else if (reason.length > 500) {
      errors.reason = "Cancellation reason cannot exceed 500 characters.";
    }

    if (Object.keys(errors).length > 0) {
      setCancelErrors(errors);
      setError("Please check the highlighted fields before submitting.");
      return;
    }

    setCancelErrors({});
    setError("");
    setShowCancelConfirm(true);
  };

  const executeCancelJob = async () => {
    const jobId = getJobId(cancelTarget);

    if (!jobId) {
      setError("Job information is unavailable. Please refresh and try again.");
      return;
    }

    const reason = cancelForm.reason.trim();

    try {
      setCancelling(true);
      setError("");
      setMessage("");
      setCancelErrors({});

      await adminJobService.cancelJob(jobId, reason);

      setShowCancelConfirm(false);
      closeCancelModal();
      setSelectedJob(null);
      setJobProposals([]);

      await loadJobs({ keepMessage: true });
      setMessage("The job has been cancelled successfully.");
    } catch (err) {
      console.error("CANCEL JOB ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot cancel job."));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <AdminLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#00F0FF]">
                Jobs
              </p>

              <h1 className="text-3xl font-bold text-white md:text-3xl">
                Job management
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Review job posts, proposals, and moderation actions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadJobs()}
              disabled={loading || cancelling}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {message && <SuccessToast message={message} onClose={() => setMessage("")} />}

          {error && (
            <Alert
              type="danger"
              title="Action failed"
              message={error}
              onClose={() => setError("")}
            />
          )}

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon="work"
              label="Jobs"
              value={stats.total}
              description="All client job posts"
              tone="cyan"
            />

            <StatCard
              icon="campaign"
              label="Available"
              value={stats.open}
              description="Can be cancelled"
              tone="green"
            />

            <StatCard
              icon="pending_actions"
              label="Active"
              value={stats.inProgress}
              description="Active jobs"
              tone="yellow"
            />

            <StatCard
              icon="block"
              label="Cancelled"
              value={stats.cancelled}
              description="Cancelled jobs"
              tone="red"
            />
          </section>

          <section className="mb-6 rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_14px_42px_rgba(0,0,0,0.24)]">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_220px_160px]">
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                  Search
                </label>

                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-500">
                    search
                  </span>

                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search by title, description, client, or category..."
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                  Status
                </label>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#151a22] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
                >
                  {STATUS_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-center">
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Showing
                </p>

                <p className="mt-1 text-2xl font-bold text-white">
                  {filteredJobs.length}
                </p>
              </div>
            </div>
          </section>

          {loading ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151a22]/95">
              <ListSkeleton rows={5} />
            </div>
          ) : filteredJobs.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {filteredJobs.map((job) => (
                <JobCard
                  key={getJobId(job)}
                  job={job}
                  disabled={cancelling}
                  onView={() => openDetailModal(job)}
                  onCancel={() => openCancelModal(job)}
                />
              ))}
            </div>
          )}

          {selectedJob && (
            <JobDetailModal
              job={selectedJob}
              proposals={jobProposals}
              loading={detailLoading}
              proposalLoading={proposalLoading}
              onClose={() => {
                setSelectedJob(null);
                setJobProposals([]);
              }}
              onCancel={() => {
                const job = selectedJob;
                setSelectedJob(null);
                setJobProposals([]);
                openCancelModal(job);
              }}
            />
          )}

          {cancelTarget && (
            <CancelJobModal
              job={cancelTarget}
              form={cancelForm}
              errors={cancelErrors}
              loading={cancelling}
              onClose={closeCancelModal}
              onConfirm={requestCancelJob}
              onChange={(name, value) => {
                setCancelForm((prev) => ({
                  ...prev,
                  [name]: value,
                }));

                setCancelErrors((prev) => ({
                  ...prev,
                  [name]: "",
                }));

                setError("");
              }}
            />
          )}

          {showCancelConfirm && cancelTarget && (
            <CancelJobReviewModal
              job={cancelTarget}
              reason={cancelForm.reason.trim()}
              loading={cancelling}
              onCancel={() => {
                if (!cancelling) {
                  setShowCancelConfirm(false);
                }
              }}
              onConfirm={executeCancelJob}
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function CancelJobReviewModal({
  job,
  reason,
  loading,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center overflow-y-auto bg-black/80 px-4 py-8 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-job-review-title"
        className="w-full max-w-lg rounded-2xl border border-red-400/25 bg-[#151a22] p-5 shadow-[0_32px_110px_rgba(0,0,0,0.75)]"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-red-400/30 bg-red-400/10 text-red-300">
          <span className="material-symbols-outlined">warning</span>
        </div>

        <h2
          id="cancel-job-review-title"
          className="text-xl font-black text-white"
        >
          Confirm cancellation
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-400">
          Review the moderation details below. After confirmation, this job will
          stop accepting new proposals and will leave the normal marketplace
          workflow.
        </p>

        <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <ReviewRow label="Job" value={job?.title || "Untitled Job"} />
          <ReviewRow label="Client" value={job?.clientName || "Client"} />
          <ReviewRow
            label="Current Status"
            value={formatLabel(job?.status || "OPEN")}
          />
          <ReviewRow label="Budget" value={formatBudget(job)} />
          <ReviewRow label="Proposals" value={String(job?.proposalCount || 0)} />
          <ReviewRow label="Admin Reason" value={reason || "N/A"} />
        </div>

        <div className="mt-4 rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm leading-6 text-yellow-100/80">
          Use this action only for invalid content, policy violations, or
          required moderation. Existing proposal records may remain available
          for audit and history.
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="rounded-xl border border-red-400/50 bg-red-400/10 px-5 py-3 text-sm font-black text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Cancelling..." : "Confirm Cancellation"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="grid grid-cols-[125px_minmax(0,1fr)] gap-3 text-sm">
      <span className="font-bold text-gray-500">{label}</span>
      <span className="break-words text-right font-semibold text-white">
        {value || "N/A"}
      </span>
    </div>
  );
}

function SuccessToast({ message, onClose }) {
  return (
    <div className="fixed right-4 top-4 z-[1200] w-[min(92vw,380px)] animate-[fadeIn_.2s_ease-out]">
      <div className="flex items-start gap-3 rounded-2xl border border-green-400/30 bg-[#111a16] p-4 shadow-[0_18px_56px_rgba(0,0,0,0.45)]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-green-400/30 bg-green-400/10 text-green-300">
          <span className="material-symbols-outlined">check_circle</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">Updated</p>
          <p className="mt-1 text-sm leading-5 text-green-100/75">{message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 transition hover:text-white"
          aria-label="Close notification"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
    </div>
  );
}



function ListSkeleton({ rows = 5 }) {
  return (
    <div className="divide-y divide-white/10">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="animate-pulse p-5">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_160px_160px_220px] xl:items-center">
            <div>
              <div className="h-5 w-48 rounded bg-white/10" />
              <div className="mt-3 h-4 w-72 max-w-full rounded bg-white/[0.06]" />
            </div>
            <div className="h-8 w-24 rounded-full bg-white/[0.06]" />
            <div className="h-8 w-24 rounded-full bg-white/[0.06]" />
            <div className="h-10 rounded-xl bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}



function PageSkeleton({ rows = 4 }) {
  return (
    <div className="animate-pulse px-5 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 h-5 w-36 rounded-full bg-white/10" />
        <div className="mb-6 rounded-2xl border border-white/10 bg-[#151a22] p-6 md:p-8">
          <div className="h-4 w-28 rounded bg-cyan-400/10" />
          <div className="mt-4 h-9 w-2/3 rounded bg-white/10" />
          <div className="mt-3 h-4 w-1/2 rounded bg-white/[0.07]" />
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-20 rounded-2xl border border-white/10 bg-white/[0.03]"
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            {Array.from({ length: rows }).map((_, index) => (
              <div
                key={index}
                className="h-32 rounded-2xl border border-white/10 bg-[#151a22]"
              />
            ))}
          </div>
          <div className="h-72 rounded-2xl border border-white/10 bg-[#151a22]" />
        </div>
      </div>
    </div>
  );
}


function JobCard({ job, disabled, onView, onCancel }) {
  const status = String(job.status || "OPEN").toUpperCase();
  const jobId = getJobId(job);
  const canCancel = ["DRAFT", "OPEN"].includes(status);

  return (
    <article className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_14px_42px_rgba(0,0,0,0.24)] transition hover:border-cyan-400/40">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            {job.proposalCount > 0 && (
              <Badge label={`${job.proposalCount} proposals`} tone="cyan" />
            )}
          </div>

          <h2 className="text-xl font-bold text-white">
            {job.title || "Untitled Job"}
          </h2>

          <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-400">
            {job.description || "No description provided."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge label={`Client: ${job.clientName || "Client"}`} />
            <Badge label={`Budget: ${formatBudget(job)}`} />
            {job.category && <Badge label={formatLabel(job.category)} />}
            {job.level && <Badge label={formatLabel(job.level)} />}
          </div>
        </div>

        <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 lg:w-72">
          <p className="mb-3 text-xs uppercase tracking-wider text-gray-500">
            Actions
          </p>

          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={onView}
              className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              View details
            </button>

            <button
              type="button"
              disabled={disabled || !canCancel}
              onClick={onCancel}
              className="rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              title={
                canCancel
                  ? "Cancel this job"
                  : "Only Draft or Open jobs can be cancelled"
              }
            >
              Cancel
            </button>
          </div>

          {!canCancel && (
            <p className="mt-3 text-xs leading-5 text-gray-500">
              Only Draft or Open jobs can be cancelled.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function JobDetailModal({
  job,
  proposals,
  loading,
  proposalLoading,
  onClose,
  onCancel,
}) {
  const status = String(job.status || "OPEN").toUpperCase();
  const canCancel = ["DRAFT", "OPEN"].includes(status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-8">
      <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-[#151a22] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">
              Job details
            </p>

            <h2 className="text-xl font-bold text-white">
              {job.title || "Untitled Job"}
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Client: {job.clientName || "Client"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-gray-300 hover:text-white"
          >
            Close
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading detail...</div>
        ) : (
          <div className="space-y-5 px-6 py-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <InfoBox label="Status" value={formatLabel(status)} />
              <InfoBox label="Budget" value={formatBudget(job)} />
              <InfoBox label="Category" value={formatLabel(job.category)} />
              <InfoBox label="Created" value={formatDateTime(job.createdAt, "N/A")} />
            </div>

            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="mb-2 text-sm font-bold text-white">Description</h3>
              <p className="whitespace-pre-wrap text-sm leading-6 text-gray-400">
                {job.description || "No description provided."}
              </p>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="mb-3 text-sm font-bold text-white">Proposals</h3>

              {proposalLoading ? (
                <p className="text-sm text-gray-400">Loading proposals...</p>
              ) : proposals.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No proposals found for this job.
                </p>
              ) : (
                <div className="space-y-3">
                  {proposals.map((proposal, index) => (
                    <ProposalItem
                      key={proposal.proposalId || proposal.id || index}
                      proposal={proposal}
                    />
                  ))}
                </div>
              )}
            </section>

            <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-gray-500">
                Admin can cancel only Draft or Open jobs. Active jobs are locked
                by project workflow.
              </p>

              {canCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-xl border border-red-400/40 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProposalItem({ proposal }) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/10 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <StatusBadge status={proposal.status || "PENDING"} />
        {proposal.createdAt && (
          <Badge label={`Submitted ${formatDateTime(proposal.createdAt, "N/A")}`} />
        )}
      </div>

      <p className="font-bold text-white">{proposal.expertName || "Expert"}</p>

      <p className="mt-2 text-sm leading-6 text-gray-400">
        {proposal.coverLetter || "No cover letter."}
      </p>

      <p className="mt-3 text-sm font-bold text-cyan-300">
        Proposed Budget: {formatMoney(proposal.proposedBudget)}
      </p>
    </article>
  );
}

function CancelJobModal({
  job,
  form,
  errors = {},
  loading,
  onClose,
  onConfirm,
  onChange,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-red-400/20 bg-[#151a22] shadow-2xl">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-400/30 bg-red-400/10">
            <span className="material-symbols-outlined text-2xl text-red-300">
              block
            </span>
          </div>

          <h2 className="text-xl font-black text-white">Cancel this job?</h2>

          <p className="mt-2 text-sm leading-6 text-gray-400">
            You are about to cancel{" "}
            <span className="font-bold text-white">
              {job.title || "Untitled Job"}
            </span>
            . This action should only be used when the job violates policy,
            contains incorrect information, or needs admin moderation.
          </p>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2">
            <InfoBox label="Job" value={job.title || "Untitled Job"} />
            <InfoBox label="Client" value={job.clientName || "Client"} />
            <InfoBox label="Status" value={formatLabel(job.status)} />
            <InfoBox label="Budget" value={formatBudget(job)} />
          </div>

          <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm leading-6 text-yellow-100/80">
            Please provide a clear reason. This helps the client understand why
            the job was cancelled.
          </div>

          <TextArea
            label="Cancellation Reason"
            required
            value={form.reason}
            error={errors.reason}
            onChange={(value) => onChange("reason", value)}
            placeholder="Example: This job post violates platform policy or contains invalid project information."
          />
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Keep Job
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl border border-red-400/50 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Cancelling..." : "Confirm Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, description, tone = "cyan" }) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    green: "border-green-400/20 bg-green-400/10 text-green-300",
    yellow: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
    red: "border-red-400/20 bg-red-400/10 text-red-300",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_14px_42px_rgba(0,0,0,0.24)]">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${
          toneClass[tone] || toneClass.cyan
        }`}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>

      <p className="mt-2 text-3xl font-bold text-white">
        {formatNumber(value)}
      </p>

      <p className="mt-2 text-sm text-gray-400">{description}</p>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-white">
        {value || "N/A"}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const value = String(status || "OPEN").toUpperCase();

  const className =
    value === "DRAFT"
      ? "border-gray-400/30 bg-gray-400/10 text-gray-300"
      : value === "OPEN"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : value === "ACTIVE" ||
        value === "IN_PROGRESS" ||
        value === "ONGOING" ||
        value === "PENDING"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : value === "COMPLETED" || value === "CLOSED"
      ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
      : value === "CANCELLED" || value === "CANCELED" || value === "REJECTED"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : "border-gray-400/30 bg-gray-400/10 text-gray-300";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${className}`}
    >
      {formatLabel(value)}
    </span>
  );
}

function Badge({ label, tone = "default" }) {
  const className =
    tone === "cyan"
      ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
      : "border-white/10 bg-white/[0.04] text-gray-400";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

function TextArea({ label, value, error, required, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        maxLength={500}
        placeholder={placeholder}
        className={`w-full resize-none rounded-xl border px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-gray-600 ${
          error
            ? "border-red-400/70 bg-red-500/10 focus:border-red-400"
            : "border-white/10 bg-white/[0.04] focus:border-cyan-400/50"
        }`}
      />

      <div className="mt-2 flex items-center justify-between gap-3">
        {error ? (
          <p className="text-sm font-semibold text-red-300">{error}</p>
        ) : (
          <p className="text-xs leading-5 text-gray-500">
            Minimum 10 characters. Be specific and user-friendly.
          </p>
        )}

        <p className="shrink-0 text-xs text-gray-500">
          {String(value || "").length}/500
        </p>
      </div>
    </div>
  );
}

function Alert({ type, title, message, onClose }) {
  const className =
    type === "success"
      ? "border-green-500/30 bg-green-500/10 text-green-200"
      : "border-red-500/30 bg-red-500/10 text-red-200";

  return (
    <div className={`mb-5 rounded-xl border px-5 py-4 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold">{title}</p>
          <p className="mt-1 text-sm opacity-90">{message}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-sm font-bold opacity-70 hover:opacity-100"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-12 text-center shadow-[0_14px_42px_rgba(0,0,0,0.24)]">
      <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
        work_off
      </span>

      <h2 className="text-xl font-bold text-white">No jobs found</h2>

      <p className="mt-2 text-sm text-gray-400">
        There are no jobs that match your filter.
      </p>
    </div>
  );
}

function getJobId(job) {
  return (
    job?.jobPostingId ||
    job?.JobPostingId ||
    job?.jobId ||
    job?.id ||
    job?.jobID ||
    job?.JobId ||
    job?.Id ||
    ""
  );
}

function formatBudget(job) {
  const min = Number(job?.budgetMin || 0);
  const max = Number(job?.budgetMax || 0);
  const budget = Number(job?.budget || 0);

  if (min > 0 && max > 0) return `${formatMoney(min)} - ${formatMoney(max)}`;
  if (min > 0) return `From ${formatMoney(min)}`;
  if (max > 0) return `Up to ${formatMoney(max)}`;
  if (budget > 0) return formatMoney(budget);

  return "Budget not set";
}

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isNaN(number) ? 0 : number);
}

function formatNumber(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("vi-VN").format(
    Number.isNaN(number) ? 0 : number
  );
}

function formatLabel(value) {
  if (!value) return "N/A";

  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getFriendlyError(err, fallback = "Something went wrong.") {
  const status = err?.response?.status;

  if (status === 401) {
    return "Your session has expired. Please login again.";
  }

  if (status === 403) {
    return "You do not have permission to manage jobs.";
  }

  if (status === 404) {
    return "Job management is temporarily unavailable. Please try again later.";
  }

  const data = err?.response?.data;

  if (typeof data === "string") return data;
  if (data?.message) return data.message;
  if (data?.title) return data.title;
  if (data?.detail) return data.detail;

  if (data?.errors) {
    const allErrors = Object.values(data.errors).flat();

    if (allErrors.length > 0) {
      return allErrors.join(" ");
    }
  }

  return err?.message || fallback;
}