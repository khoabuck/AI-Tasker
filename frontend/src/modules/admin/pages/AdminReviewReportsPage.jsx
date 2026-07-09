import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminReviewReportService from "../../../services/adminReviewReport.service";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
];

const EMPTY_RESOLVE_FORM = {
  decision: "",
  adminDecision: "",
};

export default function AdminReviewReportsPage() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolveForm, setResolveForm] = useState(EMPTY_RESOLVE_FORM);
  const [resolveErrors, setResolveErrors] = useState({});

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchText, setSearchText] = useState("");

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [resolving, setResolving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const filteredReports = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return reports.filter((report) => {
      const matchSearch =
        !keyword ||
        String(report.reviewReportId || "").toLowerCase().includes(keyword) ||
        String(report.projectTitle || "").toLowerCase().includes(keyword) ||
        String(report.expertName || "").toLowerCase().includes(keyword) ||
        String(report.clientName || "").toLowerCase().includes(keyword) ||
        String(report.reason || "").toLowerCase().includes(keyword) ||
        String(report.reviewComment || "").toLowerCase().includes(keyword);

      return matchSearch;
    });
  }, [reports, searchText]);

  const stats = useMemo(() => {
    return reports.reduce(
      (result, report) => {
        const status = String(report.status || "").toUpperCase();

        result.total += 1;
        if (status === "OPEN") result.open += 1;
        if (status === "ACCEPTED") result.accepted += 1;
        if (status === "REJECTED") result.rejected += 1;

        return result;
      },
      {
        total: 0,
        open: 0,
        accepted: 0,
        rejected: 0,
      }
    );
  }, [reports]);

  const loadReports = async ({ keepMessage = false } = {}) => {
    try {
      setLoading(true);
      setError("");

      if (!keepMessage) {
        setMessage("");
      }

      const data = await adminReviewReportService.getReports({
        status: statusFilter,
        take: 100,
      });

      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("LOAD REVIEW REPORTS ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load review reports."));
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const openDetailModal = async (report) => {
    const reportId = getReportId(report);

    if (!reportId) {
      setError("Cannot open report detail because report id is missing.");
      return;
    }

    try {
      setDetailLoading(true);
      setError("");
      setSelectedReport(report);

      const detail = await adminReviewReportService.getReportById(reportId);
      setSelectedReport(detail || report);
    } catch (err) {
      console.error("LOAD REVIEW REPORT DETAIL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load review report detail."));
    } finally {
      setDetailLoading(false);
    }
  };

  const openResolveModal = (report, decision = "") => {
    const status = String(report?.status || "").toUpperCase();

    if (status !== "OPEN") {
      setError("Only OPEN review reports can be resolved.");
      return;
    }

    setResolveTarget(report);
    setResolveForm({
      decision,
      adminDecision: "",
    });
    setResolveErrors({});
    setError("");
    setMessage("");
  };

  const closeResolveModal = () => {
    if (resolving) return;

    setResolveTarget(null);
    setResolveForm(EMPTY_RESOLVE_FORM);
    setResolveErrors({});
  };

  const updateResolveField = (name, value) => {
    setResolveForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setResolveErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setError("");
  };

  const validateResolveForm = () => {
    const errors = {};
    const decision = String(resolveForm.decision || "").trim().toUpperCase();
    const adminDecision = String(resolveForm.adminDecision || "").trim();

    if (!["ACCEPT", "REJECT"].includes(decision)) {
      errors.decision = "Please choose Accept or Reject.";
    }

    if (!adminDecision) {
      errors.adminDecision = "Please enter admin decision.";
    } else if (adminDecision.length < 10) {
      errors.adminDecision = "Admin decision must be at least 10 characters.";
    } else if (adminDecision.length > 500) {
      errors.adminDecision = "Admin decision cannot exceed 500 characters.";
    }

    return errors;
  };

  const handleResolveReport = async () => {
    const reportId = getReportId(resolveTarget);

    if (!reportId) {
      setError("Cannot resolve report because report id is missing.");
      return;
    }

    const errors = validateResolveForm();

    if (Object.keys(errors).length > 0) {
      setResolveErrors(errors);
      setError("Please check the highlighted fields before submitting.");
      return;
    }

    try {
      setResolving(true);
      setError("");
      setMessage("");
      setResolveErrors({});

      await adminReviewReportService.resolveReport(reportId, resolveForm);

      closeResolveModal();
      setSelectedReport(null);

      await loadReports({ keepMessage: true });

      const actionText =
        resolveForm.decision === "ACCEPT"
          ? "accepted and the review has been hidden"
          : "rejected and the review remains visible";

      setMessage(`Review report #${reportId} has been ${actionText}.`);
    } catch (err) {
      console.error("RESOLVE REVIEW REPORT ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot resolve review report."));
    } finally {
      setResolving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Review Moderation
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                Review Reports
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
                Review reports submitted by experts. Accepting a report hides
                the review from the expert profile. Rejecting keeps the review
                visible.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadReports()}
              disabled={loading || resolving}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {message && (
            <Alert
              type="success"
              title="Success"
              message={message}
              onClose={() => setMessage("")}
            />
          )}

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
              icon="flag"
              label="Total Reports"
              value={stats.total}
              description="Loaded review reports"
              tone="cyan"
            />

            <StatCard
              icon="pending_actions"
              label="Open"
              value={stats.open}
              description="Waiting admin review"
              tone="yellow"
            />

            <StatCard
              icon="visibility_off"
              label="Accepted"
              value={stats.accepted}
              description="Review hidden"
              tone="green"
            />

            <StatCard
              icon="block"
              label="Rejected"
              value={stats.rejected}
              description="Review remains visible"
              tone="red"
            />
          </section>

          <section className="mb-6 rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_220px_160px]">
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                  Search Report
                </label>

                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-500">
                    search
                  </span>

                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search by project, expert, client, reason, comment, or report id..."
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
                  {filteredReports.length}
                </p>
              </div>
            </div>
          </section>

          {loading ? (
            <LoadingState />
          ) : filteredReports.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {filteredReports.map((report) => (
                <ReportCard
                  key={getReportId(report)}
                  report={report}
                  disabled={resolving}
                  onView={() => openDetailModal(report)}
                  onAccept={() => openResolveModal(report, "ACCEPT")}
                  onReject={() => openResolveModal(report, "REJECT")}
                />
              ))}
            </div>
          )}

          {selectedReport && (
            <ReportDetailModal
              report={selectedReport}
              loading={detailLoading}
              onClose={() => setSelectedReport(null)}
              onAccept={() => {
                const report = selectedReport;
                setSelectedReport(null);
                openResolveModal(report, "ACCEPT");
              }}
              onReject={() => {
                const report = selectedReport;
                setSelectedReport(null);
                openResolveModal(report, "REJECT");
              }}
            />
          )}

          {resolveTarget && (
            <ResolveReportModal
              report={resolveTarget}
              form={resolveForm}
              errors={resolveErrors}
              loading={resolving}
              onClose={closeResolveModal}
              onChange={updateResolveField}
              onConfirm={handleResolveReport}
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function ReportCard({ report, disabled, onView, onAccept, onReject }) {
  const status = String(report.status || "").toUpperCase();
  const canResolve = status === "OPEN";

  return (
    <article className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)] transition hover:border-cyan-400/40">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <Badge label={`Report #${getReportId(report) || "N/A"}`} />
            <Badge label={`Review #${report.reviewId || "N/A"}`} />
            <Badge label={`${report.rating || 0}/5 stars`} tone="yellow" />
          </div>

          <h2 className="text-xl font-bold text-white">
            {report.projectTitle || "Untitled project"}
          </h2>

          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-400 md:grid-cols-2">
            <p>
              Expert:{" "}
              <span className="font-bold text-gray-200">
                {report.expertName || "Expert"}
              </span>
            </p>

            <p>
              Client:{" "}
              <span className="font-bold text-gray-200">
                {report.clientName || "Client"}
              </span>
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-red-300">
              Report Reason
            </p>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-red-100/90">
              {report.reason || "No reason provided."}
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Review Comment
            </p>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-300">
              {report.reviewComment || "No review comment."}
            </p>
          </div>
        </div>

        <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 lg:w-72">
          <p className="mb-3 text-xs uppercase tracking-wider text-gray-500">
            Admin Actions
          </p>

          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={onView}
              className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              Detail
            </button>

            <button
              type="button"
              disabled={disabled || !canResolve}
              onClick={onAccept}
              className="rounded-lg border border-green-400/40 bg-green-400/10 px-4 py-2 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              Accept Report
            </button>

            <button
              type="button"
              disabled={disabled || !canResolve}
              onClick={onReject}
              className="rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reject Report
            </button>
          </div>

          {!canResolve && (
            <p className="mt-3 text-xs leading-5 text-gray-500">
              This report has already been resolved.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function ReportDetailModal({
  report,
  loading,
  onClose,
  onAccept,
  onReject,
}) {
  const status = String(report.status || "").toUpperCase();
  const canResolve = status === "OPEN";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-6xl rounded-3xl border border-white/10 bg-[#151a22] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
              Review Report Detail
            </p>

            <h2 className="text-xl font-bold text-white">
              {report.projectTitle || "Untitled project"}
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Report #{getReportId(report)} · Review #{report.reviewId}
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
          <div className="p-10 text-center text-gray-400">
            Loading detail...
          </div>
        ) : (
          <div className="max-h-[78vh] overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <InfoBox label="Status" value={formatLabel(status)} />
              <InfoBox label="Review Status" value={formatLabel(report.reviewStatus)} />
              <InfoBox label="Rating" value={`${report.rating || 0}/5`} />
              <InfoBox label="Created" value={formatDate(report.createdAt)} />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
              <section className="rounded-xl border border-red-400/20 bg-red-400/10 p-4">
                <h3 className="mb-2 text-sm font-bold text-red-200">
                  Report Reason
                </h3>
                <p className="whitespace-pre-wrap text-sm leading-6 text-red-100/90">
                  {report.reason || "No reason provided."}
                </p>
              </section>

              <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="mb-2 text-sm font-bold text-white">
                  Review Comment
                </h3>
                <p className="whitespace-pre-wrap text-sm leading-6 text-gray-300">
                  {report.reviewComment || "No review comment."}
                </p>
              </section>
            </div>

            <section className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="mb-3 text-sm font-bold text-white">
                Project & Contract
              </h3>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <InfoBox label="Project Status" value={formatLabel(report.projectStatus)} />
                <InfoBox label="Contract Price" value={formatMoney(report.contractFinalPrice)} />
                <InfoBox label="Expert Receivable" value={formatMoney(report.expertReceivableAmount)} />
                <InfoBox label="Project End" value={formatDate(report.projectEndDate)} />
              </div>
            </section>

            <section className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="mb-3 text-sm font-bold text-white">
                Milestones & Deliverables
              </h3>

              {report.milestones?.length > 0 ? (
                <div className="space-y-3">
                  {report.milestones.map((milestone) => (
                    <MilestoneItem
                      key={milestone.milestoneId}
                      milestone={milestone}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No milestones found.</p>
              )}
            </section>

            <section className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="mb-3 text-sm font-bold text-white">
                Related Disputes
              </h3>

              {report.disputes?.length > 0 ? (
                <div className="space-y-3">
                  {report.disputes.map((dispute) => (
                    <DisputeItem key={dispute.disputeId} dispute={dispute} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No disputes found for this project.
                </p>
              )}
            </section>

            {report.adminDecision && (
              <section className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                <h3 className="mb-2 text-sm font-bold text-cyan-200">
                  Admin Decision
                </h3>
                <p className="whitespace-pre-wrap text-sm leading-6 text-cyan-100/90">
                  {report.adminDecision}
                </p>
              </section>
            )}

            {canResolve && (
              <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onReject}
                  className="rounded-xl border border-red-400/40 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black"
                >
                  Reject Report
                </button>

                <button
                  type="button"
                  onClick={onAccept}
                  className="rounded-xl border border-green-400/40 bg-green-400/10 px-5 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black"
                >
                  Accept Report
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ResolveReportModal({
  report,
  form,
  errors,
  loading,
  onClose,
  onChange,
  onConfirm,
}) {
  const isAccept = String(form.decision || "").toUpperCase() === "ACCEPT";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#151a22] shadow-2xl">
        <div className="border-b border-white/10 px-6 py-5">
          <div
            className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border ${
              isAccept
                ? "border-green-400/30 bg-green-400/10 text-green-300"
                : "border-red-400/30 bg-red-400/10 text-red-300"
            }`}
          >
            <span className="material-symbols-outlined text-2xl">
              {isAccept ? "visibility_off" : "visibility"}
            </span>
          </div>

          <h2 className="text-2xl font-black text-white">
            {isAccept ? "Accept Review Report" : "Reject Review Report"}
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-400">
            {isAccept
              ? "Accepting this report will hide the review from the expert profile."
              : "Rejecting this report will keep the review visible."}
          </p>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2">
            <InfoBox label="Project" value={report.projectTitle || "N/A"} />
            <InfoBox label="Expert" value={report.expertName || "Expert"} />
            <InfoBox label="Client" value={report.clientName || "Client"} />
            <InfoBox label="Rating" value={`${report.rating || 0}/5`} />
          </div>

          {errors.decision && (
            <p className="text-sm font-semibold text-red-300">
              {errors.decision}
            </p>
          )}

          <TextArea
            label="Admin Decision"
            value={form.adminDecision}
            error={errors.adminDecision}
            onChange={(value) => onChange("adminDecision", value)}
            placeholder={
              isAccept
                ? "Explain why this report is valid and why the review should be hidden."
                : "Explain why this report is rejected and why the review remains visible."
            }
          />
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`rounded-xl border px-6 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isAccept
                ? "border-green-400/50 bg-green-400/10 text-green-300 hover:bg-green-400 hover:text-black"
                : "border-red-400/50 bg-red-400/10 text-red-300 hover:bg-red-400 hover:text-black"
            }`}
          >
            {loading
              ? "Submitting..."
              : isAccept
              ? "Confirm Accept"
              : "Confirm Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MilestoneItem({ milestone }) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/10 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge label={`Milestone #${milestone.milestoneId || "N/A"}`} />
        <StatusBadge status={milestone.status} />
        {milestone.paymentStatus && (
          <Badge label={`Payment: ${formatLabel(milestone.paymentStatus)}`} />
        )}
      </div>

      <p className="font-bold text-white">
        {milestone.title || "Untitled milestone"}
      </p>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
        <InfoBox label="Amount" value={formatMoney(milestone.amount)} />
        <InfoBox label="Deadline" value={formatDate(milestone.deadline)} />
        <InfoBox label="Deliverables" value={milestone.deliverableCount} />
        <InfoBox label="Approved" value={milestone.approvedDeliverableCount} />
      </div>

      {milestone.deliverables?.length > 0 && (
        <div className="mt-4 space-y-2">
          {milestone.deliverables.map((deliverable) => (
            <div
              key={deliverable.deliverableId}
              className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
            >
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge label={`Deliverable #${deliverable.deliverableId}`} />
                <Badge label={`Version ${deliverable.versionNumber || 0}`} />
                <StatusBadge status={deliverable.status} />
              </div>

              <p className="text-sm leading-6 text-gray-400">
                {deliverable.description || "No description."}
              </p>

              {deliverable.clientFeedback && (
                <p className="mt-2 text-sm leading-6 text-yellow-100/80">
                  Feedback: {deliverable.clientFeedback}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function DisputeItem({ dispute }) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/10 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge label={`Dispute #${dispute.disputeId || "N/A"}`} />
        <StatusBadge status={dispute.status} />
        {dispute.resolutionType && (
          <Badge label={formatLabel(dispute.resolutionType)} />
        )}
      </div>

      <p className="text-sm leading-6 text-gray-400">
        {dispute.reason || "No reason."}
      </p>

      <p className="mt-3 text-sm font-bold text-cyan-300">
        Disputed Amount: {formatMoney(dispute.disputedAmount)}
      </p>

      {dispute.adminDecision && (
        <p className="mt-2 text-sm leading-6 text-gray-300">
          Admin Decision: {dispute.adminDecision}
        </p>
      )}
    </article>
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
    <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
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
    value === "OPEN" || value === "VISIBLE"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : value === "ACCEPTED" || value === "APPROVED" || value === "HIDDEN"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : value === "REJECTED" || value === "CANCELLED" || value === "CANCELED"
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
    tone === "yellow"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : tone === "cyan"
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

function TextArea({ label, value, error, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label} <span className="text-red-400">*</span>
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
            Minimum 10 characters. Maximum 500 characters.
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

function LoadingState() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-12 text-center text-gray-400">
      <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
        hourglass_empty
      </span>
      Loading review reports...
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-12 text-center shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
      <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
        flag
      </span>

      <h2 className="text-xl font-bold text-white">No review reports found</h2>

      <p className="mt-2 text-sm text-gray-400">
        There are no review reports that match your current filter.
      </p>
    </div>
  );
}

function getReportId(report) {
  return (
    report?.reviewReportId ||
    report?.id ||
    report?.ReviewReportId ||
    report?.Id ||
    ""
  );
}

function formatMoney(value) {
  const number = Number(value || 0);

  return `${new Intl.NumberFormat("vi-VN").format(
    Number.isNaN(number) ? 0 : number
  )} VNĐ`;
}

function formatNumber(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("vi-VN").format(
    Number.isNaN(number) ? 0 : number
  );
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
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
    return "Backend blocked this request because the current token does not have ADMIN permission.";
  }

  if (status === 404) {
    return "Review reports API was not found. Please check backend route.";
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