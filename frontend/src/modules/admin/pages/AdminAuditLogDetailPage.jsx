import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminAuditLogService from "../../../services/adminAuditLog.service";

export default function AdminAuditLogDetailPage() {
  const { auditLogId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [auditLog, setAuditLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAuditLogDetail();
  }, [auditLogId]);

  const loadAuditLogDetail = async () => {
    if (!auditLogId) {
      setError("Audit log id is missing.");
      setLoading(false);
      return;
    }

    const isLocalDetail = String(auditLogId).startsWith("local-");

    if (isLocalDetail) {
      const stateLog = location.state?.auditLog;

      const storedLogRaw = sessionStorage.getItem(
        `admin-audit-log:${auditLogId}`
      );

      const storedLog = storedLogRaw ? safeJsonParse(storedLogRaw) : null;

      setAuditLog(stateLog || storedLog);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await adminAuditLogService.getAuditLogById(auditLogId);
      setAuditLog(data);
    } catch (err) {
      console.error("LOAD AUDIT LOG DETAIL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
      setAuditLog(null);
    } finally {
      setLoading(false);
    }
  };

  const displayAction = useMemo(() => {
    return toReadableText(auditLog?.action || "Unknown Action");
  }, [auditLog]);

  const displayEntity = useMemo(() => {
    const entityName = auditLog?.entityName || "Unknown Entity";
    const entityId = auditLog?.entityId && auditLog.entityId !== "N/A"
      ? ` #${auditLog.entityId}`
      : "";

    return `${toReadableText(entityName)}${entityId}`;
  }, [auditLog]);

  const changes = useMemo(() => {
    return buildChangeRows(auditLog?.oldValues, auditLog?.newValues);
  }, [auditLog]);

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

  return (
    <AdminLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Audit Log Detail
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                {loading ? "Loading audit log..." : displayAction}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Review what changed, who performed the action, and which record
                was affected.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate("/admin/audit-logs")}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white"
              >
                Back to Logs
              </button>

              <button
                type="button"
                onClick={loadAuditLogDetail}
                disabled={loading}
                className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </section>

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className={`${cardStyle} p-12 text-center text-gray-400`}>
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                hourglass_empty
              </span>
              Loading audit log detail...
            </div>
          ) : !auditLog ? (
            <div className={`${cardStyle} p-12 text-center`}>
              <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                receipt_long
              </span>

              <h2 className="text-xl font-bold text-white">
                Audit log not found
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                This audit log does not exist or cannot be loaded.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <section className={`${cardStyle} overflow-hidden`}>
                <div className="border-b border-white/10 bg-white/[0.02] p-6">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <ActionBadge action={auditLog.action} />

                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
                      {displayEntity}
                    </span>
                  </div>

                  <h2 className="text-2xl font-bold text-white">
                    {displayAction}
                  </h2>

                  <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-400">
                    {auditLog.description ||
                      auditLog.reason ||
                      `An admin performed ${displayAction.toLowerCase()} on ${displayEntity}.`}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-0 md:grid-cols-4">
                  <OverviewItem
                    icon="person"
                    label="Performed By"
                    value={
                      auditLog.adminEmail ||
                      auditLog.adminName ||
                      `Admin #${auditLog.adminId || "N/A"}`
                    }
                  />

                  <OverviewItem
                    icon="database"
                    label="Affected Record"
                    value={displayEntity}
                  />

                  <OverviewItem
                    icon="schedule"
                    label="Time"
                    value={formatDateTime(auditLog.createdAt)}
                  />

                </div>
              </section>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
                <main className="space-y-6">
                  <section className={`${cardStyle} p-6`}>
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-white">
                          Change Summary
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-gray-400">
                          These are the most important values captured before
                          and after the action.
                        </p>
                      </div>
                    </div>

                    {changes.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
                        <span className="material-symbols-outlined mb-3 block text-4xl text-gray-500">
                          difference
                        </span>

                        <h3 className="font-bold text-white">
                          No field-level changes available
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-gray-400">
                          This audit log does not include structured old and new
                          values. Check the action summary or advanced details
                          below.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {changes.map((change) => (
                          <ChangeRow key={change.field} change={change} />
                        ))}
                      </div>
                    )}
                  </section>

                  <section className={`${cardStyle} p-6`}>
                    <h2 className="mb-5 text-xl font-bold text-white">
                      Action Timeline
                    </h2>

                    <div className="space-y-5">
                      <TimelineItem
                        icon="login"
                        title="Admin action recorded"
                        description={
                          auditLog.adminEmail
                            ? `${auditLog.adminEmail} performed this action.`
                            : `Admin #${auditLog.adminId || "N/A"} performed this action.`
                        }
                        time={formatDateTime(auditLog.createdAt)}
                        tone="cyan"
                      />

                      <TimelineItem
                        icon="bolt"
                        title={displayAction}
                        description={`The action affected ${displayEntity}.`}
                        time={auditLog.reason || "No reason was provided."}
                        tone="yellow"
                      />

                      <TimelineItem
                        icon="shield"
                        title="Audit trail saved"
                        description="This record is available for admin review and compliance tracking."
                        time="Saved for admin review"
                        tone="green"
                      />
                    </div>
                  </section>

                  <AdvancedDetails auditLog={auditLog} />
                </main>

                <aside className="space-y-6">
                  <section className={`${cardStyle} p-6`}>
                    <h2 className="mb-5 text-xl font-bold text-white">
                      Record Information
                    </h2>

                    <div className="space-y-4">
                      <DetailItem
                        label="Action"
                        value={toReadableText(auditLog.action || "UNKNOWN")}
                      />

                      <DetailItem
                        label="Entity"
                        value={displayEntity}
                      />

                      <DetailItem
                        label="Created At"
                        value={formatDateTime(auditLog.createdAt)}
                      />
                    </div>
                  </section>

                  <section className={`${cardStyle} p-6`}>
                    <h2 className="mb-5 text-xl font-bold text-white">
                      Admin Information
                    </h2>

                    <div className="space-y-4">
                      <DetailItem label="Name" value={auditLog.adminName} />
                      <DetailItem label="Email" value={auditLog.adminEmail} />
                    </div>
                  </section>

                  <section className={`${cardStyle} p-6`}>
                    <h2 className="mb-5 text-xl font-bold text-white">
                      Reason
                    </h2>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                      <p className="whitespace-pre-wrap text-sm leading-7 text-gray-300">
                        {auditLog.reason || "No reason was provided."}
                      </p>
                    </div>
                  </section>
                </aside>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function OverviewItem({ icon, label, value }) {
  return (
    <div className="border-b border-white/10 p-6 md:border-b-0 md:border-r last:border-r-0">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>

      <p className="mt-2 break-words text-sm font-bold text-white">
        {value || "N/A"}
      </p>
    </div>
  );
}

function ChangeRow({ change }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-400/20 bg-purple-400/10 text-purple-300">
          <span className="material-symbols-outlined text-[20px]">
            edit_note
          </span>
        </div>

        <div>
          <p className="font-bold text-white">{toReadableText(change.field)}</p>
          <p className="text-xs text-gray-500">Updated field</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <ValueBox label="Before" value={change.oldValue} tone="red" />

        <div className="hidden text-center text-gray-500 md:block">
          <span className="material-symbols-outlined">arrow_forward</span>
        </div>

        <ValueBox label="After" value={change.newValue} tone="green" />
      </div>
    </div>
  );
}

function ValueBox({ label, value, tone }) {
  const toneClass =
    tone === "green"
      ? "border-green-400/20 bg-green-400/10 text-green-300"
      : "border-red-400/20 bg-red-400/10 text-red-300";

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d1117]/80 p-4">
      <p className={`mb-2 text-xs font-bold uppercase tracking-wider ${toneClass}`}>
        {label}
      </p>

      <p className="break-words text-sm leading-6 text-gray-200">
        {formatDisplayValue(value)}
      </p>
    </div>
  );
}

function TimelineItem({ icon, title, description, time, tone }) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    yellow: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
    green: "border-green-400/20 bg-green-400/10 text-green-300",
  };

  return (
    <div className="flex gap-4">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
          toneClass[tone] || toneClass.cyan
        }`}
      >
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>

      <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="font-bold text-white">{title}</h3>

        <p className="mt-2 text-sm leading-6 text-gray-400">{description}</p>

        <p className="mt-3 break-words text-xs font-semibold text-gray-500">
          {time || "N/A"}
        </p>
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-bold text-white">
        {value || "N/A"}
      </p>
    </div>
  );
}

function AdvancedDetails({ auditLog }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <div>
          <h2 className="text-xl font-bold text-white">Advanced Details</h2>

          <p className="mt-1 text-sm text-gray-500">
            Technical data for troubleshooting and backend verification.
          </p>
        </div>

        <span className="material-symbols-outlined text-gray-400">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open && (
        <div className="space-y-5 border-t border-white/10 p-6">
          <JsonPanel title="Old Values" value={auditLog.oldValues} />
          <JsonPanel title="New Values" value={auditLog.newValues} />
          <JsonPanel title="Raw Audit Log" value={auditLog.raw || auditLog} />
        </div>
      )}
    </section>
  );
}

function JsonPanel({ title, value }) {
  return (
    <div>
      <h3 className="mb-3 font-bold text-white">{title}</h3>

      <pre className="max-h-[420px] overflow-auto rounded-xl border border-white/10 bg-[#0d1117] p-4 text-xs leading-6 text-gray-300">
        {formatJsonValue(value)}
      </pre>
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
      {toReadableText(normalized)}
    </span>
  );
}

function buildChangeRows(oldValues, newValues) {
  const oldObject = parseValueObject(oldValues);
  const newObject = parseValueObject(newValues);

  if (!oldObject && !newObject) return [];

  const oldData = oldObject || {};
  const newData = newObject || {};

  const fields = Array.from(
    new Set([...Object.keys(oldData), ...Object.keys(newData)])
  );

  return fields
    .filter((field) => {
      const oldValue = oldData[field];
      const newValue = newData[field];

      return JSON.stringify(oldValue) !== JSON.stringify(newValue);
    })
    .map((field) => ({
      field,
      oldValue: oldData[field],
      newValue: newData[field],
    }));
}

function parseValueObject(value) {
  if (!value) return null;

  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") return null;

  try {
    const parsed = JSON.parse(value);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

function formatJsonValue(value) {
  if (value === undefined || value === null || value === "") {
    return "N/A";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  const text = String(value);

  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function formatDisplayValue(value) {
  if (value === undefined || value === null || value === "") {
    return "Empty";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function toReadableText(value) {
  if (!value) return "N/A";

  return String(value)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
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
    return "Audit log detail API was not found. Please check backend route.";
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