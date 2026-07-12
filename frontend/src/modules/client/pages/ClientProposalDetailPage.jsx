// src/modules/client/pages/ClientProposalDetailPage.jsx
// GET  /api/proposals/{proposalId}
// GET  /api/proposals/{proposalId}/contract
// POST /api/proposals/{proposalId}/decision  { decision: "ACCEPT" | "REJECT" }
// POST /api/contracts/from-proposal/{proposalId}
// POST /api/conversations, /api/conversations/{id}/messages
//
// Việc ký hợp đồng (confirm / lock escrow / chờ expert ký) đã tách sang
// ClientContractSignPage — trang này chỉ tạo contract khi Accept, rồi điều
// hướng qua đó. Nếu đã có contract dở dang (client rời trang trước khi ký),
// nút Accept/Decline tự ẩn (vì proposal.status đã là ACCEPTED) và thay bằng
// nút "Continue to Contract" để quay lại đúng chỗ đang dang dở.

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";
import { findExistingConversationWithExpert } from "../../../utils/conversation.util";

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

function readContractSignState(contract) {
  const clientSigned = contract?.clientConfirmed === true;
  const expertSigned = contract?.expertConfirmed === true;
  const contractStatus = (contract?.status || "").toUpperCase();
  const bothSigned =
    (clientSigned && expertSigned) || contractStatus === "CONFIRMED";
  return { clientSigned, expertSigned, bothSigned };
}

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
      const existing = await findExistingConversationWithExpert(axiosInstance, {
        expertUserId: proposal.expertUserId,
      });
    let conversationId = existing?.conversationId ?? null;

      if (conversationId) {
        await axiosInstance.post(`/conversations/${conversationId}/messages`, {
          content: message,
          messageType: "TEXT",
          attachmentUrl: null,
        });
      } else {
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
        conversationId = conv?.conversationId ?? conv?.id ?? conv?.conversationID;
      }

      setSent(true);
      setTimeout(() => {
        setSent(false);
        setMessage("");
        onClose();
        if (conversationId) {
          const jobTitleParam = proposal.jobTitle ? `?jobTitle=${encodeURIComponent(proposal.jobTitle)}` : "";
          navigate(`/client/messages/${conversationId}${jobTitleParam}`);
        }
      }, 1200);
    } catch (err) {
      setSendError(err?.response?.data?.message || "Send message failed.");
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
            <img
              src={
                proposal.expertAvatarUrl ||
                proposal.avatarUrl ||
                "/default-avatar.png"
              }
              alt={expertName}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/default-avatar.png";
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid rgba(192,193,255,0.3)",
              }}
            />
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
  const [walletBalance, setWalletBalance] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [contractCreated, setContractCreated] = useState(null);
  const [contractChecked, setContractChecked] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [acceptError, setAcceptError] = useState("");

  const fetchProposal = useCallback(async (signal, silent = false) => {
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const res = await axiosInstance.get(`/proposals/${proposalId}`, { signal });
      const raw = res.data;

      let proposalData = raw?.data ?? raw;
      if (Array.isArray(proposalData)) {
        proposalData = proposalData[0] ?? null;
      }

      if (!proposalData) {
        if (!silent) setError("Proposal not found.");
        return;
      }

      setProposal(proposalData);
    } catch (err) {
      if (err?.code === "ERR_CANCELED") return;
      if (!silent) {
        setError(
          err?.response?.status === 404 ? "Proposal not found." :
          err?.response?.status === 403 ? "You do not have permission to view this proposal." :
          err?.response?.data?.message || "An error occurred."
        );
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [proposalId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchProposal(controller.signal);
    return () => controller.abort();
  }, [fetchProposal]);

  useEffect(() => {
    const fetchWalletBalance = async () => {
      setWalletLoading(true);

      try {
        const res = await axiosInstance.get("/wallets/balance");
        setWalletBalance(Number(res.data?.balance ?? 0));
      } catch {
        setWalletBalance(0);
      } finally {
        setWalletLoading(false);
      }
    };

    fetchWalletBalance();
  }, []);

  // Phát hiện contract dở dang (từ lần accept trước, lỡ rời trang chưa ký
  // xong) — chỉ để hiển thị nút "Continue to Contract", KHÔNG tự mở modal
  // hay auto-navigate ở đây nữa (toàn bộ logic ký chuyển sang trang riêng).
  useEffect(() => {
    const fetchExistingContract = async () => {
      try {
        const res = await axiosInstance.get(`/proposals/${proposalId}/contract`);
        const contract = res.data?.data ?? res.data ?? null;
        setContractCreated(contract);
      } catch (err) {
        if (err?.response?.status !== 404) {
          console.error(err);
        }
      } finally {
        setContractChecked(true);
      }
    };

    fetchExistingContract();
  }, [proposalId]);

  // ── Accept ────────────────────────────────────────────────────────
  const handleAccept = async () => {
  if (actionLoading === "accept") return;

  setShowAcceptModal(false);
  setActionLoading("accept");
  setAcceptError("");

    try {
      await axiosInstance.post(`/proposals/${proposalId}/decision?decision=ACCEPT`);

      const contractRes = await axiosInstance.post(
        `/contracts/from-proposal/${proposalId}`
      );

      const contract =
        contractRes.data?.data ?? contractRes.data;

      setContractCreated(contract);

      const refreshed = await axiosInstance.get(
        `/proposals/${proposalId}`
      );

      const refreshedData =
        refreshed.data?.data ?? refreshed.data;

      setProposal(
        Array.isArray(refreshedData)
          ? refreshedData[0] ?? null
          : refreshedData
      );

      // Luôn chuyển sang trang ký hợp đồng.
      // Trang ký sẽ hiển thị đúng phí BE vừa tính và kiểm tra số dư ví.
      navigate(`/client/proposals/${proposalId}/contract`, {
        replace: true,
        state: {
          contract,
        },
      });

      return;
      // Không đủ tiền → ở lại trang này, banner "Continue to Contract" bên
      // dưới sẽ hiện ra (vì contractCreated đã có giá trị), user tự bấm
      // vào đó khi đã nạp đủ tiền.
    } catch (err) {
      setAcceptError(err?.response?.data?.message || err?.message || "Accept proposal failed.");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Decline ───────────────────────────────────────────────────────
  const handleDecline = async () => {
    setShowDeclineModal(false);
    setActionLoading("decline");
    setAcceptError("");

    try {
      await axiosInstance.post(`/proposals/${proposalId}/decision?decision=REJECT`);

      setProposal((prev) => ({ ...prev, status: "REJECTED" }));

      navigate(`/client/jobs/${proposal.jobId}`, {
        state: {
          proposalDeclined: true,
        },
      });
    } catch (err) {
      setAcceptError(err?.response?.data?.message || "Decline proposal failed.");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────
  if (loading) return (
    <ClientLayout>
      <div style={{ minHeight: "100vh", background: "#0b0e14", textAlign: "center", paddingTop: "120px", color: "#8c90a0" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 16, animation: "spin 1s linear infinite", color: "#00F0FF" }}>autorenew</span>
        Loading proposal...
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </ClientLayout>
  );

  if (error) return (
    <ClientLayout>
      <div style={{ minHeight: "100vh", background: "#0b0e14", textAlign: "center", paddingTop: "120px", paddingLeft: 24, paddingRight: 24 }}>
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
  const proposedPrice = Number(proposal.proposedPrice || proposal.bidAmount || 0);

  const acceptDisabled = isProcessing;

  const { bothSigned } = readContractSignState(contractCreated);
  const isCancelled = (contractCreated?.status || "").toUpperCase() === "CANCELLED";
  const isProjectActive = bothSigned && !!contractCreated?.projectEscrowLockedAt;

  // Có contract (bất kể trạng thái) và chưa tới bước project active
  // → hiện nút để quay lại đúng trang ký hợp đồng.
  const showContinueToContract = !!contractCreated && !isProjectActive;

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
          Back
        </button>

        {/* Header */}
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <img src={proposal.expertAvatarUrl || proposal.avatarUrl || "/default-avatar.png"}
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

            {isPending && (
              <div
                style={{
                  marginTop: 14,
                  fontSize: 12,
                  color: "#facc15",
                }}
              >
                Wallet balance: $
                {walletLoading
                  ? "Loading..."
                  : Number(walletBalance ?? 0).toLocaleString()}
                {" — "}
                money in wallet
              </div>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
              <button onClick={() => setShowMessage(true)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "rgba(192,193,255,0.08)", color: "#c0c1ff", border: "1px solid rgba(192,193,255,0.25)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(192,193,255,0.18)"; e.currentTarget.style.borderColor = "#c0c1ff"; e.currentTarget.style.boxShadow = "0 0 12px rgba(192,193,255,0.2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(192,193,255,0.08)"; e.currentTarget.style.borderColor = "rgba(192,193,255,0.25)"; e.currentTarget.style.boxShadow = "none"; }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chat</span>
                Message
              </button>

              {isPending && (
                <>
                  <button onClick={() => setShowDeclineModal(true)} disabled={isProcessing}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: isProcessing ? "not-allowed" : "pointer", opacity: isProcessing ? 0.6 : 1, transition: "all 0.2s" }}
                    onMouseEnter={(e) => { if (!isProcessing) e.currentTarget.style.background = "rgba(248,113,113,0.15)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.08)"; }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{isDeclining ? "hourglass_empty" : "close"}</span>
                    {isDeclining ? "Declining..." : "Decline"}
                  </button>

                  <button
                      onClick={() => setShowAcceptModal(true)}
                      disabled={acceptDisabled}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "10px 20px",
                        background: acceptDisabled
                          ? "rgba(34,197,94,0.08)"
                          : "#22c55e",
                        color: acceptDisabled
                          ? "#22c55e"
                          : "#002022",
                        border: "1px solid rgba(34,197,94,0.5)",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: acceptDisabled
                          ? "not-allowed"
                          : "pointer",
                        opacity: acceptDisabled ? 0.6 : 1,
                        boxShadow: acceptDisabled
                          ? "none"
                          : "0 0 16px rgba(34,197,94,0.3)",
                        transition: "all 0.2s",
                      }}
                    >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      {isAccepting ? "hourglass_empty" : "check_circle"}
                    </span>
                    {isAccepting ? "Accepting..." : "Accept Proposal"}
                  </button>
                </>
              )}
            </div>
          </div>

          {acceptError && (
            <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: 13 }}>
              {acceptError}
            </div>
          )}
        </div>

        {/* Contract status — thay cho card "Contract Preview" cũ */}
        {contractChecked && contractCreated && (
          <div style={{ ...cardStyle, marginBottom: 24, border: `1px solid ${isCancelled ? "rgba(239,68,68,0.25)" : isProjectActive ? "rgba(34,197,94,0.25)" : "rgba(0,240,255,0.25)"}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: isCancelled ? "#f87171" : isProjectActive ? "#22c55e" : "#00F0FF" }}>
                {isCancelled ? "error_outline" : isProjectActive ? "verified" : "description"}
              </span>
              <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: isCancelled ? "#f87171" : isProjectActive ? "#22c55e" : "#00F0FF", margin: 0 }}>
                {isCancelled ? "Contract Expired" : isProjectActive ? "Project Active" : "Contract In Progress"}
              </h3>
            </div>

            <p style={{ fontSize: 13, color: "#8c90a0", margin: "0 0 16px" }}>
              {isCancelled
                ? "The signing deadline expired and the contract was cancelled."
                : isProjectActive
                ? "Both sides signed and escrow is locked."
                : "You have a contract awaiting your signature or the expert's."}
            </p>

            {showContinueToContract && (
              <button onClick={() => navigate(`/client/proposals/${proposalId}/contract`)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 20px", background: isCancelled ? "rgba(239,68,68,0.1)" : "#00F0FF", color: isCancelled ? "#f87171" : "#002022", border: isCancelled ? "1px solid rgba(239,68,68,0.3)" : "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                {isCancelled ? "View Contract" : "Continue to Contract"}
              </button>
            )}

            {isProjectActive && (
              <button onClick={() => navigate(`/client/projects/${contractCreated.projectId}`)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 20px", background: "#22c55e", color: "#002022", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                Go to Project
              </button>
            )}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          <div style={cardStyle}>
            <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              Cover Letter
            </h3>
            <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.9, whiteSpace: "pre-line", margin: 0 }}>
              {proposal.coverLetter || "—"}
            </p>
          </div>

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

          {proposal.milestones?.length > 0 && (
            <div style={{ ...cardStyle, border: "1px solid rgba(192,193,255,0.15)", background: "rgba(192,193,255,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(192,193,255,0.1)" }}>
                <span className="material-symbols-outlined" style={{ color: "#c0c1ff", fontSize: 18 }}>timeline</span>
                <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#c0c1ff", margin: 0 }}>
                  Milestone Drafts
                </h3>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {proposal.milestones.map((m, index) => (
                  <div
                    key={m.proposalMilestoneDraftId ?? index}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto",
                      gap: 16,
                      alignItems: "center",
                      padding: 16,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div>
                      <p style={{ color: "#e1e2eb", fontWeight: 700, margin: "0 0 4px" }}>
                        {index + 1}. {m.title}
                      </p>
                      <p style={{ color: "#8c90a0", fontSize: 13, margin: 0 }}>
                        Duration: {m.durationDays} days
                      </p>
                    </div>

                    <span style={{ color: "#00F0FF", fontWeight: 800, fontFamily: "JetBrains Mono, monospace" }}>
                      ${Number(m.amount || 0).toLocaleString()}
                    </span>

                    <span style={{ color: "#8c90a0", fontSize: 12 }}>
                      Draft
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
        <MessageModal
          proposal={proposal}
          onClose={() => setShowMessage(false)}
          navigate={navigate}
        />
      )}

      {showDeclineModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 px-4">
          <div className="w-full max-w-[440px] rounded-2xl border border-red-400/25 bg-[#0b1220] p-6 shadow-2xl shadow-red-500/10">
            <div className="mb-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-[28px] text-red-400">
                warning
              </span>

              <h2 className="m-0 text-xl font-bold text-red-400">
                Decline Proposal
              </h2>
            </div>

            <p className="mb-6 leading-relaxed text-slate-300">
              Do you want to decline this proposal?
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeclineModal(false)}
                disabled={isDeclining}
                className="rounded-lg border border-white/15 px-5 py-2.5 font-semibold text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                No
              </button>

              <button
                type="button"
                onClick={handleDecline}
                disabled={isDeclining}
                className="rounded-lg bg-red-500 px-5 py-2.5 font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeclining ? "Declining..." : "Yes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAcceptModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 px-4">
          <div className="w-full max-w-[520px] rounded-2xl border border-cyan-400/25 bg-[#0b1220] p-6 shadow-2xl shadow-cyan-500/10">
            <h2 className="mb-3 text-2xl font-bold text-cyan-400">
              Create Contract
            </h2>

            <p className="mb-5 leading-relaxed text-slate-300">
              Do you want to accept this proposal and create a contract with{" "}
              <span className="font-bold text-white">{expertName}</span>?
            </p>

            <div className="mb-5 rounded-xl bg-white/5 p-4">
              <div className="mb-2 text-white">
                Price: ${proposedPrice.toLocaleString()}
              </div>

              <div className="mb-3 text-white">
                Timeline: {proposal.proposedTimelineDays || proposal.estimatedDays} days
              </div>

              <div className="mt-3 text-sm text-slate-400">
                Current wallet balance: $
                {walletLoading
                  ? "Loading..."
                  : Number(walletBalance ?? 0).toLocaleString()}
              </div>

            </div>

          

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAcceptModal(false)}
                className="rounded-lg border border-white/15 px-5 py-2.5 text-slate-300 transition hover:bg-white/5"
              >
                Cancel
              </button>

              <button
                onClick={handleAccept}
                disabled={isAccepting}
                className="rounded-lg bg-green-500 px-5 py-2.5 font-bold text-white transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAccepting ? "Creating..." : "Create Contract"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      `}</style>
    </ClientLayout>
  );
}