// src/components/layout/NotificationDropdown.jsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../hooks/useNotifications";

// ── Icon theo type ────────────────────────────────────────────────────
const TYPE_CONFIG = {
  PROPOSAL_SUBMITTED: { icon: "description",        color: "#00F0FF", bg: "rgba(0,240,255,0.1)"   },
  PROPOSAL_RESUBMITTED: { icon: "edit_document", color: "#00F0FF", bg: "rgba(0,240,255,0.1)" },
  PROPOSAL_ACCEPTED:  { icon: "check_circle",        color: "#22c55e", bg: "rgba(34,197,94,0.1)"   },
  PROPOSAL_REJECTED:  { icon: "cancel",              color: "#ef4444", bg: "rgba(239,68,68,0.1)"   },
  MESSAGE_RECEIVED:      { icon: "chat", color: "#c0c1ff", bg: "rgba(192,193,255,0.1)" },
  CHAT_MESSAGE_RECEIVED: { icon: "chat", color: "#c0c1ff", bg: "rgba(192,193,255,0.1)" },
  DEPOSIT:            { icon: "add_card",            color: "#00F0FF", bg: "rgba(0,240,255,0.1)"   },
  WITHDRAWAL:         { icon: "outbox",              color: "#facc15", bg: "rgba(250,204,21,0.1)"  },
  WITHDRAWAL_APPROVED:{ icon: "check_circle",        color: "#22c55e", bg: "rgba(34,197,94,0.1)"  },
  WITHDRAWAL_REJECTED:{ icon: "cancel",              color: "#ef4444", bg: "rgba(239,68,68,0.1)"  },
  JOB_INVITED:        { icon: "person_add",          color: "#c0c1ff", bg: "rgba(192,193,255,0.1)" },
  SYSTEM:             { icon: "notifications",       color: "#8c90a0", bg: "rgba(140,144,160,0.1)" },
};

function getTypeConfig(type) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.SYSTEM;
}

function formatNotificationTime(dateStr) {
  if (!dateStr) return "";

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

    if (diffMinutes < 1) {
      return "Just now";
    }

    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);

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

export default function NotificationDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markRead,
    markAllRead,
  } = useNotifications();

  // Fetch khi mở dropdown
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Click outside để đóng
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const getNotificationTargetUrl = (notification) => {
  const type = notification.type;

  if (notification.actionUrl || notification.link) {
    return notification.actionUrl || notification.link;
  }

  let metadata = {};

  try {
    metadata =
      typeof notification.metadata === "string"
        ? JSON.parse(notification.metadata)
        : notification.metadata || {};
  } catch {
    metadata = {};
  }

  const proposalId =
    notification.proposalId ||
    notification.relatedProposalId ||
    notification.entityId ||
    notification.referenceId ||
    notification.targetId ||
    metadata.proposalId ||
    metadata.relatedProposalId ||
    metadata.entityId ||
    metadata.referenceId ||
    metadata.targetId;

  switch (type) {
    case "CHAT_MESSAGE_RECEIVED":
    case "MESSAGE_RECEIVED":
      return "/client/messages";

    case "PROPOSAL_SUBMITTED":
    case "PROPOSAL_RESUBMITTED":
    case "PROPOSAL_ACCEPTED":
    case "PROPOSAL_REJECTED":
      return proposalId
        ? `/client/proposals/${proposalId}`
        : "/client/notifications";

    case "JOB_INVITED":
      return "/expert/messages";

    case "DEPOSIT":
    case "WITHDRAWAL":
    case "WITHDRAWAL_APPROVED":
    case "WITHDRAWAL_REJECTED":
      return "/client/wallet";

    default:
      return "/client/notifications";
  }
};

  const handleNotificationClick = (notification) => {
    const targetUrl = getNotificationTargetUrl(notification);

    console.log("Notification:", notification);
    console.log("Target URL:", targetUrl);

    if (!notification.isRead) {
      markRead(notification.notificationId);
    }

    navigate(targetUrl);
    setOpen(false);
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>

      {/* Bell button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{ position: "relative", width: 38, height: 38, borderRadius: 10, background: open ? "rgba(0,240,255,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${open ? "rgba(0,240,255,0.3)" : "rgba(255,255,255,0.1)"}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s", color: open ? "#00F0FF" : "#8c90a0" }}
        onMouseEnter={(e) => { if (!open) { e.currentTarget.style.borderColor = "rgba(0,240,255,0.25)"; e.currentTarget.style.color = "#00F0FF"; }}}
        onMouseLeave={(e) => { if (!open) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#8c90a0"; }}}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>notifications</span>

        {/* Badge */}
        {unreadCount > 0 && (
          <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 999, background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", border: "2px solid #101319", boxShadow: "0 0 8px rgba(239,68,68,0.5)" }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{ position: "absolute", right: -12, top: "calc(100% + 16px)", width: 300, background: "linear-gradient(180deg, rgba(21,25,34,0.98), rgba(12,15,22,0.98))", border: "1px solid rgba(0,240,255,0.22)", borderRadius: 22, boxShadow: "0 24px 80px rgba(0,0,0,0.85), 0 0 50px rgba(0,240,255,0.08)", backdropFilter: "blur(28px)", zIndex: 999, overflow: "hidden" }}>

          

          {/* Header */}
          <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.025)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb" }}>Notifications</span>
              {unreadCount > 0 && (
                <span style={{ padding: "2px 8px", borderRadius: 999, background: "rgba(0,240,255,0.1)", color: "#00F0FF", fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "#8c90a0", background: "none", border: "none", cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#00F0FF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#8c90a0")}>
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div  className="
                        max-h-[220px]
                        overflow-y-auto
                        pr-1

                        [&::-webkit-scrollbar]:w-1
                        [&::-webkit-scrollbar-track]:bg-transparent
                        [&::-webkit-scrollbar-thumb]:rounded-full
                        [&::-webkit-scrollbar-thumb]:bg-white/10
                        hover:[&::-webkit-scrollbar-thumb]:bg-cyan-400/50

                        [scrollbar-width:thin]
                        [scrollbar-color:rgba(255,255,255,0.12)_transparent]
                      ">
            {loading && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#8c90a0" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, display: "block", marginBottom: 8, animation: "spin 1s linear infinite", color: "#00F0FF" }}>autorenew</span>
                Loading...
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 20px", color: "#8c90a0" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 12, color: "#272a30" }}>notifications_off</span>
                <p style={{ fontSize: 14, margin: 0 }}>No notifications yet</p>
              </div>
            )}

            {!loading && notifications.map((n) => {
              const cfg = getTypeConfig(n.type);
              const isUnread = !n.isRead;
              return (
                <div
                  key={n.notificationId}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    margin: "8px",
                    padding: "12px",
                    borderRadius: "14px",
                    border: `1px solid ${
                      isUnread
                        ? "rgba(0,240,255,0.15)"
                        : "rgba(255,255,255,0.06)"
                    }`,
                    cursor: "pointer",
                    background: isUnread
                      ? "rgba(0,240,255,0.04)"
                      : "rgba(255,255,255,0.02)",
                    transition: "all 0.25s ease",
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    position: "relative"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(0,240,255,0.08)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      "0 6px 20px rgba(0,240,255,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isUnread
                      ? "rgba(0,240,255,0.04)"
                      : "rgba(255,255,255,0.02)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {/* Unread dot */}
                  {isUnread && (
                    <span style={{ position: "absolute", top: 18, left: 8, width: 6, height: 6, borderRadius: "50%", background: "#00F0FF", boxShadow: "0 0 6px rgba(0,240,255,0.6)" }} />
                  )}

                  {/* Icon */}
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: cfg.bg, color: cfg.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{cfg.icon}</span>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: isUnread ? "#e1e2eb" : "#c2c6d6", fontWeight: isUnread ? 600 : 400, margin: "0 0 4px", lineHeight: 1.5 }}>
                      {n.title || n.message || n.content}
                    </p>
                    {(n.body || n.description) && (
                      <p style={{ fontSize: 12, color: "#8c90a0", margin: "0 0 6px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {n.body || n.description}
                      </p>
                    )}
                    <span style={{ fontSize: 11, color: "#8c90a0", fontFamily: "JetBrains Mono, monospace" }}>
                      {formatNotificationTime(n.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
              <button
                onClick={() => { setOpen(false); navigate("/client/notifications"); }}
                style={{ fontSize: 12, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "#8c90a0", background: "none", border: "none", cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#00F0FF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#8c90a0")}>
                View all notifications →
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}