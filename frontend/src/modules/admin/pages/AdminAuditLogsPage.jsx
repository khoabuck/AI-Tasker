import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminAuditLogService from "../../../services/adminAuditLog.service";

const DEFAULT_FILTERS = {
  adminId: "",
  action: "",
  entityName: "",
  entityId: "",
  from: "",
  to: "",
  pageNumber: 1,
  pageSize: 10,
};

export default function AdminAuditLogsPage() {
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAuditLogs(DEFAULT_FILTERS);
  }, []);

  const summary = useMemo(() => {
    const actions = new Set();
    const entities = new Set();

    logs.forEach((log) => {
      if (log.action) actions.add(log.action);
      if (log.entityName) entities.add(log.entityName);
    });

    return {
      total: pagination.totalCount,
      currentPage: pagination.pageNumber,
      actions: actions.size,
      entities: entities.size,
    };
  }, [logs, pagination]);

  const loadAuditLogs = async (nextFilters = filters) => {
    try {
      setLoading(true);
      setError("");

      const result = await adminAuditLogService.getAuditLogs({
        AdminId: nextFilters.adminId,
        Action: nextFilters.action,
        EntityName: nextFilters.entityName,
        EntityId: nextFilters.entityId,
        From: toDateTimeStart(nextFilters.from),
        To: toDateTimeEnd(nextFilters.to),
        PageNumber: nextFilters.pageNumber,
        PageSize: nextFilters.pageSize,
      });

      setLogs(result.items || []);

      setPagination({
        pageNumber: result.pageNumber || nextFilters.pageNumber || 1,
        pageSize: result.pageSize || nextFilters.pageSize || 10,
        totalCount: result.totalCount || 0,
        totalPages: result.totalPages || 1,
      });
    } catch (err) {
      console.error("LOAD ADMIN AUDIT LOGS ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleApplyFilters = async () => {
    const nextFilters = {
      ...filters,
      pageNumber: 1,
    };

    setFilters(nextFilters);
    await loadAuditLogs(nextFilters);
  };

  const handleResetFilters = async () => {
    setFilters(DEFAULT_FILTERS);
    await loadAuditLogs(DEFAULT_FILTERS);
  };

  const handlePageChange = async (pageNumber) => {
    const nextFilters = {
      ...filters,
      pageNumber,
    };

    setFilters(nextFilters);
    await loadAuditLogs(nextFilters);
  };

  const getAuditLogRouteId = (log) => {
    return (
      log.auditLogId ||
      log.id ||
      log.auditId ||
      log.logId ||
      log.raw?.auditLogId ||
      log.raw?.AuditLogId ||
      log.raw?.auditLogID ||
      log.raw?.AuditLogID ||
      log.raw?.adminAuditLogId ||
      log.raw?.AdminAuditLogId ||
      log.raw?.auditId ||
      log.raw?.AuditId ||
      log.raw?.logId ||
      log.raw?.LogId ||
      log.raw?.id ||
      log.raw?.Id
    );
  };

  const handleViewDetail = (log, index) => {
    const auditLogId = getAuditLogRouteId(log);

    if (auditLogId) {
      navigate(`/admin/audit-logs/${auditLogId}`);
      return;
    }

    const localId = `local-${index}-${Date.now()}`;

    sessionStorage.setItem(`admin-audit-log:${localId}`, JSON.stringify(log));

    navigate(`/admin/audit-logs/${localId}`, {
      state: {
        auditLog: log,
      },
    });
  };

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

  const inputStyle =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]";

  const labelStyle =
    "mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400";

  return (
    <AdminLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Admin Audit
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                Audit logs
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Track admin actions, affected entities, timestamps, and audit
                metadata.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadAuditLogs(filters)}
              disabled={loading}
              className="w-fit rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </section>

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-4">
            <SummaryCard
              icon="receipt_long"
              label="Total Logs"
              value={summary.total}
              tone="cyan"
            />

            <SummaryCard
              icon="dynamic_feed"
              label="Page"
              value={summary.currentPage}
              tone="green"
            />

            <SummaryCard
              icon="bolt"
              label="Actions"
              value={summary.actions}
              tone="yellow"
            />

            <SummaryCard
              icon="database"
              label="Entities"
              value={summary.entities}
              tone="purple"
            />
          </section>

          <section className={`${cardStyle} mb-6 p-6`}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className={labelStyle}>Admin ID</label>

                <input
                  type="number"
                  value={filters.adminId}
                  onChange={(event) =>
                    handleChange("adminId", event.target.value)
                  }
                  placeholder="Example: 1"
                  className={inputStyle}
                />
              </div>

              <div>
                <label className={labelStyle}>Action</label>

                <input
                  type="text"
                  value={filters.action}
                  onChange={(event) =>
                    handleChange("action", event.target.value)
                  }
                  placeholder="Example: UPDATE_JOB_POSTING_AI_POLICY"
                  className={inputStyle}
                />
              </div>

              <div>
                <label className={labelStyle}>Entity Name</label>

                <input
                  type="text"
                  value={filters.entityName}
                  onChange={(event) =>
                    handleChange("entityName", event.target.value)
                  }
                  placeholder="Example: JobPostingAiPolicy"
                  className={inputStyle}
                />
              </div>

              <div>
                <label className={labelStyle}>Entity ID</label>

                <input
                  type="number"
                  value={filters.entityId}
                  onChange={(event) =>
                    handleChange("entityId", event.target.value)
                  }
                  placeholder="Example: 1"
                  className={inputStyle}
                />
              </div>

              <div>
                <label className={labelStyle}>From</label>

                <input
                  type="date"
                  value={filters.from}
                  onChange={(event) => handleChange("from", event.target.value)}
                  className={inputStyle}
                />
              </div>

              <div>
                <label className={labelStyle}>To</label>

                <input
                  type="date"
                  value={filters.to}
                  onChange={(event) => handleChange("to", event.target.value)}
                  className={inputStyle}
                />
              </div>

              <div>
                <label className={labelStyle}>Page Size</label>

                <select
                  value={filters.pageSize}
                  onChange={(event) =>
                    handleChange("pageSize", Number(event.target.value))
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#151a22] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-end gap-3">
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  disabled={loading}
                  className="flex-1 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Apply
                </button>

                <button
                  type="button"
                  onClick={handleResetFilters}
                  disabled={loading}
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reset
                </button>
              </div>
            </div>
          </section>

          <section className={`${cardStyle}`}>
            <div className="flex flex-col gap-3 border-b border-white/10 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Logs</h2>

                <p className="mt-1 text-sm text-gray-500">
                  Showing {logs.length} records on page{" "}
                  {pagination.pageNumber} of {pagination.totalPages}.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-gray-400">
                <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                  hourglass_empty
                </span>
                Loading audit logs...
              </div>
            ) : logs.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="divide-y divide-white/10">
                {logs.map((log, index) => (
                  <AuditLogRow
                    key={
                      log.auditLogId ||
                      log.id ||
                      log.auditId ||
                      log.logId ||
                      `${log.entityName}-${log.entityId}-${log.createdAt}-${index}`
                    }
                    log={log}
                    onViewDetail={() => handleViewDetail(log, index)}
                  />
                ))}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-white/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                Total:{" "}
                <span className="font-bold text-white">
                  {pagination.totalCount}
                </span>
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={loading || pagination.pageNumber <= 1}
                  onClick={() => handlePageChange(pagination.pageNumber - 1)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white">
                  {pagination.pageNumber} / {pagination.totalPages}
                </div>

                <button
                  type="button"
                  disabled={
                    loading || pagination.pageNumber >= pagination.totalPages
                  }
                  onClick={() => handlePageChange(pagination.pageNumber + 1)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}

function AuditLogRow({ log, onViewDetail }) {
  return (
    <article className="p-6 transition hover:bg-white/[0.02]">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_220px_180px] xl:items-center">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <ActionBadge action={log.action} />

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
              Log #{log.auditLogId || log.id || "N/A"}
            </span>

            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
              {log.entityName || "N/A"} #{log.entityId || "N/A"}
            </span>
          </div>

          <h3 className="font-bold text-white">
            {log.action || "UNKNOWN"} on {log.entityName || "N/A"}
          </h3>

          <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-400">
            {log.description ||
              log.reason ||
              "No description was provided for this audit log."}
          </p>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
            <span>Admin ID: {log.adminId || "N/A"}</span>
            {log.adminEmail && <span>• {log.adminEmail}</span>}
            {log.ipAddress && <span>• IP: {log.ipAddress}</span>}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            Created At
          </p>

          <p className="text-sm font-bold text-white">
            {formatDateTime(log.createdAt)}
          </p>
        </div>

        <div className="xl:text-right">
          <button
            type="button"
            onClick={onViewDetail}
            className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
          >
            View Detail
          </button>
        </div>
      </div>
    </article>
  );
}

function SummaryCard({ icon, label, value, tone }) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    green: "border-green-400/20 bg-green-400/10 text-green-300",
    yellow: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
    purple: "border-purple-400/20 bg-purple-400/10 text-purple-300",
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
      <p className="mt-2 text-3xl font-bold text-white">{value ?? 0}</p>
    </div>
  );
}

function ActionBadge({ action }) {
  const normalized = String(action || "").toUpperCase();

  const tone =
    normalized.includes("DELETE") ||
    normalized.includes("REJECT") ||
    normalized.includes("BAN")
      ? "red"
      : normalized.includes("CREATE") ||
        normalized.includes("APPROVE") ||
        normalized.includes("ACTIVATE")
      ? "green"
      : normalized.includes("UPDATE") ||
        normalized.includes("RESOLVE") ||
        normalized.includes("LOCK")
      ? "yellow"
      : "cyan";

  const className = {
    red: "border-red-400/30 bg-red-400/10 text-red-300",
    green: "border-green-400/30 bg-green-400/10 text-green-300",
    yellow: "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
    cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
        className[tone] || className.cyan
      }`}
    >
      {normalized || "UNKNOWN"}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="p-12 text-center">
      <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
        receipt_long
      </span>

      <h3 className="text-lg font-bold text-white">No audit logs found</h3>

      <p className="mt-2 text-sm text-gray-400">
        Try changing filters or date range.
      </p>
    </div>
  );
}

function toDateTimeStart(value) {
  if (!value) return "";

  return `${value}T00:00:00`;
}

function toDateTimeEnd(value) {
  if (!value) return "";

  return `${value}T23:59:59`;
}

function formatDateTime(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getFriendlyError(err) {
  const status = err?.response?.status;

  if (status === 401) {
    return "Your session has expired. Please login again.";
  }

  if (status === 403) {
    return "Backend blocked this request because the current token does not have ADMIN permission.";
  }

  if (status === 404) {
    return "Audit logs API was not found. Please check backend route.";
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

  return err?.message || "Something went wrong. Please try again.";
}