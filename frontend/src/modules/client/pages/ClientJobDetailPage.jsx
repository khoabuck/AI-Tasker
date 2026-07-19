// src/modules/client/pages/ClientJobDetailPage.jsx
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";
import { findExistingConversationWithExpert } from "../../../utils/conversation.util";

const formatCurrency = (value) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

const STATUS_CONFIG = {
  DRAFT:     { label: "Draft",     color: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.25)" },
  OPEN:      { label: "Open",      color: "#00F0FF", bg: "rgba(0,240,255,0.08)",   border: "rgba(0,240,255,0.25)"   },
  ACTIVE:    { label: "Active",    color: "#22c55e", bg: "rgba(34,197,94,0.08)",   border: "rgba(34,197,94,0.25)"   },
  COMPLETED: { label: "Completed", color: "#3b82f6", bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.25)"  },
  CANCELLED: { label: "Cancelled", color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.25)"   },
  DISPUTED:  { label: "Disputed",  color: "#f97316", bg: "rgba(249,115,22,0.08)",  border: "rgba(249,115,22,0.25)"  },
};
const LEVEL_CONFIG = {
  JUNIOR: { label: "Junior", color: "#94a3b8" },
  MID:    { label: "Mid",    color: "#facc15" },
  SENIOR: { label: "Senior", color: "#00F0FF" },
  EXPERT: { label: "Expert", color: "#c0c1ff" },
};
const PROPOSAL_STATUS = {
  PENDING:   { label: "Pending",   color: "#facc15" },
  SUBMITTED: { label: "Pending",   color: "#facc15" },
  ACCEPTED:  { label: "Accepted",  color: "#22c55e" },
  REJECTED:  { label: "Rejected",  color: "#ef4444" },
  WITHDRAWN: { label: "Withdrawn", color: "#8c90a0" },
  COUNTERED: { label: "Countered", color: "#c0c1ff" },
};

const PROPOSAL_POLL_INTERVAL_MS = 5000;

const DEFAULT_STATUS_CONFIG = {
  label: "Unknown",
  color: "#94a3b8",
  bg: "rgba(148,163,184,0.08)",
  border: "rgba(148,163,184,0.25)",
};

const DEFAULT_PROPOSAL_STATUS = {
  label: "Unknown",
  color: "#8c90a0",
};

const parseProposalItems = (responseData) => {
  const data = responseData?.data ?? responseData;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
};
const cardStyle = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  overflow: "hidden",
  overflowWrap: "anywhere",

  background: "rgba(16,19,25,0.85)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 16,
  padding: 28,
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
};
const labelStyle = {
  display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10,
  textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", marginBottom: 6,
};

function ExpertAvatar({
  src,
  alt,
  size = 44,
  borderColor = "rgba(255,255,255,0.1)",
}) {
  const [imageError, setImageError] = useState(false);

  if (!src || imageError) {
    return (
      <div
        role="img"
        aria-label={alt}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(192,193,255,0.08)",
          border: `2px solid ${borderColor}`,
          color: "#c0c1ff",
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: size * 0.55 }}
        >
          person
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setImageError(true)}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
        border: `2px solid ${borderColor}`,
        flexShrink: 0,
      }}
    />
  );
}

function MessageModal({ proposal, onClose, navigate }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");
  const expertName = proposal.expertName || proposal.fullName || "Expert";

  const handleSend = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || sending) {
      return;
    }

    setSending(true);
    setSendError("");

    try {
      const existing = await findExistingConversationWithExpert(
        axiosInstance,
        {
          expertUserId: proposal.expertUserId,
        }
      );

      let conversationId = existing?.conversationId ?? null;

      if (conversationId) {
        await axiosInstance.post(
          `/conversations/${conversationId}/messages`,
          {
            content: trimmedMessage,
            messageType: "TEXT",
            attachmentUrl: null,
          }
        );
      } else {
        const response = await axiosInstance.post("/conversations", {
          conversationType: "JOB_INQUIRY",
          clientUserId: proposal.clientUserId,
          expertUserId: proposal.expertUserId,
          clientProfileId: proposal.clientProfileId,
          expertProfileId: proposal.expertProfileId,
          relatedJobId: proposal.jobId,
          relatedProposalId: proposal.proposalId,
          initialMessage: trimmedMessage,
        });

        const conversationData =
          response.data?.data ?? response.data;

        conversationId = conversationData?.conversationId;

        if (!conversationId) {
          throw new Error(
            "Conversation ID was not returned by the server."
          );
        }
      }

      setSent(true);

      setTimeout(() => {
        setSent(false);
        setMessage("");
        onClose();
        navigate(`/client/messages/${conversationId}`);
      }, 1200);
    } catch (err) {
      setSendError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to send message."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "rgba(16,19,25,0.98)", border: "1px solid rgba(192,193,255,0.25)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ExpertAvatar
                src={proposal.expertAvatarUrl}
                alt={expertName}
                size={40}
                borderColor="rgba(192,193,255,0.3)"
              />
            <div>
              <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontWeight: 700, fontSize: 15, color: "#e1e2eb", margin: 0 }}>{expertName}</h3>
              {(proposal.expertTitle || proposal.professionalTitle) && (
                <p
                  style={{
                    fontSize: 11,
                    color: "#c0c1ff",
                    fontFamily: "JetBrains Mono, monospace",
                    margin: 0,
                  }}
                >
                  {proposal.expertTitle || proposal.professionalTitle}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8c90a0", cursor: "pointer", padding: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", marginBottom: 8 }}>Your Message</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder={`Hi ${expertName.split(" ")[0]}, I'd like to discuss your proposal...`} rows={5}
            style={{ width: "100%", background: "#1d2026", border: "1px solid rgba(192,193,255,0.2)", borderRadius: 10, padding: "12px 14px", color: "#e1e2eb", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 14, resize: "none", boxSizing: "border-box" }}
            onFocus={(e) => (e.target.style.borderColor = "#c0c1ff")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(192,193,255,0.2)")} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: "#8c90a0", fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Quick templates:</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["I'd like to discuss your proposal in more detail.", "Can we schedule a quick call to talk about this?", "Your proposal looks great! Let's move forward."].map((t) => (
              <button key={t} onClick={() => setMessage(t)}
                style={{ padding: "4px 10px", background: "rgba(192,193,255,0.06)", border: "1px solid rgba(192,193,255,0.15)", borderRadius: 6, fontSize: 11, color: "#c0c1ff", cursor: "pointer" }}>
                {t.length > 40 ? t.slice(0, 40) + "..." : t}
              </button>
            ))}
          </div>
        </div>
        {sendError && <p style={{ fontSize: 12, color: "#f87171", marginBottom: 12 }}>{sendError}</p>}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px", background: "transparent", color: "#c2c6d6", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSend} disabled={sending || !message.trim() || sent}
            style={{ flex: 2, padding: "11px", background: sent ? "#22c55e" : !message.trim() ? "rgba(192,193,255,0.1)" : "rgba(192,193,255,0.15)", color: sent ? "#002022" : "#c0c1ff", border: `1px solid ${sent ? "#22c55e" : "rgba(192,193,255,0.3)"}`, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: !message.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{sent ? "check_circle" : sending ? "hourglass_empty" : "send"}</span>
            {sent ? "Sent!" : sending ? "Sending..." : "Send Message"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientJobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messagingProposal, setMessagingProposal] = useState(null);

  

  const fetchData = useCallback(async (signal) => {
  setLoading(true);
  setError("");
  setJob(null);
  setProposals([]);

  try {
    const [jobRes, proposalsRes] = await Promise.all([
      axiosInstance.get(`/jobs/${id}`, { signal }),
      axiosInstance.get(`/jobs/${id}/proposals`, { signal }),
    ]);

    setJob(jobRes.data);
    setProposals(parseProposalItems(proposalsRes.data));
  } catch (err) {
    if (err?.code === "ERR_CANCELED") {
      return;
    }

    setError(
      err?.response?.status === 404
        ? "No job found for this position."
        : err?.response?.status === 403
          ? "You are not allowed to view it."
          : err?.response?.data?.message ||
            "An error has occurred."
    );
  } finally {
    setLoading(false);
  }
}, [id]);

  const fetchProposals = useCallback(async () => {
  try {
    const response = await axiosInstance.get(
      `/jobs/${id}/proposals`
    );

    setProposals(parseProposalItems(response.data));
  } catch (err) {
    if (err?.code === "ERR_CANCELED") {
      return;
    }

    // Polling nền lỗi thì giữ lại danh sách proposal hiện tại.
  }
}, [id]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  // Tự động làm mới danh sách proposal mỗi 5s khi job còn OPEN — để phát hiện
  // proposal mới từ Expert mà không cần Client tự F5. Không polling khi job
  // đã ACTIVE/COMPLETED/CANCELLED/DISPUTED vì lúc đó không còn ai nộp proposal
  // mới nữa.
  useEffect(() => {
    if (job?.status !== "OPEN") {
      return;
    }

    const intervalId = setInterval(() => {
      fetchProposals();
    }, PROPOSAL_POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [job?.status, fetchProposals]);

  const showFullLoading = loading && !job;

if (showFullLoading) {
  return (
    <ClientLayout>
      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          minHeight: "calc(100vh - 82px)",
          margin: 0,
          padding: "60px 24px",
          boxSizing: "border-box",
          overflowX: "clip",

          background: "#0b0e14",
          color: "#8c90a0",
          textAlign: "center",

          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 48,
            display: "block",
            marginBottom: 16,
            animation: "spin 1s linear infinite",
            color: "#00F0FF",
          }}
        >
          autorenew
        </span>

        Loading job details...

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </ClientLayout>
  );
}

  if (error && !job) {
  return (
    <ClientLayout>
      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          minHeight: "calc(100vh - 82px)",
          margin: 0,
          padding: "80px 24px 40px",
          boxSizing: "border-box",
          overflowX: "clip",
          background: "#0b0e14",
          textAlign: "center",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#f87171", display: "block", marginBottom: 12 }}>error_outline</span>
        <p style={{ color: "#f87171", fontSize: 15, marginBottom: 20 }}>{error}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={() => fetchData()}>
            Retry
          </button>
          <button onClick={() => navigate("/client/jobs")} style={{ padding: "10px 24px", background: "#00F0FF", color: "#002022", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>Back to Jobs</button>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </ClientLayout>
  );
}

  if (!job) return null;

  const statusCfg = STATUS_CONFIG[job.status] || {
    ...DEFAULT_STATUS_CONFIG,
    label: job.status || DEFAULT_STATUS_CONFIG.label,
  };
  const deadline = job.deadline ? new Date(job.deadline).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";
  const createdAt = job.createdAt ? new Date(job.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

  return (
  <ClientLayout>
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        minHeight: "calc(100vh - 82px)",
        boxSizing: "border-box",
        overflowX: "clip",
        background: "#0b0e14",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 960,
          minWidth: 0,
          margin: "0 auto",
          padding: "40px 24px",
          boxSizing: "border-box",
          overflowX: "clip",
        }}
      >
          <button onClick={() => navigate("/client/jobs")}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#8c90a0", cursor: "pointer", fontSize: 14, marginBottom: 28, padding: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#e1e2eb")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#8c90a0")}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            Back 
          </button>

          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              <div
                style={{
                  flex: "1 1 300px",
                  minWidth: 0,
                  maxWidth: "100%",
                  overflowWrap: "anywhere",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 10,
                    flexWrap: "wrap",
                    minWidth: 0,
                  }}
                >
                  <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 26, fontWeight: 700, color: "#e1e2eb", margin: 0 }}>{job.title}</h1>
                  {job.isAiAssisted && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", background: "rgba(0,240,255,0.08)", border: "1px solid rgba(0,240,255,0.2)", borderRadius: 999, fontSize: 10, color: "#00F0FF", fontFamily: "JetBrains Mono, monospace", whiteSpace: "nowrap" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>auto_awesome</span>AI Assisted
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", color: statusCfg.color, background: statusCfg.bg, border: `1px solid ${statusCfg.border}` }}>{statusCfg.label}</span>
                  <span style={{ fontSize: 13, color: "#8c90a0" }}>Posted {createdAt}</span>
                  {job.projectType && <span style={{ fontSize: 13, color: "#c2c6d6" }}>{job.projectType}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 28 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 18, fontWeight: 700, color: "#00F0FF" }}>{formatCurrency(job.budgetMin)} – {formatCurrency(job.budgetMax)}</div>
                  
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 18, fontWeight: 700, color: "#facc15" }}>{proposals.length}</div>
                  <div style={{ fontSize: 11, color: "#8c90a0", marginTop: 2 }}>Proposals</div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <button onClick={() => navigate(`/client/jobs/${id}/recommendations`)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "rgba(192,193,255,0.08)", color: "#c0c1ff", border: "1px solid rgba(192,193,255,0.3)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(192,193,255,0.15)"; e.currentTarget.style.borderColor = "#c0c1ff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(192,193,255,0.08)"; e.currentTarget.style.borderColor = "rgba(192,193,255,0.3)"; }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_awesome</span>
                View AI Recommendation
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={cardStyle}>
              <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>Description</h3>
              <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.8, whiteSpace: "pre-line", margin: 0 }}>{job.description}</p>
            </div>

            {job.aiGeneratedDescription && (
              <div style={{ ...cardStyle, border: "1px solid rgba(0,240,255,0.15)", background: "rgba(0,240,255,0.02)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(0,240,255,0.1)" }}>
                  <span className="material-symbols-outlined" style={{ color: "#00F0FF", fontSize: 18 }}>auto_awesome</span>
                  <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#00F0FF", margin: 0 }}>AI Generated Description</h3>
                </div>
                <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.8, whiteSpace: "pre-line", margin: 0 }}>{job.aiGeneratedDescription}</p>
              </div>
            )}

            <div style={cardStyle}>
              <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>Project Details</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 20 }}>
                <div><span style={labelStyle}>Budget</span><div style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 700, color: "#00F0FF", fontSize: 15 }}>{formatCurrency(job.budgetMin)} — {formatCurrency(job.budgetMax)}</div><div style={{ fontSize: 11, color: "#8c90a0" }}></div></div>
                <div><span style={labelStyle}>Deadline</span><div style={{ color: "#e1e2eb", fontSize: 14, fontWeight: 600 }}>{deadline}</div></div>
                <div><span style={labelStyle}>Project Type</span><div style={{ color: "#e1e2eb", fontSize: 14 }}>{job.projectType || "—"}</div></div>
                <div><span style={labelStyle}>Complexity</span><div style={{ color: "#facc15", fontSize: 14, fontWeight: 600 }}>{job.complexity || "—"}</div></div>
              </div>
            </div>

            {job.expectedDeliverables && (
              <div style={cardStyle}>
                <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>Expected Deliverables</h3>
                <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.8, whiteSpace: "pre-line", margin: 0 }}>{job.expectedDeliverables}</p>
              </div>
            )}

            {job.skills?.length > 0 && (
              <div style={cardStyle}>
                <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>Required Skills</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {job.skills.map((s) => (
                    <span key={s.skillId} style={{ padding: "6px 14px", background: "rgba(0,240,255,0.08)", border: "1px solid rgba(0,240,255,0.2)", borderRadius: 999, fontSize: 12, color: "#00F0FF", fontFamily: "JetBrains Mono, monospace" }}>{s.skillName}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Proposals */}
            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", margin: 0 }}>Proposals Received</h3>
                <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: "rgba(250,204,21,0.1)", color: "#facc15", border: "1px solid rgba(250,204,21,0.3)", fontFamily: "JetBrains Mono, monospace" }}>{proposals.length} received</span>
              </div>

              {proposals.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#272a30", display: "block", marginBottom: 12 }}>inbox</span>
                  <p style={{ color: "#8c90a0", fontSize: 14 }}>No proposals yet. Experts will apply soon!</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {proposals.map((proposal) => {
                    const pStatus = PROPOSAL_STATUS[proposal.status] || {
                      ...DEFAULT_PROPOSAL_STATUS,
                      label:
                        proposal.status ||
                        DEFAULT_PROPOSAL_STATUS.label,
                    };
                    const level = LEVEL_CONFIG[proposal.level] || { label: proposal.level || "—", color: "#8c90a0" };
                    const submittedDate = (proposal.createdAt || proposal.submittedAt)
                      ? new Date(proposal.createdAt || proposal.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                      : "—";
                    const expertName = proposal.expertName || proposal.fullName || "Expert";

                    // FIX: field thật từ BE là proposedPrice / proposedTimelineDays
                    // (theo schema SubmitProposalRequest), không phải bidAmount/estimatedDays.
                    // Giữ fallback cho cả 2 tên để không vỡ nếu BE đổi lại.
                    const price = proposal.proposedPrice ?? proposal.bidAmount;
                    const timelineDays = proposal.proposedTimelineDays ?? proposal.estimatedDays;

                    return (
                      <div key={proposal.proposalId}
                        style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${proposal.status === "ACCEPTED" ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, padding: 20, transition: "border-color 0.2s" }}
                        onMouseEnter={(e) => { if (proposal.status !== "ACCEPTED") e.currentTarget.style.borderColor = "rgba(0,240,255,0.2)"; }}
                        onMouseLeave={(e) => { if (proposal.status !== "ACCEPTED") e.currentTarget.style.borderColor = proposal.status === "ACCEPTED" ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.07)"; }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                          <ExpertAvatar
                            src={proposal.expertAvatarUrl}
                            alt={expertName}
                            size={44}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                                  <h4 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontWeight: 700, fontSize: 15, color: "#e1e2eb", margin: 0 }}>{expertName}</h4>
                                  {proposal.level && (
                                    <span style={{ padding: "2px 7px", borderRadius: 999, fontSize: 9, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", background: level.color + "20", color: level.color, border: `1px solid ${level.color}40` }}>{level.label}</span>
                                  )}
                                </div>
                                {(proposal.expertTitle ||
                                  proposal.professionalTitle) && (
                                  <p
                                    style={{
                                      fontSize: 12,
                                      color: "#8c90a0",
                                      margin: 0,
                                    }}
                                  >
                                    {proposal.expertTitle ||
                                      proposal.professionalTitle}
                                  </p>
                                )}
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 17, fontWeight: 700, color: "#00F0FF" }}>
                                  {price != null ? formatCurrency(price) : "—"}
                                </div>
                                <div style={{ fontSize: 11, color: "#8c90a0" }}>
                                  {timelineDays != null ? `${timelineDays} days` : "—"}
                                </div>
                              </div>
                            </div>

                            <p style={{ fontSize: 13, color: "#c2c6d6", lineHeight: 1.6, margin: "0 0 12px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              {proposal.coverLetter}
                            </p>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", color: pStatus.color, background: pStatus.color + "15", border: `1px solid ${pStatus.color}40` }}>{pStatus.label}</span>
                                <span style={{ fontSize: 12, color: "#8c90a0" }}>{submittedDate}</span>
                              </div>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                {/* View Full */}
                                <button onClick={() => navigate(`/client/proposals/${proposal.proposalId}`)}
                                  style={{ padding: "7px 14px", background: "rgba(0,240,255,0.05)", color: "#00F0FF", border: "1px solid rgba(0,240,255,0.25)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,240,255,0.12)"; e.currentTarget.style.borderColor = "#00F0FF"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,240,255,0.05)"; e.currentTarget.style.borderColor = "rgba(0,240,255,0.25)"; }}>
                                  View Full
                                </button>

                                {/* Message icon */}
                                <button onClick={() => setMessagingProposal(proposal)} title="Send Message"
                                  style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(192,193,255,0.08)", color: "#c0c1ff", border: "1px solid rgba(192,193,255,0.25)", borderRadius: 8, cursor: "pointer", transition: "all 0.2s" }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(192,193,255,0.18)"; e.currentTarget.style.borderColor = "#c0c1ff"; e.currentTarget.style.boxShadow = "0 0 10px rgba(192,193,255,0.2)"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(192,193,255,0.08)"; e.currentTarget.style.borderColor = "rgba(192,193,255,0.25)"; e.currentTarget.style.boxShadow = "none"; }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 17 }}>chat</span>
                                </button>

                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {messagingProposal && (
        <MessageModal proposal={messagingProposal} onClose={() => setMessagingProposal(null)} navigate={navigate} />
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </ClientLayout>
  );
}