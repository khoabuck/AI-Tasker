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

  const updateReadState = (notificationId) => {
    setNotifications((prev) =>
      prev.map((item) =>
        String(item.notificationId) === String(notificationId)
          ? {
              ...item,
              isRead: true,
              readAt: item.readAt || new Date().toISOString(),
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
      updateReadState(notificationId);
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
          readAt: item.readAt || new Date().toISOString(),
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
    const notificationId = getNotificationId(notification);
    const target =
      notification.target ||
      notificationService.getNotificationTarget(notification);

    if (!target?.path) {
      setError(
        "This notification does not include enough information to open a page."
      );
      return;
    }

    try {
      setOpeningId(notificationId || target.path);
      setError("");
      setMessage("");

      if (notificationId && !notification.isRead) {
        await notificationService.markAsRead(notificationId);
        updateReadState(notificationId);
      }

      navigate(target.path);
    } catch (err) {
      console.error("OPEN NOTIFICATION ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot open this notification."));
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
                Open updates about proposals, contracts, projects, milestones,
                submissions, wallet, reviews, and messages.
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
            <Alert type="success" message={message} />
          )}

          {error && (
            <Alert type="danger" message={error} />
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
                {filteredNotifications.map((notification, index) => {
                  const notificationId = getNotificationId(notification);
                  const target =
                    notification.target ||
                    notificationService.getNotificationTarget(notification);

                  return (
                    <NotificationItem
                      key={notificationId || index}
                      notification={notification}
                      target={target}
                      marking={String(markingId) === String(notificationId)}
                      opening={
                        String(openingId) === String(notificationId) ||
                        String(openingId) === String(target?.path)
                      }
                      onMarkAsRead={handleMarkAsRead}
                      onOpen={() => handleOpenNotification(notification)}
                    />
                  );
                })}
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
  target,
  marking,
  opening,
  onMarkAsRead,
  onOpen,
}) {
  const unread = !notification.isRead;
  const notificationId = getNotificationId(notification);
  const type = String(notification.type || "GENERAL").toUpperCase();
  const tone = getNotificationTone(type, target?.kind);

  return (
    <article
      className={`rounded-2xl border p-5 transition ${
        unread
          ? "border-cyan-400/40 bg-cyan-400/[0.06]"
          : "border-white/10 bg-white/[0.03]"
      } ${target?.path ? "cursor-pointer hover:border-cyan-400/50" : ""}`}
      onClick={() => {
        if (target?.path && !opening) {
          onOpen();
        }
      }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${tone.className}`}
          >
            <span className="material-symbols-outlined">{tone.icon}</span>
          </div>

          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold uppercase tracking-wider text-gray-400">
                {tone.label}
              </span>

              {unread && (
                <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
                  New
                </span>
              )}

              <span className="text-xs text-gray-500">
                {formatDate(notification.createdAt || notification.createdAtUtc)}
              </span>
            </div>

            <h3 className="text-base font-bold text-white">
              {notification.title || "Notification"}
            </h3>

            <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-400">
              {notification.message || notification.content || "No message."}
            </p>

            {target?.path ? (
              <p className="mt-3 text-xs font-bold text-cyan-300">
                Click to open: {target.label}
              </p>
            ) : (
              <p className="mt-3 text-xs font-bold text-gray-500">
                No linked page available
              </p>
            )}
          </div>
        </div>

        <div
          className="flex shrink-0 flex-wrap gap-2 md:justify-end"
          onClick={(event) => event.stopPropagation()}
        >
          {!notification.isRead && (
            <button
              type="button"
              onClick={() => onMarkAsRead(notificationId)}
              disabled={marking}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {marking ? "Marking..." : "Mark read"}
            </button>
          )}

          <button
            type="button"
            onClick={onOpen}
            disabled={!target?.path || opening}
            className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {opening ? "Opening..." : target?.label || "Open"}
          </button>
        </div>
      </div>
    </article>
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

      <h3 className="text-lg font-bold text-white">No notifications</h3>

      <p className="mt-2 text-sm text-gray-400">{text}</p>
    </div>
  );
}

function Alert({ type, message }) {
  const style =
    type === "success"
      ? "border-green-500/30 bg-green-500/10 text-green-300"
      : "border-red-500/30 bg-red-500/10 text-red-300";

  return (
    <div className={`mb-5 rounded-xl border px-5 py-4 text-sm ${style}`}>
      {message}
    </div>
  );
}

function getNotificationId(notification) {
  return (
    notification?.notificationId ||
    notification?.NotificationId ||
    notification?.id ||
    notification?.Id ||
    notification?.raw?.notificationId ||
    notification?.raw?.NotificationId ||
    notification?.raw?.id ||
    notification?.raw?.Id ||
    ""
  );
}

function getNotificationTone(type, kind) {
  const value = String(type || "").toUpperCase();
  const targetKind = String(kind || "").toUpperCase();

  if (value.includes("PROPOSAL") || targetKind === "PROPOSAL") {
    return {
      label: "Proposal",
      icon: "description",
      className: "border-purple-400/20 bg-purple-400/10 text-purple-300",
    };
  }

  if (value.includes("CONTRACT") || targetKind === "CONTRACT") {
    return {
      label: "Agreement",
      icon: "contract",
      className: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    };
  }

  if (value.includes("PROJECT") || targetKind === "PROJECT") {
    return {
      label: "Project",
      icon: "work",
      className: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    };
  }

  if (value.includes("MILESTONE") || targetKind === "MILESTONE") {
    return {
      label: "Milestone",
      icon: "flag",
      className: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
    };
  }

  if (
    value.includes("DELIVERABLE") ||
    value.includes("SUBMISSION") ||
    value.includes("REVISION") ||
    targetKind === "SUBMISSION"
  ) {
    return {
      label: value.includes("REVISION") ? "Changes Requested" : "Submission",
      icon: value.includes("REVISION") ? "edit_note" : "assignment",
      className: value.includes("REVISION")
        ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
        : "border-green-400/20 bg-green-400/10 text-green-300",
    };
  }

  if (value.includes("CHAT") || value.includes("MESSAGE") || targetKind === "MESSAGE") {
    return {
      label: "Message",
      icon: "chat",
      className: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    };
  }

  if (value.includes("ESCROW") || value.includes("WALLET") || value.includes("PAYMENT")) {
    return {
      label: "Wallet",
      icon: "account_balance_wallet",
      className: "border-green-400/20 bg-green-400/10 text-green-300",
    };
  }

  if (value.includes("REVIEW") || targetKind === "REVIEW") {
    return {
      label: "Review",
      icon: "star",
      className: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
    };
  }

  if (value.includes("DISPUTE") || targetKind === "DISPUTE") {
    return {
      label: "Dispute",
      icon: "gavel",
      className: "border-red-400/20 bg-red-400/10 text-red-300",
    };
  }

  return {
    label: "Notification",
    icon: "notifications",
    className: "border-white/10 bg-white/[0.04] text-gray-300",
  };
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString();
}

function getFriendlyError(err, fallback) {
  const data = err?.response?.data;

  if (typeof data === "string") return data;

  return data?.message || data?.title || err?.message || fallback;
}