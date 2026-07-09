import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminAuditLogService from "../../../services/adminAuditLog.service";

export default function AdminAuditLogDetailPage() {
  const { auditLogId } = useParams();

  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAuditLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditLogId]);

  const loadAuditLog = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await adminAuditLogService.getAuditLogById(auditLogId);
      setLog(data);
    } catch (err) {
      console.error("LOAD AUDIT LOG DETAIL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
      setLog(null);
    } finally {
      setLoading(false);
    }
  };

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

  return (
    <AdminLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <Link
                to="/admin/audit-logs"
                className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
              >
                <span className="material-symbols-outlined text-base">
                  arrow_back
                </span>
                Back to audit logs
              </Link>

              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Audit Log Detail
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                {log ? formatLabel(log.action) : "Audit Log Detail"}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Review actor, target entity, metadata, before values and after
                values for this system event.
              </p>
            </div>

            <button
              type="button"
              onClick={loadAuditLog}
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

          {/* Loading */}
          {loading && (
            <div className={`${cardStyle} p-12 text-center text-gray-400`}>
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                hourglass_empty
              </span>
              Loading audit log detail...
            </div>
          )}

          {/* Not found */}
          {!loading && !log && (
            <div className={`${cardStyle} p-12 text-center`}>
              <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                history_off
              </span>

              <h2 className="text-xl font-bold text-white">Audit log not found</h2>

              <p className="mt-2 text-sm text-gray-400">
                This audit log does not exist or you do not have permission to
                view it.
              </p>
            </div>
          )}

          {!loading && log && (
            <div className="space-y-6">
              {/* Main summary */}
              <section className={`${cardStyle} p-6`}>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
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

                    <h2 className="text-2xl font-bold text-white">
                      {log.description || `${formatLabel(log.action)} ${formatLabel(log.entityType)}`}
                    </h2>

                    <p className="mt-2 text-sm text-gray-400">
                      Audit Log ID: {log.auditLogId || "N/A"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-4 lg:w-[560px]">
                    <MiniStat label="Action" value={formatLabel(log.action)} />
                    <MiniStat label="Entity" value={formatLabel(log.entityType)} />
                    <MiniStat label="Entity ID" value={log.entityId} />
                    <MiniStat label="Actor ID" value={log.actorUserId} />
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Actor */}
                <section className={`${cardStyle} p-6`}>
                  <SectionTitle icon="person" title="Actor Information" />

                  <div className="grid grid-cols-1 gap-4">
                    <InfoItem label="Actor User ID" value={log.actorUserId} />
                    <InfoItem label="Actor Name" value={log.actorName} />
                    <InfoItem label="Actor Email" value={log.actorEmail} />
                    <InfoItem label="IP Address" value={log.ipAddress} />
                    <InfoItem label="User Agent" value={log.userAgent} />
                  </div>
                </section>

                {/* Target */}
                <section className={`${cardStyle} p-6`}>
                  <SectionTitle icon="adjust" title="Target Entity" />

                  <div className="grid grid-cols-1 gap-4">
                    <InfoItem label="Entity Type" value={formatLabel(log.entityType)} />
                    <InfoItem label="Entity ID" value={log.entityId} />
                    <InfoItem label="Action" value={formatLabel(log.action)} />
                    <InfoItem label="Created At" value={formatDateTime(log.createdAt)} />
                  </div>
                </section>
              </div>

              {/* Old and new values */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className={`${cardStyle} p-6`}>
                  <SectionTitle icon="history" title="Old Values" />

                  <JsonBlock value={log.oldValues} emptyText="No old values were recorded." />
                </section>

                <section className={`${cardStyle} p-6`}>
                  <SectionTitle icon="published_with_changes" title="New Values" />

                  <JsonBlock value={log.newValues} emptyText="No new values were recorded." />
                </section>
              </div>

              {/* Metadata */}
              <section className={`${cardStyle} p-6`}>
                <SectionTitle icon="data_object" title="Metadata" />

                <JsonBlock value={log.metadata} emptyText="No metadata was recorded." />
              </section>

              {/* Raw */}
              <section className={`${cardStyle} p-6`}>
                <details>
                  <summary className="cursor-pointer text-sm font-bold text-gray-300">
                    Raw audit log data
                  </summary>

                  <pre className="mt-4 max-h-[520px] overflow-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs leading-5 text-gray-300">
                    {JSON.stringify(log.raw || log, null, 2)}
                  </pre>
                </details>
              </section>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <h2 className="text-lg font-bold text-white">{title}</h2>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-bold text-white">
        {value || "N/A"}
      </p>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-semibold text-gray-200">
        {value || "N/A"}
      </p>
    </div>
  );
}

function JsonBlock({ value, emptyText }) {
  if (!value || value === "") {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-gray-400">
        {emptyText}
      </div>
    );
  }

  return (
    <pre className="max-h-[420px] overflow-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs leading-5 text-gray-300">
      {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
    </pre>
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
    return "Admin audit log API was not found. Please check backend route.";
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