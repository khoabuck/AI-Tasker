import { useEffect, useMemo, useState } from "react";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import notificationService from "../../../services/notification.service";

export default function ExpertNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState(null);

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

      setNotifications(data);
    } catch (err) {
      console.error("LOAD NOTIFICATIONS ERROR:", err?.response?.data || err);

      setError(getFriendlyError(err, "Cannot load notifications."));
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    if (!notificationId) return;

    try {
      setMarkingId(notificationId);
      setError("");
      setMessage("");

      await notificationService.markAsRead(notificationId);

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
                {filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.notificationId}
                    notification={notification}
                    marking={markingId === notification.notificationId}
                    onMarkAsRead={handleMarkAsRead}
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

function NotificationItem({ notification, marking, onMarkAsRead }) {
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
              {getNotificationIcon(notification.type)}
            </span>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-white">{notification.title}</h3>

              {!notification.isRead && (
                <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                  New
                </span>
              )}
            </div>

            <p className="text-sm leading-6 text-gray-300">
              {notification.message || "No message content."}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>{formatDateTime(notification.createdAt)}</span>

              {notification.type && (
                <>
                  <span>•</span>
                  <span className="uppercase">{notification.type}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {!notification.isRead && (
          <button
            type="button"
            onClick={() => onMarkAsRead(notification.notificationId)}
            disabled={marking}
            className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {marking ? "Marking..." : "Mark as read"}
          </button>
        )}
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