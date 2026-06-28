import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import notificationService from "../../../services/notification.service";

export default function ExpertNotificationsPage() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const [openingId, setOpeningId] = useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter((item) => !item.isRead).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((item) => !item.isRead);
    }

    if (filter === "read") {
      return notifications.filter((item) => item.isRead);
    }

    return notifications;
  }, [filter, notifications]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await notificationService.getMyNotifications();

      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("LOAD NOTIFICATIONS ERROR:", err?.response?.data || err);

      setError(getFriendlyError(err, "Cannot load notifications."));
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationAsReadLocal = (notificationId) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.notificationId === notificationId
          ? {
              ...item,
              isRead: true,
            }
          : item
      )
    );
  };

  const handleMarkAsRead = async (notificationId) => {
    if (!notificationId) return;

    try {
      setMarkingId(notificationId);
      setError("");
      setMessage("");

      await notificationService.markAsRead(notificationId);

      updateNotificationAsReadLocal(notificationId);
    } catch (err) {
      console.error("MARK NOTIFICATION READ ERROR:", err?.response?.data || err);

      setError(getFriendlyError(err, "Cannot mark notification as read."));
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount <= 0) return;

    try {
      setMarkingAll(true);
      setError("");
      setMessage("");

      await notificationService.markAllAsRead();

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
        }))
      );

      setMessage("All notifications marked as read.");
    } catch (err) {
      console.error("MARK ALL READ ERROR:", err?.response?.data || err);

      setError(getFriendlyError(err, "Cannot mark all notifications as read."));
    } finally {
      setMarkingAll(false);
    }
  };

  const handleOpenNotification = async (notification) => {
    const notificationId = notification.notificationId;
    const action = getNotificationAction(notification);

    try {
      setOpeningId(notificationId || action.targetPath);
      setError("");
      setMessage("");

      if (!notification.isRead && notificationId) {
        await notificationService.markAsRead(notificationId);
        updateNotificationAsReadLocal(notificationId);
      }

      if (action.targetPath) {
        navigate(action.targetPath);
        return;
      }

      setMessage("This notification does not have a related page yet.");
    } catch (err) {
      console.error("OPEN NOTIFICATION ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot open notification."));
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Notifications
              </p>

              <h1 className="text-3xl font-extrabold text-white md:text-4xl">
                Your notifications
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Track updates about proposals, contracts, projects, disputes,
                wallet and system messages.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={markingAll || unreadCount <= 0}
                className="rounded-xl border border-green-400/50 bg-green-400/10 px-5 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {markingAll ? "Marking..." : "Mark all as read"}
              </button>

              <button
                type="button"
                onClick={loadNotifications}
                disabled={loading}
                className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
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

          <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
            <SummaryCard
              label="Total"
              value={notifications.length}
              icon="notifications"
              tone="cyan"
            />

            <SummaryCard
              label="Unread"
              value={unreadCount}
              icon="mark_email_unread"
              tone="yellow"
            />

            <SummaryCard
              label="Read"
              value={notifications.length - unreadCount}
              icon="drafts"
              tone="green"
            />
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#151a22] p-6 md:p-8">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Notification Center
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {filteredNotifications.length} notification(s)
                </p>
              </div>

              <div className="flex rounded-xl border border-white/10 bg-white/[0.04] p-1">
                <FilterButton
                  label="All"
                  active={filter === "all"}
                  onClick={() => setFilter("all")}
                />

                <FilterButton
                  label="Unread"
                  active={filter === "unread"}
                  onClick={() => setFilter("unread")}
                />

                <FilterButton
                  label="Read"
                  active={filter === "read"}
                  onClick={() => setFilter("read")}
                />
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-gray-400">
                Loading notifications...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <EmptyState filter={filter} />
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notification, index) => (
                  <NotificationItem
                    key={notification.notificationId || index}
                    notification={notification}
                    marking={markingId === notification.notificationId}
                    opening={
                      openingId === notification.notificationId ||
                      openingId === getNotificationAction(notification).targetPath
                    }
                    onMarkAsRead={handleMarkAsRead}
                    onOpen={handleOpenNotification}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </ExpertLayout>
  );
}

function SummaryCard({ label, value, icon, tone }) {
  const toneClass =
    tone === "green"
      ? "border-green-400/20 bg-green-400/10 text-green-300"
      : tone === "yellow"
      ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
      : "border-cyan-400/20 bg-cyan-400/10 text-[#00F0FF]";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${toneClass}`}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function FilterButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
        active
          ? "bg-cyan-400 text-black"
          : "text-gray-400 hover:bg-white/[0.05] hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function NotificationItem({
  notification,
  marking,
  opening,
  onMarkAsRead,
  onOpen,
}) {
  const action = getNotificationAction(notification);
  const typeLabel = getNotificationType(notification);

  return (
    <div
      className={`rounded-2xl border p-5 transition ${
        notification.isRead
          ? "border-white/10 bg-white/[0.03]"
          : "border-cyan-400/30 bg-cyan-400/10"
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
              notification.isRead
                ? "border-white/10 bg-white/[0.04] text-gray-400"
                : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
            }`}
          >
            <span className="material-symbols-outlined">
              {getNotificationIcon(typeLabel)}
            </span>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-white">
                {notification.title || "Notification"}
              </h3>

              {!notification.isRead && (
                <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                  New
                </span>
              )}

              {action.badge && (
                <span className="rounded-full border border-green-400/40 bg-green-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-green-300">
                  {action.badge}
                </span>
              )}
            </div>

            <p className="text-sm leading-6 text-gray-300">
              {notification.message || "No message content."}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>{formatDateTime(notification.createdAt)}</span>

              {typeLabel && (
                <>
                  <span>•</span>
                  <span className="uppercase">{typeLabel}</span>
                </>
              )}

              {action.relatedText && (
                <>
                  <span>•</span>
                  <span>{action.relatedText}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col">
          {action.targetPath && (
            <button
              type="button"
              onClick={() => onOpen(notification)}
              disabled={opening}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {opening ? "Opening..." : action.label}
            </button>
          )}

          {!notification.isRead && (
            <button
              type="button"
              onClick={() => onMarkAsRead(notification.notificationId)}
              disabled={marking}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {marking ? "Marking..." : "Mark as read"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ filter }) {
  const text =
    filter === "unread"
      ? "You do not have unread notifications."
      : filter === "read"
      ? "You do not have read notifications."
      : "You do not have any notifications yet.";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
      <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
        notifications_off
      </span>

      <h3 className="font-bold text-white">No notifications</h3>
      <p className="mt-2 text-sm text-gray-500">{text}</p>
    </div>
  );
}

function getNotificationAction(notification) {
  const type = getNotificationType(notification);
  const proposalId = getRelatedProposalId(notification);
  const contractId = getRelatedContractId(notification);
  const jobId = getRelatedJobId(notification);
  const projectId = getRelatedProjectId(notification);
  const disputeId = getRelatedDisputeId(notification);

  if (contractId) {
    return {
      label: "View Contract",
      badge: "Contract",
      targetPath: `/expert/contracts/${contractId}`,
      relatedText: `Contract #${contractId}`,
    };
  }

  if (proposalId && isProposalAcceptedNotification(notification)) {
    return {
      label: "Check Contract",
      badge: "Accepted Proposal",
      targetPath: `/expert/proposals/${proposalId}/contract`,
      relatedText: `Proposal #${proposalId}`,
    };
  }

  if (proposalId) {
    return {
      label: "View Proposal",
      badge: type.includes("PROPOSAL") ? "Proposal" : "",
      targetPath: `/expert/proposals/${proposalId}`,
      relatedText: `Proposal #${proposalId}`,
    };
  }

  if (projectId) {
    return {
      label: "View Project",
      badge: type.includes("PROJECT") ? "Project" : "",
      targetPath: `/expert/projects/${projectId}`,
      relatedText: `Project #${projectId}`,
    };
  }

  if (jobId) {
    return {
      label: "View Job",
      badge: type.includes("JOB") ? "Job" : "",
      targetPath: `/expert/jobs/${jobId}`,
      relatedText: `Job #${jobId}`,
    };
  }

  if (disputeId) {
    return {
      label: "View Dispute",
      badge: type.includes("DISPUTE") ? "Dispute" : "",
      targetPath: `/expert/disputes/${disputeId}`,
      relatedText: `Dispute #${disputeId}`,
    };
  }

  if (type.includes("WALLET") || type.includes("WITHDRAW")) {
    return {
      label: "Open Wallet",
      badge: "Wallet",
      targetPath: "/expert/wallet",
      relatedText: "",
    };
  }

  return {
    label: "Open",
    badge: "",
    targetPath: "",
    relatedText: "",
  };
}

function getNotificationType(notification) {
  return String(
    notification.type ||
      notification.notificationType ||
      notification.category ||
      notification.eventType ||
      ""
  )
    .trim()
    .toUpperCase();
}

function isProposalAcceptedNotification(notification) {
  const type = getNotificationType(notification);
  const text = `${notification.title || ""} ${notification.message || ""}`
    .toUpperCase()
    .trim();

  return (
    type.includes("PROPOSAL_ACCEPTED") ||
    type.includes("ACCEPT_PROPOSAL") ||
    type.includes("PROPOSAL_APPROVED") ||
    type.includes("ACCEPTED_PROPOSAL") ||
    (type.includes("PROPOSAL") && text.includes("ACCEPT")) ||
    (text.includes("PROPOSAL") && text.includes("ACCEPTED"))
  );
}

function getNotificationPayload(notification) {
  const rawPayload =
    notification.data ||
    notification.metadata ||
    notification.payload ||
    notification.extraData ||
    notification.additionalData ||
    {};

  if (!rawPayload) return {};

  if (typeof rawPayload === "object") return rawPayload;

  if (typeof rawPayload === "string") {
    try {
      const parsed = JSON.parse(rawPayload);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  return {};
}

function getRelatedProposalId(notification) {
  const payload = getNotificationPayload(notification);

  if (isEntity(notification, "PROPOSAL")) {
    return getFirstValue(
      notification.proposalId,
      notification.relatedEntityId,
      notification.entityId,
      notification.referenceId,
      notification.targetId,
      payload.proposalId,
      payload.relatedProposalId,
      payload.relatedEntityId,
      payload.entityId,
      payload.referenceId,
      payload.targetId
    );
  }

  return getFirstValue(
    notification.proposalId,
    notification.relatedProposalId,
    notification.relatedProposalID,
    payload.proposalId,
    payload.relatedProposalId,
    payload.relatedProposalID
  );
}

function getRelatedContractId(notification) {
  const payload = getNotificationPayload(notification);

  if (isEntity(notification, "CONTRACT")) {
    return getFirstValue(
      notification.contractId,
      notification.relatedEntityId,
      notification.entityId,
      notification.referenceId,
      notification.targetId,
      payload.contractId,
      payload.relatedContractId,
      payload.relatedEntityId,
      payload.entityId,
      payload.referenceId,
      payload.targetId
    );
  }

  return getFirstValue(
    notification.contractId,
    notification.relatedContractId,
    notification.relatedContractID,
    payload.contractId,
    payload.relatedContractId,
    payload.relatedContractID
  );
}

function getRelatedJobId(notification) {
  const payload = getNotificationPayload(notification);

  if (isEntity(notification, "JOB")) {
    return getFirstValue(
      notification.jobId,
      notification.relatedEntityId,
      notification.entityId,
      notification.referenceId,
      notification.targetId,
      payload.jobId,
      payload.relatedEntityId,
      payload.entityId,
      payload.referenceId,
      payload.targetId
    );
  }

  return getFirstValue(notification.jobId, payload.jobId);
}

function getRelatedProjectId(notification) {
  const payload = getNotificationPayload(notification);

  if (isEntity(notification, "PROJECT")) {
    return getFirstValue(
      notification.projectId,
      notification.relatedEntityId,
      notification.entityId,
      notification.referenceId,
      notification.targetId,
      payload.projectId,
      payload.relatedEntityId,
      payload.entityId,
      payload.referenceId,
      payload.targetId
    );
  }

  return getFirstValue(notification.projectId, payload.projectId);
}

function getRelatedDisputeId(notification) {
  const payload = getNotificationPayload(notification);

  if (isEntity(notification, "DISPUTE")) {
    return getFirstValue(
      notification.disputeId,
      notification.relatedEntityId,
      notification.entityId,
      notification.referenceId,
      notification.targetId,
      payload.disputeId,
      payload.relatedEntityId,
      payload.entityId,
      payload.referenceId,
      payload.targetId
    );
  }

  return getFirstValue(notification.disputeId, payload.disputeId);
}

function isEntity(notification, entityName) {
  const value = String(
    notification.entityName ||
      notification.relatedEntityType ||
      notification.entityType ||
      notification.targetType ||
      getNotificationPayload(notification).entityName ||
      getNotificationPayload(notification).relatedEntityType ||
      ""
  ).toUpperCase();

  return value.includes(entityName);
}

function getFirstValue(...values) {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
}

function getNotificationIcon(type) {
  const value = String(type || "").toUpperCase();

  if (value.includes("PROPOSAL")) return "description";
  if (value.includes("CONTRACT")) return "contract";
  if (value.includes("PROJECT")) return "folder_managed";
  if (value.includes("MILESTONE")) return "flag";
  if (value.includes("DELIVERABLE")) return "inventory_2";
  if (value.includes("DISPUTE")) return "gavel";

  if (value.includes("WALLET") || value.includes("WITHDRAW")) {
    return "account_balance_wallet";
  }

  return "notifications";
}

function formatDateTime(value) {
  if (!value) return "No date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "No date";

  return date.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getFriendlyError(err, fallback) {
  const data = err?.response?.data;

  if (typeof data === "string") return data;

  return data?.message || data?.title || err?.message || fallback;
}