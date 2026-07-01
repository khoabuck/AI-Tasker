// src/components/layout/NotificationDropdown.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../hooks/useNotifications";

const TYPE_CONFIG = {
  PROPOSAL_SUBMITTED: {
    icon: "description",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
  },
  PROPOSAL_RESUBMITTED: {
    icon: "edit_document",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
  },
  PROPOSAL_ACCEPTED: {
    icon: "check_circle",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  PROPOSAL_REJECTED: {
    icon: "cancel",
    color: "text-red-400",
    bg: "bg-red-400/10",
  },
  MESSAGE_RECEIVED: {
    icon: "chat",
    color: "text-indigo-300",
    bg: "bg-indigo-300/10",
  },
  CHAT_MESSAGE_RECEIVED: {
    icon: "chat",
    color: "text-indigo-300",
    bg: "bg-indigo-300/10",
  },
  DEPOSIT: {
    icon: "add_card",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
  },
  WITHDRAWAL: {
    icon: "outbox",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
  },
  WITHDRAWAL_APPROVED: {
    icon: "check_circle",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  WITHDRAWAL_REJECTED: {
    icon: "cancel",
    color: "text-red-400",
    bg: "bg-red-400/10",
  },
  JOB_INVITED: {
    icon: "person_add",
    color: "text-indigo-300",
    bg: "bg-indigo-300/10",
  },
  DELIVERABLE_SUBMITTED: {
    icon: "upload_file",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  SYSTEM: {
    icon: "notifications",
    color: "text-gray-400",
    bg: "bg-gray-400/10",
  },
};

function getTypeConfig(type) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.SYSTEM;
}

function parseMetadata(notification) {
  try {
    if (!notification?.metadata) return {};
    return typeof notification.metadata === "string"
      ? JSON.parse(notification.metadata)
      : notification.metadata;
  } catch {
    return {};
  }
}

function getValue(notification, metadata, keys) {
  for (const key of keys) {
    if (notification?.[key] !== undefined && notification?.[key] !== null) {
      return notification[key];
    }

    if (metadata?.[key] !== undefined && metadata?.[key] !== null) {
      return metadata[key];
    }
  }

  return null;
}

function getNotificationId(notification) {
  return (
    notification?.notificationId ||
    notification?.id ||
    notification?.notificationID ||
    notification?.notification_id
  );
}

function formatNotificationTime(dateStr) {
  if (!dateStr) return "";

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  }

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getNotificationTargetUrl(notification) {
  const type = notification?.type || "SYSTEM";
  const metadata = parseMetadata(notification);

  if (notification?.actionUrl) return notification.actionUrl;
  if (notification?.link) return notification.link;
  if (notification?.url) return notification.url;
  if (notification?.targetUrl) return notification.targetUrl;

  const proposalId = getValue(notification, metadata, [
    "proposalId",
    "relatedProposalId",
    "targetProposalId",
    "entityId",
    "referenceId",
    "targetId",
  ]);

  const conversationId = getValue(notification, metadata, [
    "conversationId",
    "relatedConversationId",
    "targetConversationId",
    "entityId",
    "referenceId",
    "targetId",
  ]);

  const milestoneId = getValue(notification, metadata, [
    "milestoneId",
    "relatedMilestoneId",
    "targetMilestoneId",
    "entityId",
    "referenceId",
    "targetId",
  ]);

  switch (type) {
    case "CHAT_MESSAGE_RECEIVED":
    case "MESSAGE_RECEIVED":
      return conversationId
        ? `/client/messages/${conversationId}`
        : "/client/messages";

    case "PROPOSAL_SUBMITTED":
    case "PROPOSAL_RESUBMITTED":
    case "PROPOSAL_ACCEPTED":
    case "PROPOSAL_REJECTED":
      return proposalId
        ? `/client/proposals/${proposalId}`
        : "/client/projects";

    case "JOB_INVITED":
      return "/expert/messages";

    case "DELIVERABLE_SUBMITTED":
    case "MILESTONE_DELIVERABLE_SUBMITTED":
    case "DELIVERABLE_CREATED":
    case "DELIVERABLE_APPROVED":
    case "MILESTONE_APPROVED":
    case "MILESTONE_DELIVERABLE_APPROVED":
      return milestoneId
        ? `/client/milestones/${milestoneId}/deliverables`
        : "/client/projects";

    case "DEPOSIT":
    case "WITHDRAWAL":
    case "WITHDRAWAL_APPROVED":
    case "WITHDRAWAL_REJECTED":
      return "/client/wallet";

    default:
      return "/client/notifications";
  }
}

export default function NotificationDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const hasFetchedWhenOpenRef = useRef(false);

  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markRead,
    markAllRead,
  } = useNotifications();

  useEffect(() => {
    if (!open) {
      hasFetchedWhenOpenRef.current = false;
      return;
    }

    if (hasFetchedWhenOpenRef.current) return;

    hasFetchedWhenOpenRef.current = true;
    fetchNotifications();
  }, [open]);

    

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleNotificationClick = async (notification) => {
    const notificationId = getNotificationId(notification);
    const targetUrl = getNotificationTargetUrl(notification);

    console.log("Notification:", notification);
    console.log("Target URL:", targetUrl);

    try {
      if (!notification?.isRead && notificationId) {
        await markRead(notificationId);
      }
    } finally {
      navigate(targetUrl);
      setOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`relative flex h-[38px] w-[38px] items-center justify-center rounded-xl border transition-all duration-200 ${
          open
            ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-400"
            : "border-white/10 bg-white/[0.04] text-gray-400 hover:border-cyan-400/25 hover:text-cyan-400"
        }`}
      >
        <span className="material-symbols-outlined text-[20px]">
          notifications
        </span>

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[#101319] bg-red-500 px-1 font-mono text-[10px] font-bold text-white shadow-[0_0_8px_rgba(239,68,68,0.5)]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-[-12px] top-[calc(100%+16px)] z-[999] w-[300px] overflow-hidden rounded-[22px] border border-cyan-400/20 bg-gradient-to-b from-[#151922]/95 to-[#0c0f16]/95 shadow-[0_24px_80px_rgba(0,0,0,0.85),0_0_50px_rgba(0,240,255,0.08)] backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.025] px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold text-gray-100">
                Notifications
              </span>

              {unreadCount > 0 && (
                <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-400">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="font-mono text-[11px] uppercase tracking-[0.08em] text-gray-400 transition hover:text-cyan-400"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[220px] overflow-y-auto pr-1 [scrollbar-color:rgba(255,255,255,0.12)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-cyan-400/50 [&::-webkit-scrollbar-track]:bg-transparent">
            {loading && (
              <div className="py-10 text-center text-gray-400">
                <span className="material-symbols-outlined mb-2 block animate-spin text-[32px] text-cyan-400">
                  autorenew
                </span>
                Loading...
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="px-5 py-12 text-center text-gray-400">
                <span className="material-symbols-outlined mb-3 block text-[48px] text-[#272a30]">
                  notifications_off
                </span>
                <p className="m-0 text-sm">No notifications yet</p>
              </div>
            )}

            {!loading &&
              notifications.map((n) => {
                const cfg = getTypeConfig(n.type);
                const isUnread = !n.isRead;
                const notificationId = getNotificationId(n);

                return (
                  <button
                    key={notificationId || `${n.type}-${n.createdAt}`}
                    type="button"
                    onClick={() => handleNotificationClick(n)}
                    className={`group relative m-2 flex w-[calc(100%-16px)] items-start gap-3 rounded-[14px] border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-cyan-400/10 hover:shadow-[0_6px_20px_rgba(0,240,255,0.12)] ${
                      isUnread
                        ? "border-cyan-400/15 bg-cyan-400/[0.04]"
                        : "border-white/10 bg-white/[0.02]"
                    }`}
                  >
                    {isUnread && (
                      <span className="absolute left-2 top-[18px] h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(0,240,255,0.6)]" />
                    )}

                    <div
                      className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl ${cfg.bg} ${cfg.color}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {cfg.icon}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`mb-1 truncate text-[13px] leading-5 ${
                          isUnread
                            ? "font-semibold text-gray-100"
                            : "font-normal text-gray-300"
                        }`}
                      >
                        {n.title || n.message || n.content || "Notification"}
                      </p>

                      {(n.body || n.description) && (
                        <p className="mb-1.5 overflow-hidden text-xs leading-5 text-gray-400 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                          {n.body || n.description}
                        </p>
                      )}

                      <span className="font-mono text-[11px] text-gray-400">
                        {formatNotificationTime(n.createdAt)}
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>

          {notifications.length > 0 && (
            <div className="border-t border-white/10 px-5 py-3 text-center">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/client/notifications");
                }}
                className="font-mono text-xs uppercase tracking-[0.08em] text-gray-400 transition hover:text-cyan-400"
              >
                View all notifications →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}