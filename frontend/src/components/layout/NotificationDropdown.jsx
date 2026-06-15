// src/components/layout/NotificationDropdown.jsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../hooks/useNotifications";

// ── Icon theo type ────────────────────────────────────────────────────
const TYPE_CONFIG = {
  PROPOSAL_SUBMITTED: { icon: "description",        color: "#00F0FF", bg: "rgba(0,240,255,0.1)"   },
  PROPOSAL_ACCEPTED:  { icon: "check_circle",        color: "#22c55e", bg: "rgba(34,197,94,0.1)"   },
  PROPOSAL_REJECTED:  { icon: "cancel",              color: "#ef4444", bg: "rgba(239,68,68,0.1)"   },
  MESSAGE_RECEIVED:   { icon: "chat",                color: "#c0c1ff", bg: "rgba(192,193,255,0.1)" },
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

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

  const handleNotificationClick = (notification) => {
    // Mark read
    if (!notification.isRead) {
      markRead(notification.notificationId);
    }
    // Navigate theo type
    const link = notification.actionUrl || notification.link;
    if (link) navigate(link);
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
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 12px)", width: 380, background: "rgba(16,19,25,0.98)", border: "1px solid rgba(0,240,255,0.15)", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(0,240,255,0.05)", backdropFilter: "blur(24px)", zIndex: 999, overflow: "hidden" }}>

          {/* Arrow */}
          <div style={{ position: "absolute", top: -6, right: 14, width: 12, height: 12, background: "rgba(16,19,25,0.98)", border: "1px solid rgba(0,240,255,0.15)", borderRight: "none", borderBottom: "none", transform: "rotate(45deg)" }} />

          {/* Header */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
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
                  style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", background: isUnread ? "rgba(0,240,255,0.02)" : "transparent", transition: "background 0.2s", display: "flex", gap: 12, alignItems: "flex-start", position: "relative" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = isUnread ? "rgba(0,240,255,0.02)" : "transparent")}
                >
                  {/* Unread dot */}
                  {isUnread && (
                    <span style={{ position: "absolute", top: 18, left: 8, width: 6, height: 6, borderRadius: "50%", background: "#00F0FF", boxShadow: "0 0 6px rgba(0,240,255,0.6)" }} />
                  )}

                  {/* Icon */}
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: cfg.bg, color: cfg.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
                      {timeAgo(n.createdAt)}
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