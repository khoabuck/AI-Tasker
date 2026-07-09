import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminAuditLogService from "../../../services/adminAuditLog.service";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);

  const [searchText, setSearchText] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await adminAuditLogService.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error("LOAD AUDIT LOGS ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const actionOptions = useMemo(() => {
    const values = logs
      .map((log) => log.action)
      .filter(Boolean)
      .map((value) => String(value).toUpperCase());

    return ["ALL", ...Array.from(new Set(values))];
  }, [logs]);

  const entityOptions = useMemo(() => {
    const values = logs
      .map((log) => log.entityType)
      .filter(Boolean)
      .map((value) => String(value).toUpperCase());

    return ["ALL", ...Array.from(new Set(values))];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return logs.filter((log) => {
      const action = String(log.action || "").toUpperCase();
      const entityType = String(log.entityType || "").toUpperCase();

      const text = [
        log.auditLogId,
        log.action,
        log.entityType,
        log.entityId,
        log.actorName,
        log.actorEmail,
        log.description,
        log.ipAddress,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchSearch = !keyword || text.includes(keyword);
      const matchAction = actionFilter === "ALL" || action === actionFilter;
      const matchEntity = entityFilter === "ALL" || entityType === entityFilter;

      return matchSearch && matchAction && matchEntity;
    });
  }, [logs, searchText, actionFilter, entityFilter]);

  const summary = useMemo(() => {
    const actorCount = new Set(
      logs.map((log) => log.actorUserId || log.actorEmail).filter(Boolean)
    ).size;

    const entityCount = new Set(
      logs.map((log) => log.entityType).filter(Boolean)
    ).size;

    return {
      total: logs.length,
      actors: actorCount,
      entities: entityCount,
      filtered: filteredLogs.length,
    };
  }, [logs, filteredLogs]);

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

  const labelStyle =
    "mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400";

  return (
    <AdminLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Admin Audit Logs
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                System activity logs
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Track important administrative actions, actor information,
                affected entities and audit metadata.
              </p>
            </div>

            <button
              type="button"
              onClick={loadAuditLogs}
              disabled={loading}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Summary */}
          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <SummaryCard label="Total Logs" value={summary.total} icon="history" />
            <SummaryCard label="Actors" value={summary.actors} icon="person" tone="green" />
            <SummaryCard label="Entity Types" value={summary.entities} icon="category" tone="yellow" />
            <SummaryCard label="Showing" value={summary.filtered} icon="filter_alt" tone="cyan" />
          </section>

          {/* Filters */}
          <section className={`${cardStyle} mb-6 p-6`}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_220px_220px_150px]">
              <div>
                <label className={labelStyle}>Search Logs</label>

                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-500">
                    search
                  </span>

                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search action, actor, entity, description..."
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
                  />
                </div>
              </div>

              <div>
                <label className={labelStyle}>Action</label>

                <select
                  value={actionFilter}
                  onChange={(event) => setActionFilter(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#151a22] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
                >
                  {actionOptions.map((action) => (
                    <option key={action} value={action}>
                      {formatLabel(action)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelStyle}>Entity</label>

                <select
                  value={entityFilter}
                  onChange={(event) => setEntityFilter(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#151a22] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
                >
                  {entityOptions.map((entity) => (
                    <option key={entity} value={entity}>
                      {formatLabel(entity)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-center">
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Results
                </p>

                <p className="mt-1 text-2xl font-bold text-white">
                  {filteredLogs.length}
                </p>
              </div>
            </div>
          </section>

          {/* Loading */}
          {loading && (
            <div className={`${cardStyle} p-12 text-center text-gray-400`}>
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                hourglass_empty
              </span>
              Loading audit logs...
            </div>
          )}

          {/* Empty */}
          {!loading && filteredLogs.length === 0 && (
            <div className={`${cardStyle} p-12 text-center`}>
              <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                history
              </span>

              <h2 className="text-xl font-bold text-white">No audit logs found</h2>

              <p className="mt-2 text-sm text-gray-400">
                There are no logs matching your current filters.
              </p>
            </div>
          )}

          {/* Logs */}
          {!loading && filteredLogs.length > 0 && (
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <article
                  key={log.auditLogId}
                  className={`${cardStyle} p-6 transition hover:border-cyan-400/40`}
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getActionClass(
                            log.action
                          )}`}
                        >
                          {formatLabel(log.action)}
                        </span>

                        <span className="rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-purple-300">
                          {formatLabel(log.entityType)}
                        </span>

                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                          {formatDateTime(log.createdAt)}
                        </span>
                      </div>

                      <h2 className="text-xl font-bold text-white">
                        {log.description || `${formatLabel(log.action)} ${formatLabel(log.entityType)}`}
                      </h2>

                      <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
                        <InfoBox label="Log ID" value={log.auditLogId} />
                        <InfoBox label="Entity ID" value={log.entityId} />
                        <InfoBox label="Actor" value={log.actorName} />
                        <InfoBox label="Actor Email" value={log.actorEmail} />
                      </div>
                    </div>

                    <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 lg:w-72">
                      <p className="mb-3 text-xs uppercase tracking-wider text-gray-500">
                        More Info
                      </p>

                      <div className="space-y-3 text-sm">
                        <InfoBox label="IP Address" value={log.ipAddress} />
                        <InfoBox label="Actor ID" value={log.actorUserId} />
                      </div>

                      <Link
                        to={`/admin/audit-logs/${log.auditLogId}`}
                        className="mt-4 block rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-center text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                      >
                        View Detail
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ label, value, icon, tone = "cyan" }) {
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
      <p className="mt-2 text-3xl font-bold text-white">{value ?? 0}</p>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 break-words font-semibold text-gray-200">
        {value || "N/A"}
      </p>
    </div>
  );
}

function getActionClass(action) {
  const value = String(action || "").toUpperCase();

  if (value.includes("CREATE") || value.includes("ADD") || value.includes("APPROVE")) {
    return "border-green-400/30 bg-green-400/10 text-green-300";
  }

  if (value.includes("UPDATE") || value.includes("EDIT") || value.includes("CHANGE")) {
    return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
  }

  if (value.includes("DELETE") || value.includes("BAN") || value.includes("REJECT")) {
    return "border-red-400/30 bg-red-400/10 text-red-300";
  }

  if (value.includes("LOCK") || value.includes("SUSPEND") || value.includes("RESOLVE")) {
    return "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";
  }

  return "border-gray-400/30 bg-gray-400/10 text-gray-300";
}

function formatLabel(value) {
  if (!value) return "N/A";

  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
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
    return "Admin audit logs API was not found. Please check backend route.";
  }

  const data = err?.response?.data;

  if (typeof data === "string") return data;
  if (data?.message) return data.message;
  if (data?.title) return data.title;

  if (data?.errors) {
    const allErrors = Object.values(data.errors).flat();

    if (allErrors.length > 0) {
      return allErrors.join(" ");
    }
  }

  return err?.message || "Something went wrong. Please try again.";
}