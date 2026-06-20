// src/modules/client/pages/ClientProposalDetailPage.jsx
// GET /api/proposals/{proposalId}
// POST /api/proposals/{proposalId}/decision  { decision: "ACCEPT" | "REJECT" }
// POST /api/messages { recipientId, content }

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";

const PROPOSAL_STATUS = {
  SUBMITTED: { label: "Submitted", color: "#facc15" },
  PENDING:   { label: "Pending",   color: "#facc15" },
  ACCEPTED:  { label: "Accepted",  color: "#22c55e" },
  REJECTED:  { label: "Rejected",  color: "#ef4444" },
  WITHDRAWN: { label: "Withdrawn", color: "#8c90a0" },
  COUNTERED: { label: "Countered", color: "#c0c1ff" },
};

const cardStyle = {
  background: "rgba(16,19,25,0.85)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 16,
  padding: 28,
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
};

const sectionLabel = {
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "#8c90a0",
  marginBottom: 8,
  display: "block",
};

// ── Message Modal ─────────────────────────────────────────────────────
function MessageModal({ proposal, onClose, navigate }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");

  const expertName = proposal.expertName || proposal.fullName || "Expert";

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    setSendError("");
    try {
      // Kiểm tra đã có conversation nào gắn với proposal này chưa, tránh tạo trùng
      // mỗi lần bấm gửi từ trang Proposal/Job Detail.
      let conversationId = null;
      try {
        const listRes = await axiosInstance.get("/conversations/me");
        const listRaw = listRes.data?.data ?? listRes.data;
        const list = Array.isArray(listRaw) ? listRaw : listRaw?.items ?? [];
        const existing = list.find((c) => c.relatedProposalId === proposal.proposalId);
        if (existing) conversationId = existing.conversationId;
      } catch {
        // Nếu check lỗi, vẫn tiếp tục thử tạo mới ở bước dưới
      }

      if (conversationId) {
        // Đã có conversation — gửi tiếp vào đó, không tạo mới
        await axiosInstance.post(`/conversations/${conversationId}/messages`, {
          content: message,
          messageType: "TEXT",
          attachmentUrl: null,
        });
      } else {
        // Chưa có — tạo conversation mới kèm tin nhắn đầu
        const res = await axiosInstance.post("/conversations", {
          conversationType: "JOB_INQUIRY",
          clientUserId: proposal.clientUserId,
          expertUserId: proposal.expertUserId,
          clientProfileId: proposal.clientProfileId,
          expertProfileId: proposal.expertProfileId,
          relatedJobId: proposal.jobId,
          relatedProposalId: proposal.proposalId,
          initialMessage: message,
        });
        const conv = res.data?.data ?? res.data;
        conversationId = conv?.conversationId;
      }

      setSent(true);
      setTimeout(() => {
        setSent(false);
        setMessage("");
        onClose();
        if (conversationId) {
          navigate(`/client/messages?conversationId=${conversationId}`);
        }
      }, 1200);
    } catch (err) {
      setSendError(err?.response?.data?.message || "Gửi tin nhắn thất bại.");
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
            <img src={proposal.expertAvatar || `https://i.pravatar.cc/100?u=${proposal.expertId}`} alt={expertName}
              style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(192,193,255,0.3)" }} />
            <div>
              <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontWeight: 700, fontSize: 15, color: "#e1e2eb", margin: 0 }}>{expertName}</h3>
              <p style={{ fontSize: 11, color: "#c0c1ff", fontFamily: "JetBrains Mono, monospace", margin: 0 }}>{proposal.expertTitle}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8c90a0", cursor: "pointer" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        <textarea value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder={`Hi ${expertName.split(" ")[0]}, I'd like to discuss your proposal...`} rows={5}
          style={{ width: "100%", background: "#1d2026", border: "1px solid rgba(192,193,255,0.2)", borderRadius: 10, padding: "12px 14px", color: "#e1e2eb", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 14, resize: "none", boxSizing: "border-box", marginBottom: 8 }}
          onFocus={(e) => (e.target.style.borderColor = "#c0c1ff")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(192,193,255,0.2)")} />
        <p style={{ fontSize: 11, color: "#8c90a0", marginBottom: 12 }}>{message.length}/500</p>

        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: "#8c90a0", fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Quick templates:</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["I'd like to discuss your proposal in more detail.", "Can we schedule a quick call?", "Your proposal looks great! Let's move forward."].map((t) => (
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

export default function ClientProposalDetailPage() {
  const { proposalId } = useParams();
  const navigate = useNavigate();

  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null); // "accept" | "decline"
  const [showMessage, setShowMessage] = useState(false);

  const fetchProposal = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const res = await axiosInstance.get(`/proposals/${proposalId}`, { signal });
      const raw = res.data;

      // BE bọc response dạng { success, data }. "data" có thể là object proposal
      // trực tiếp, hoặc 1 array chứa đúng 1 proposal (như đã thấy thực tế) — xử lý cả 2.
      let proposalData = raw?.data ?? raw;
      if (Array.isArray(proposalData)) {
        proposalData = proposalData[0] ?? null;
      }

      if (!proposalData) {
        setError("Không tìm thấy proposal này.");
        return;
      }

      setProposal(proposalData);
    } catch (err) {
      if (err?.code === "ERR_CANCELED") return;
      setError(
        err?.response?.status === 404 ? "Không tìm thấy proposal này." :
        err?.response?.status === 403 ? "Bạn không có quyền xem proposal này." :
        err?.response?.data?.message || "Đã có lỗi xảy ra."
      );
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchProposal(controller.signal);
    return () => controller.abort();
  }, [fetchProposal]);

  // ── Accept ────────────────────────────────────────────────────────
  const handleAccept = async () => {
    if (!confirm("Chấp nhận proposal này?")) return;
    setActionLoading("accept");
    try {
      await axiosInstance.post(`/proposals/${proposalId}/decision?decision=ACCEPT`);
      setProposal((prev) => ({ ...prev, status: "ACCEPTED" }));
    } catch (err) {
      alert(err?.response?.data?.message || "Accept thất bại.");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Decline ───────────────────────────────────────────────────────
  const handleDecline = async () => {
    if (!confirm("Từ chối proposal này?")) return;
    setActionLoading("decline");
    try {
      await axiosInstance.post(`/proposals/${proposalId}/decision?decision=REJECT`);
      setProposal((prev) => ({ ...prev, status: "REJECTED" }));
    } catch (err) {
      alert(err?.response?.data?.message || "Decline thất bại.");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────
  if (loading) return (
    <ClientLayout>
      <div style={{ textAlign: "center", padding: "120px 0", color: "#8c90a0" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 16, animation: "spin 1s linear infinite", color: "#00F0FF" }}>autorenew</span>
        Loading proposal...
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </ClientLayout>
  );

  if (error) return (
    <ClientLayout>
      <div style={{ textAlign: "center", padding: "120px 24px" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#f87171", display: "block", marginBottom: 12 }}>error_outline</span>
        <p style={{ color: "#f87171", fontSize: 15, marginBottom: 20 }}>{error}</p>
        <button onClick={() => navigate(-1)}
          style={{ padding: "10px 24px", background: "#00F0FF", color: "#002022", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
          Go Back
        </button>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </ClientLayout>
  );

  if (!proposal) return null;

  const pStatus = PROPOSAL_STATUS[proposal.status] || PROPOSAL_STATUS.SUBMITTED;
  const isPending = proposal.status === "SUBMITTED" || proposal.status === "PENDING";
  const isAccepting = actionLoading === "accept";
  const isDeclining = actionLoading === "decline";
  const isProcessing = isAccepting || isDeclining;
  const expertName = proposal.expertName || proposal.fullName || "Expert";
  const createdAt = proposal.createdAt
    ? new Date(proposal.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <ClientLayout>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>

        {/* Back */}
        <button onClick={() => navigate(-1)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#8c90a0", cursor: "pointer", fontSize: 14, marginBottom: 28, padding: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#e1e2eb")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#8c90a0")}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
          Back to Job
        </button>

        {/* Header */}
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            {/* Expert avatar */}
            <img src={proposal.expertAvatar || `https://i.pravatar.cc/100?u=${proposal.expertId}`} alt={expertName}
              style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(0,240,255,0.25)", flexShrink: 0 }} />

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 22, fontWeight: 700, color: "#e1e2eb", margin: 0 }}>
                  {expertName}
                </h1>
                <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", color: pStatus.color, background: pStatus.color + "15", border: `1px solid ${pStatus.color}40` }}>
                  {pStatus.label}
                </span>
              </div>
              <p style={{ fontSize: 13, color: "#8c90a0", margin: "0 0 12px" }}>{proposal.expertTitle || "AI Expert"}</p>

              {/* Price + Timeline */}
              <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
                <div>
                  <span style={sectionLabel}>Proposed Price</span>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 700, color: "#00F0FF" }}>
                    ${(proposal.proposedPrice || proposal.bidAmount)?.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span style={sectionLabel}>Timeline</span>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 700, color: "#e1e2eb" }}>
                    {proposal.proposedTimelineDays || proposal.estimatedDays} <span style={{ fontSize: 13, fontWeight: 400, color: "#8c90a0" }}>days</span>
                  </div>
                </div>
                <div>
                  <span style={sectionLabel}>Submitted</span>
                  <div style={{ fontSize: 13, color: "#c2c6d6", fontWeight: 600 }}>{createdAt}</div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
              {/* Message */}
              <button onClick={() => setShowMessage(true)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "rgba(192,193,255,0.08)", color: "#c0c1ff", border: "1px solid rgba(192,193,255,0.25)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(192,193,255,0.18)"; e.currentTarget.style.borderColor = "#c0c1ff"; e.currentTarget.style.boxShadow = "0 0 12px rgba(192,193,255,0.2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(192,193,255,0.08)"; e.currentTarget.style.borderColor = "rgba(192,193,255,0.25)"; e.currentTarget.style.boxShadow = "none"; }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chat</span>
                Message
              </button>

              {isPending && (
                <>
                  <button onClick={handleDecline} disabled={isProcessing}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: isProcessing ? "not-allowed" : "pointer", opacity: isProcessing ? 0.6 : 1, transition: "all 0.2s" }}
                    onMouseEnter={(e) => { if (!isProcessing) e.currentTarget.style.background = "rgba(248,113,113,0.15)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.08)"; }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{isDeclining ? "hourglass_empty" : "close"}</span>
                    {isDeclining ? "Declining..." : "Decline"}
                  </button>

                  <button onClick={handleAccept} disabled={isProcessing}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", background: isProcessing ? "rgba(34,197,94,0.08)" : "#22c55e", color: isProcessing ? "#22c55e" : "#002022", border: "1px solid rgba(34,197,94,0.5)", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: isProcessing ? "not-allowed" : "pointer", opacity: isProcessing ? 0.6 : 1, boxShadow: isProcessing ? "none" : "0 0 16px rgba(34,197,94,0.3)", transition: "all 0.2s" }}
                    onMouseEnter={(e) => { if (!isProcessing) e.currentTarget.style.boxShadow = "0 0 24px rgba(34,197,94,0.5)"; }}
                    onMouseLeave={(e) => { if (!isProcessing) e.currentTarget.style.boxShadow = "0 0 16px rgba(34,197,94,0.3)"; }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{isAccepting ? "hourglass_empty" : "check_circle"}</span>
                    {isAccepting ? "Accepting..." : "Accept Proposal"}
                  </button>
                </>
              )}

              {/* Accepted badge */}
              {proposal.status === "ACCEPTED" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 8, color: "#22c55e", fontSize: 13, fontWeight: 700 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>verified</span>
                  Accepted
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Cover Letter */}
          <div style={cardStyle}>
            <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              Cover Letter
            </h3>
            <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.9, whiteSpace: "pre-line", margin: 0 }}>
              {proposal.coverLetter || "—"}
            </p>
          </div>

          {/* Expected Outputs */}
          {proposal.expectedOutputs && (
            <div style={cardStyle}>
              <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                Expected Outputs
              </h3>
              <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.9, whiteSpace: "pre-line", margin: 0 }}>
                {proposal.expectedOutputs}
              </p>
            </div>
          )}

          {/* Working Approach */}
          {proposal.workingApproach && (
            <div style={cardStyle}>
              <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                Working Approach
              </h3>
              <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.9, whiteSpace: "pre-line", margin: 0 }}>
                {proposal.workingApproach}
              </p>
            </div>
          )}

          {/* Milestone Plan */}
          {proposal.preliminaryMilestonePlan && (
            <div style={{ ...cardStyle, border: "1px solid rgba(192,193,255,0.15)", background: "rgba(192,193,255,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(192,193,255,0.1)" }}>
                <span className="material-symbols-outlined" style={{ color: "#c0c1ff", fontSize: 18 }}>timeline</span>
                <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#c0c1ff", margin: 0 }}>
                  Preliminary Milestone Plan
                </h3>
              </div>
              <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.9, whiteSpace: "pre-line", margin: 0 }}>
                {proposal.preliminaryMilestonePlan}
              </p>
            </div>
          )}

          {/* Counter Offer — nếu có */}
          {(proposal.counterPrice || proposal.counterMessage) && (
            <div style={{ ...cardStyle, border: "1px solid rgba(249,115,22,0.2)", background: "rgba(249,115,22,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(249,115,22,0.1)" }}>
                <span className="material-symbols-outlined" style={{ color: "#f97316", fontSize: 18 }}>swap_horiz</span>
                <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#f97316", margin: 0 }}>
                  Counter Offer
                </h3>
              </div>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: proposal.counterMessage ? 16 : 0 }}>
                {proposal.counterPrice && (
                  <div>
                    <span style={sectionLabel}>Counter Price</span>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 18, fontWeight: 700, color: "#f97316" }}>
                      ${proposal.counterPrice?.toLocaleString()}
                    </div>
                  </div>
                )}
                {proposal.counterTimelineDays && (
                  <div>
                    <span style={sectionLabel}>Counter Timeline</span>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 18, fontWeight: 700, color: "#f97316" }}>
                      {proposal.counterTimelineDays} <span style={{ fontSize: 12, fontWeight: 400, color: "#8c90a0" }}>days</span>
                    </div>
                  </div>
                )}
              </div>
              {proposal.counterMessage && (
                <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.8, whiteSpace: "pre-line", margin: 0 }}>
                  {proposal.counterMessage}
                </p>
              )}
            </div>
          )}

        </div>
      </div>

      {showMessage && (
        <MessageModal proposal={proposal} onClose={() => setShowMessage(false)} navigate={navigate} />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </ClientLayout>
  );
}