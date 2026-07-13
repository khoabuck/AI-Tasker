import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import notificationService from "../../../services/notification.service";

const PAGE_SIZE = 10;

export default function ExpertNotificationsPage() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const [openingId, setOpeningId] = useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!message) return;

    const timeoutId = window.setTimeout(() => {
      setMessage("");
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [message]);

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

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

  const totalPages = Math.max(
    1,
    Math.ceil(filteredNotifications.length / PAGE_SIZE)
  );

  const safePage = Math.min(currentPage, totalPages);

  const paginatedNotifications = useMemo(() => {
    const startIndex = (safePage - 1) * PAGE_SIZE;
    return filteredNotifications.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredNotifications, safePage]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await notificationService.getMyNotifications();

      setNotifications(Array.isArray(data) ? data : []);
      setCurrentPage(1);
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
        String(getNotificationId(item)) === String(notificationId)
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

    try {
      setOpeningId(notificationId || target?.path || "/expert/notifications");
      setError("");
      setMessage("");

      if (notificationId && !notification.isRead) {
        await notificationService.markAsRead(notificationId);
        updateReadState(notificationId);
      }

      navigate(target?.path || "/expert/notifications");
    } catch (err) {
      console.error("OPEN NOTIFICATION ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot open this notification."));
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <ExpertLayout>
      <div className="px-5 py-6 md:px-7">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#00F0FF]">
                Notifications
              </p>

              <h1 className="text-2xl font-bold text-white md:text-3xl">
                Notifications
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                Stay updated on work, payments, reviews, and messages.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={markingAll || unreadCount <= 0}
                className="rounded-xl border border-green-400/50 bg-green-400/10 px-4 py-2.5 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {markingAll ? "Marking..." : "Mark all read"}
              </button>

              <button
                type="button"
                onClick={loadNotifications}
                disabled={loading}
                className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2.5 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {message && <SuccessToast message={message} onClose={() => setMessage("")} />}
          {error && <Alert type="danger" message={error} />}

          <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
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

          <section className="rounded-2xl border border-white/10 bg-[#151a22] p-5 md:p-6">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Updates
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Showing{" "}
                  {filteredNotifications.length === 0
                    ? 0
                    : (safePage - 1) * PAGE_SIZE + 1}
                  -
                  {Math.min(
                    safePage * PAGE_SIZE,
                    filteredNotifications.length
                  )}{" "}
                  of {filteredNotifications.length} items
                </p>
              </div>

              <div className="flex w-fit rounded-xl border border-white/10 bg-white/[0.04] p-1">
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
              <ListSkeleton rows={6} />
            ) : filteredNotifications.length === 0 ? (
              <EmptyState filter={filter} />
            ) : (
              <>
                <div className="space-y-3">
                  {paginatedNotifications.map((notification, index) => {
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

                {totalPages > 1 && (
                  <Pagination
                    currentPage={safePage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </ExpertLayout>
  );
}


function ListSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-white/10 bg-[#151a22] p-5"
        >
          <div className="flex gap-4">
            <div className="h-11 w-11 shrink-0 rounded-xl bg-white/10" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-1/3 rounded bg-white/10" />
              <div className="mt-3 h-4 w-4/5 rounded bg-white/[0.06]" />
              <div className="mt-2 h-4 w-2/3 rounded bg-white/[0.05]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}



function SuccessToast({ message, onClose }) {
  return (
    <div className="fixed right-4 top-4 z-[1400] w-[min(92vw,390px)]">
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


function SummaryCard({ label, value, icon, tone }) {
  const toneClass =
    tone === "green"
      ? "border-green-400/20 bg-green-400/10 text-green-300"
      : tone === "yellow"
      ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
      : "border-cyan-400/20 bg-cyan-400/10 text-[#00F0FF]";

  return (
    <div className="rounded-xl border border-white/10 bg-[#151a22] p-5 shadow-[0_12px_35px_rgba(0,0,0,0.22)]">
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl border ${toneClass}`}
      >
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>

      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function FilterButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition ${
        active
          ? "bg-cyan-400 text-black"
          : "text-gray-400 hover:bg-white/[0.05] hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  const pages = getVisiblePages(currentPage, totalPages);

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 md:flex-row md:items-center md:justify-between">
      <p className="text-xs text-gray-500">
        Page {currentPage} of {totalPages}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-xs font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Prev
        </button>

        {pages.map((page, index) =>
          page === "..." ? (
            <span
              key={`dots-${index}`}
              className="px-1.5 text-sm font-bold text-gray-500"
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={`h-8 min-w-8 rounded-lg border px-2.5 text-xs font-black transition ${
                currentPage === page
                  ? "border-cyan-400 bg-cyan-400 text-black"
                  : "border-white/10 bg-white/[0.04] text-gray-300 hover:border-cyan-400/50 hover:text-cyan-300"
              }`}
            >
              {page}
            </button>
          )
        )}

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-xs font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
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
      className={`rounded-xl border p-4 transition ${
        unread
          ? "border-cyan-400/40 bg-cyan-400/[0.06]"
          : "border-white/10 bg-white/[0.03]"
      } cursor-pointer hover:border-cyan-400/50 hover:bg-white/[0.04]`}
      onClick={() => {
        if (!opening) {
          onOpen();
        }
      }}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${tone.className}`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {tone.icon}
            </span>
          </div>

          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                {tone.label}
              </span>

              {unread && (
                <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-bold text-cyan-300">
                  New
                </span>
              )}

              <span className="text-xs text-gray-500">
                {notificationService.formatNotificationTime(
                  notification.createdAt,
                  { full: true }
                )}
              </span>
            </div>

            <h3 className="text-[15px] font-bold text-white">
              {notification.title || "Notification"}
            </h3>

            <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-gray-400">
              {notification.message || notification.content || "No message."}
            </p>

            <p className="mt-2 text-xs font-bold text-cyan-300">
              {target?.label || "Open"}
            </p>
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
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-bold text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {marking ? "Marking..." : "Mark read"}
            </button>
          )}

          <button
            type="button"
            onClick={onOpen}
            disabled={opening}
            className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-3.5 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
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
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
      <span className="material-symbols-outlined mb-3 block text-3xl text-gray-500">
        notifications_off
      </span>

      <h3 className="text-base font-bold text-white">No notifications</h3>

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
    <div className={`mb-5 rounded-xl border px-4 py-3 text-sm ${style}`}>
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

function getVisiblePages(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
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
      icon: "folder_managed",
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

  if (
    value.includes("CHAT") ||
    value.includes("MESSAGE") ||
    targetKind === "MESSAGE"
  ) {
    return {
      label: "Message",
      icon: "chat",
      className: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    };
  }

  if (
    value.includes("ESCROW") ||
    value.includes("WALLET") ||
    value.includes("PAYMENT") ||
    value.includes("WITHDRAW") ||
    targetKind === "WALLET"
  ) {
    return {
      label: "Wallet",
      icon: "account_balance_wallet",
      className: "border-green-400/20 bg-green-400/10 text-green-300",
    };
  }

  if (value.includes("REVIEW") || targetKind === "REVIEW") {
    return {
      label: "Review",
      icon: "reviews",
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

function getFriendlyError(err, fallback) {
  const data = err?.response?.data;

  if (typeof data === "string") return data;

  return data?.message || data?.title || err?.message || fallback;
}