// src/modules/client/pages/NotificationsPage.jsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import { useNotifications } from "../../../hooks/useNotifications";

const TYPE_CONFIG = {
  PROPOSAL_SUBMITTED: { icon: "description", color: "#00F0FF", bg: "rgba(0,240,255,0.1)" },
  PROPOSAL_ACCEPTED: { icon: "check_circle", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  PROPOSAL_REJECTED: { icon: "cancel", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },

  CHAT_MESSAGE_RECEIVED: { icon: "chat", color: "#c0c1ff", bg: "rgba(192,193,255,0.1)" },
  MESSAGE_RECEIVED: { icon: "chat", color: "#c0c1ff", bg: "rgba(192,193,255,0.1)" },

  DELIVERABLE_SUBMITTED: { icon: "upload_file", color: "#00F0FF", bg: "rgba(0,240,255,0.1)" },
  DELIVERABLE_APPROVED: { icon: "verified", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  MILESTONE_OVERDUE: { icon: "event_busy", color: "#ef4444", bg: "rgba(239,68,68,0.1)",},

  ESCROW_LOCKED: { icon: "lock", color: "#facc15", bg: "rgba(250,204,21,0.1)" },
  ESCROW_RELEASED: { icon: "payments", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  ESCROW_LOCK_EXPIRED: { icon: "lock_clock", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },

  CONTRACT_CONFIRMED_PENDING_ESCROW: { icon: "contract", color: "#facc15", bg: "rgba(250,204,21,0.1)" },
  CONTRACT_CONFIRMED_ESCROW_LOCKED: { icon: "lock", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },

  DEPOSIT: { icon: "add_card", color: "#00F0FF", bg: "rgba(0,240,255,0.1)" },
  DEPOSIT_EXPIRED: {
  icon: "schedule",
  color: "#ef4444",
  bg: "rgba(239,68,68,0.1)",
},
  WITHDRAWAL: { icon: "outbox", color: "#facc15", bg: "rgba(250,204,21,0.1)" },
  WITHDRAWAL_APPROVED: { icon: "check_circle", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  WITHDRAWAL_REJECTED: { icon: "cancel", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },

  JOB_INVITED: { icon: "person_add", color: "#c0c1ff", bg: "rgba(192,193,255,0.1)" },
  SYSTEM: { icon: "notifications", color: "#8c90a0", bg: "rgba(140,144,160,0.1)" },
};

function getTypeCfg(type) {
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
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
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
    if (
      notification?.[key] !== undefined &&
      notification?.[key] !== null
    ) {
      return notification[key];
    }

    if (
      metadata?.[key] !== undefined &&
      metadata?.[key] !== null
    ) {
      return metadata[key];
    }
  }

  return null;
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
  ]);

  const conversationId = getValue(notification, metadata, [
    "conversationId",
    "relatedConversationId",
    "targetConversationId",
  ]);

  const milestoneId = getValue(notification, metadata, [
    "milestoneId",
    "relatedMilestoneId",
    "targetMilestoneId",
  ]);

  const projectId = getValue(notification, metadata, [
    "projectId",
    "relatedProjectId",
    "targetProjectId",
  ]);

  const contractId = getValue(notification, metadata, [
    "contractId",
    "relatedContractId",
    "targetContractId",
  ]);

  const deliverableId = getValue(notification, metadata, [
    "deliverableId",
    "relatedDeliverableId",
    "targetDeliverableId",
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

    case "CONTRACT_CONFIRMED_PENDING_ESCROW":
      return contractId
        ? `/client/contracts/${contractId}`
        : projectId
          ? `/client/projects/${projectId}`
          : "/client/projects";

    case "CONTRACT_CONFIRMED_ESCROW_LOCKED":
    case "ESCROW_LOCKED":
    case "ESCROW_LOCK_EXPIRED":
      return projectId
        ? `/client/projects/${projectId}`
        : "/client/projects";

    case "MILESTONE_OVERDUE":
      return projectId
        ? `/client/projects/${projectId}`
        : "/client/projects";

    case "DELIVERABLE_SUBMITTED":
    case "DELIVERABLE_APPROVED":
    case "MILESTONE_DELIVERABLE_SUBMITTED":
    case "DELIVERABLE_CREATED":
      return milestoneId
        ? `/client/milestones/${milestoneId}/deliverables`
        : deliverableId
          ? `/client/deliverables/${deliverableId}`
          : "/client/projects";

    case "ESCROW_RELEASED":
      return milestoneId
        ? `/client/milestones/${milestoneId}/deliverables`
        : "/client/wallet";

    case "DEPOSIT":
    case "DEPOSIT_EXPIRED":
    case "WITHDRAWAL":
    case "WITHDRAWAL_APPROVED":
    case "WITHDRAWAL_REJECTED":
      return "/client/wallet";

    case "JOB_INVITED":
      return "/expert/messages";

    default:
      return "/client/notifications";
  }
}
// ── Pagination ────────────────────────────────────────────────────────
function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const btnBase = {
    width: 36, height: 36, borderRadius: 8,
    fontFamily: "JetBrains Mono, monospace", fontSize: 13,
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.2s", cursor: "pointer",
  };

  const activeStyle = { ...btnBase, background: "#00F0FF", color: "#002022", border: "1px solid transparent", fontWeight: 700 };
  const normalStyle = { ...btnBase, background: "transparent", color: "#8c90a0", border: "1px solid rgba(255,255,255,0.12)" };
  const disabledStyle = { ...btnBase, background: "transparent", color: "#3d4050", border: "1px solid rgba(255,255,255,0.06)", cursor: "not-allowed" };

  // Build page list với ...
  const pages = [];
  const delta = 1;
  const range = [];
  for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
    range.push(i);
  }
  if (page - delta > 2) range.unshift("...");
  if (page + delta < totalPages - 1) range.push("...");
  pages.push(1);
  pages.push(...range);
  if (totalPages > 1) pages.push(totalPages);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
      {/* Prev */}
      <button
        onClick={() => page > 1 && onChange(page - 1)}
        style={page === 1 ? disabledStyle : normalStyle}
        onMouseEnter={(e) => { if (page > 1) { e.currentTarget.style.borderColor = "rgba(0,240,255,0.3)"; e.currentTarget.style.color = "#00F0FF"; }}}
        onMouseLeave={(e) => { if (page > 1) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#8c90a0"; }}}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
      </button>

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`d${i}`} style={{ color: "#414754", fontSize: 13, padding: "0 2px" }}>•••</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            style={p === page ? activeStyle : normalStyle}
            onMouseEnter={(e) => { if (p !== page) { e.currentTarget.style.borderColor = "rgba(0,240,255,0.3)"; e.currentTarget.style.color = "#00F0FF"; }}}
            onMouseLeave={(e) => { if (p !== page) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#8c90a0"; }}}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        onClick={() => page < totalPages && onChange(page + 1)}
        style={page === totalPages ? disabledStyle : normalStyle}
        onMouseEnter={(e) => { if (page < totalPages) { e.currentTarget.style.borderColor = "rgba(0,240,255,0.3)"; e.currentTarget.style.color = "#00F0FF"; }}}
        onMouseLeave={(e) => { if (page < totalPages) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#8c90a0"; }}}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
      </button>
    </div>
  );
}

// ── ROW_HEIGHT: chiều cao 1 notification item (px) ────────────────────
const ROW_HEIGHT = 90;
const HEADER_OFFSET = 320; // header + pagination + padding

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { notifications, unreadCount, loading, fetchNotifications, markRead, markAllRead } = useNotifications();

  // Tự tính pageSize theo chiều cao viewport
  const calcPageSize = useCallback(() => {
    const available = window.innerHeight - HEADER_OFFSET;
    const size = Math.max(5, Math.floor(available / ROW_HEIGHT));
    setPageSize(size);
  }, []);

  useEffect(() => {
    calcPageSize();
    window.addEventListener("resize", calcPageSize);
    return () => window.removeEventListener("resize", calcPageSize);
  }, [calcPageSize]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Reset page 1 khi pageSize thay đổi
  useEffect(() => { setPage(1); }, [pageSize]);

  const totalPages = Math.ceil(notifications.length / pageSize);
  const paginated = notifications.slice((page - 1) * pageSize, page * pageSize);

  const handleClick = async (n) => {
    const targetUrl = getNotificationTargetUrl(n);
    try {
      if (!n.isRead && n.notificationId) {
        await markRead(n.notificationId);
      }
    } catch (err) {
      console.error("Mark read failed:", err);
    } finally {
      navigate(targetUrl);
    }
  };

  const handlePageChange = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <ClientLayout>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px" }}>

        {/* Header */}
        <button
          onClick={() => navigate("/client/dashboard", { replace: true })}
          className="mb-6 flex w-fit items-center gap-2 rounded-lg border border-cyan-400/30 px-4 py-2 text-cyan-400 transition hover:bg-cyan-400/10"
        >
          <span className="material-symbols-outlined text-[18px]">
            arrow_back
          </span>
          Back
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 30, fontWeight: 700, color: "#e1e2eb", marginBottom: 6 }}>
              Notifications
            </h1>
            <p style={{ color: "#8c90a0", fontSize: 14, margin: 0 }}>
              {notifications.length} total
              {unreadCount > 0 && (
                <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 999, background: "rgba(0,240,255,0.1)", color: "#00F0FF", fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>
                  {unreadCount} unread
                </span>
              )}
            </p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "rgba(0,240,255,0.06)", color: "#00F0FF", border: "1px solid rgba(0,240,255,0.25)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,240,255,0.12)"; e.currentTarget.style.borderColor = "#00F0FF"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,240,255,0.06)"; e.currentTarget.style.borderColor = "rgba(0,240,255,0.25)"; }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>done_all</span>
              Mark all read
            </button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#8c90a0" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 16, animation: "spin 1s linear infinite", color: "#00F0FF" }}>autorenew</span>
            Loading notifications...
          </div>
        )}

        {/* Empty */}
        {!loading && notifications.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 72, display: "block", marginBottom: 16, color: "#272a30" }}>notifications_off</span>
            <p style={{ color: "#8c90a0", fontSize: 16, marginBottom: 6 }}>No notifications yet</p>
            <p style={{ color: "#414754", fontSize: 13 }}>We'll notify you when something happens</p>
          </div>
        )}

        {/* List */}
        {!loading && paginated.length > 0 && (
          <>
            <div style={{ background: "rgba(16,19,25,0.85)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
              {paginated.map((n, index) => {
                const cfg = getTypeCfg(n.type);
                const isUnread = !n.isRead;
                const isLast = index === paginated.length - 1;

                return (
                  <div
                    key={n.notificationId}
                    onClick={() => handleClick(n)}
                    style={{ padding: "18px 24px", borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 16, alignItems: "flex-start", cursor: "pointer", background: isUnread ? "rgba(0,240,255,0.02)" : "transparent", transition: "background 0.2s", position: "relative" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = isUnread ? "rgba(0,240,255,0.02)" : "transparent")}
                  >
                    {/* Unread dot */}
                    {isUnread && (
                      <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 6, height: 6, borderRadius: "50%", background: "#00F0FF", boxShadow: "0 0 6px rgba(0,240,255,0.6)" }} />
                    )}

                    {/* Icon */}
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: cfg.bg, color: cfg.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{cfg.icon}</span>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 4 }}>
                        <p
                          style={{
                            fontSize: 14,
                            color: isUnread ? "#e1e2eb" : "#c2c6d6",
                            fontWeight: isUnread ? 600 : 400,
                            margin: 0,
                            lineHeight: 1.5,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: "100%",
                          }}
                        >
                          {n.title || "Notification"}
                        </p>
                        <span style={{ fontSize: 11, color: "#8c90a0", fontFamily: "JetBrains Mono, monospace", whiteSpace: "nowrap", flexShrink: 0 }}>
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>

                      <p
                        style={{
                          fontSize: 13,
                          color: "#8c90a0",
                          margin: "0 0 8px",
                          lineHeight: 1.6,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {n.content || n.message || n.body || n.description || ""}
                      </p>

                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {n.type && (
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 999,
                              fontSize: 10,
                              fontWeight: 700,
                              fontFamily: "JetBrains Mono, monospace",
                              color: cfg.color,
                              background: cfg.bg,
                              border: `1px solid ${cfg.color}30`,
                              maxWidth: 180,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              display: "inline-block",
                            }}
                          >
                            {n.type}
                          </span>
                        )}
                        {isUnread && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markRead(n.notificationId); }}
                            style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "#8c90a0", background: "none", border: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em", padding: 0 }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#00F0FF")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#8c90a0")}>
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>

                    <span className="material-symbols-outlined self-center shrink-0 text-[18px] text-[#414754]">
                      chevron_right
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Info + Pagination */}
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <p style={{ color: "#8c90a0", fontSize: 13, margin: 0 }}>
                Showing{" "}
                <span style={{ color: "#e1e2eb" }}>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, notifications.length)}</span>
                {" "}of{" "}
                <span style={{ color: "#e1e2eb" }}>{notifications.length}</span> notifications
                <span style={{ color: "#414754", marginLeft: 8 }}>({pageSize}/page)</span>
              </p>
              <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </ClientLayout>
  );
}