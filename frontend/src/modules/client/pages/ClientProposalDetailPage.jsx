// src/modules/client/pages/ClientProposalDetailPage.jsx
// GET /api/proposals/{proposalId}
// POST /api/proposals/{proposalId}/decision  { decision: "ACCEPT" | "REJECT" }
// POST /api/messages { recipientId, content }

import { useState, useEffect, useCallback, useRef } from "react";
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
        conversationId = conv?.conversationId ?? conv?.id ?? conv?.conversationID;
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
  const [walletBalance, setWalletBalance] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [clientProfile, setClientProfile] = useState(null);
  const [contractCreated, setContractCreated] = useState(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showWaitingExpertModal, setShowWaitingExpertModal] = useState(false);

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
        setError("Proposal not found.");
        return;
      }

      setProposal(proposalData);
    } catch (err) {
      if (err?.code === "ERR_CANCELED") return;
      setError(
        err?.response?.status === 404 ? "Proposal not found." :
        err?.response?.status === 403 ? "You do not have permission to view this proposal." :
        err?.response?.data?.message || "An error occurred."
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

  useEffect(() => {
    const fetchClientProfile = async () => {
      try {
        const res = await axiosInstance.get("/client-profiles/me");

        const profile =
          res.data?.data ??
          res.data;

        setClientProfile(profile);
      } catch {
        setClientProfile(null);
      }
    };

    fetchClientProfile();
  }, []);

  useEffect(() => {
  const fetchWalletBalance = async () => {
    setWalletLoading(true);

    try {
      const res = await axiosInstance.get("/wallets/balance");

      const data = res.data?.data ?? res.data;

      setWalletBalance(
        Number(
          data?.balance ??
          data?.availableBalance ??
          data?.walletBalance ??
          0
        )
      );
    } catch (err) {
      console.error(err);
      setWalletBalance(0);
    } finally {
      setWalletLoading(false);
    }
  };

  fetchWalletBalance();
}, []);

  useEffect(() => {
    if (!showWaitingExpertModal) return;

    const intervalId = setInterval(() => {
      checkContractAndGoProject();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [showWaitingExpertModal, contractCreated]);

  // ── Accept ────────────────────────────────────────────────────────
  const handleAccept = async () => {
  setShowAcceptModal(false);

  setActionLoading("accept");

  try {
    await axiosInstance.post(
      `/proposals/${proposalId}/decision?decision=ACCEPT`
    );

    const contractRes = await axiosInstance.post(
      `/contracts/from-proposal/${proposalId}`
    );

    const contract = contractRes.data?.data ?? contractRes.data;

    setProposal((prev) => ({
      ...prev,
      status: "ACCEPTED",
    }));

    setContractCreated(contract);

  } catch (err) {
    alert(
      err?.response?.data?.message ||
      err?.message ||
      "Accept proposal failed."
    );
  } finally {
    setActionLoading(null);
  }
};

  const handleSignContract = async () => {
  const contractId =
    contractCreated?.contractId ??
    contractCreated?.id ??
    contractCreated?.projectContractId;

  if (!contractId) {
    alert("Contract not found.");
    return;
  }

  if (!hasEnoughWallet) {
    navigate("/client/wallet");
    return;
  }

  setActionLoading("sign");

  try {
    const confirmRes = await axiosInstance.post(
      `/contracts/${contractId}/confirm`
    );

    const confirmedContract = confirmRes.data?.data ?? confirmRes.data;
    setContractCreated(confirmedContract);

    const clientSigned =
      confirmedContract?.clientConfirmedAt ||
      confirmedContract?.clientSignedAt;

    const expertSigned =
      confirmedContract?.expertConfirmedAt ||
      confirmedContract?.expertSignedAt;

    const contractStatus = (confirmedContract?.status || "").toUpperCase();

    const isBothSigned =
      (clientSigned && expertSigned) ||
      ["ACCEPTED", "ACTIVE", "SIGNED", "CONFIRMED"].includes(contractStatus);

    if (isBothSigned) {
      try {
        await axiosInstance.post(`/projects/from-contract/${contractId}`);
      } catch (err) {
        const status = err?.response?.status;
        const message = err?.response?.data?.message || "";

        if (status !== 409 && !message.toLowerCase().includes("already")) {
          throw err;
        }
      }

      setShowWaitingExpertModal(false);
      navigate("/client/projects?status=ACTIVE");
      return;
    }

    setShowWaitingExpertModal(true);
  } catch (err) {
    alert(
      err?.response?.data?.message ||
      err?.message ||
      "Sign contract failed."
    );
  } finally {
    setActionLoading(null);
  }
};

const checkContractAndGoProject = async () => {
  const contractId =
    contractCreated?.contractId ??
    contractCreated?.id ??
    contractCreated?.projectContractId;

  if (!contractId) return;

  try {
    const res = await axiosInstance.get(`/contracts/${contractId}`);
    const contract = res.data?.data ?? res.data;

    const clientSigned =
      contract?.clientConfirmedAt ||
      contract?.clientSignedAt;

    const expertSigned =
      contract?.expertConfirmedAt ||
      contract?.expertSignedAt;

    const contractStatus = (contract?.status || "").toUpperCase();

    const isBothSigned =
      (clientSigned && expertSigned) ||
      ["ACCEPTED", "ACTIVE", "SIGNED", "CONFIRMED"].includes(contractStatus);

    if (!isBothSigned) return;

    try {
      await axiosInstance.post(`/projects/from-contract/${contractId}`);
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || "";

      if (status !== 409 && !message.toLowerCase().includes("already")) {
        throw err;
      }
    }

    setShowWaitingExpertModal(false);
    navigate("/client/projects?status=ACTIVE");
  } catch (err) {
    console.error("Check contract failed:", err);
  }
};



  // ── Decline ───────────────────────────────────────────────────────
  const handleDecline = async () => {
    if (!confirm("Decline this proposal?")) return;
    setActionLoading("decline");
    try {
      await axiosInstance.post(`/proposals/${proposalId}/decision?decision=REJECT`);
      setProposal((prev) => ({ ...prev, status: "REJECTED" }));
    } catch (err) {
      alert(err?.response?.data?.message || "Decline failed.");
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
  const isSigning = actionLoading === "sign";
  const isProcessing = isAccepting || isDeclining;
  const expertName = proposal.expertName || proposal.fullName || "Expert";
  const proposedPrice = Number(
    proposal.proposedPrice || proposal.bidAmount || 0
  );

  const platformFeeRate = Number(clientProfile?.platformFeeRate ?? 5);

  const requiredDeposit =
    proposedPrice * (1 + platformFeeRate / 100);

  const hasEnoughWallet =
    !walletLoading &&
    Number(walletBalance ?? 0) >= requiredDeposit;
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

            <div style={{ marginTop: 14, fontSize: 12, color: hasEnoughWallet ? "#22c55e" : "#facc15",}}>
                Wallet balance: ${Number(walletBalance ?? 0).toLocaleString()}
                {" — "}
                Required deposit: ${requiredDeposit.toFixed(2)}
                {" "}
                ({platformFeeRate}% platform fee)
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

                  <button
                    onClick={() => setShowAcceptModal(true)}
                    disabled={isProcessing}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "10px 20px",
                      background: isProcessing ? "rgba(34,197,94,0.08)" : "#22c55e",
                      color: isProcessing ? "#22c55e" : "#002022",
                      border: "1px solid rgba(34,197,94,0.5)",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: isProcessing ? "not-allowed" : "pointer",
                      opacity: isProcessing ? 0.6 : 1,
                      boxShadow: isProcessing ? "none" : "0 0 16px rgba(34,197,94,0.3)",
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

        {contractCreated && (
  <div style={{ ...cardStyle, marginBottom: 24, border: "1px solid rgba(0,240,255,0.25)" }}>
    <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 16, fontWeight: 700, color: "#00F0FF", marginBottom: 16 }}>
      Contract Preview
    </h3>

    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
      <p style={{ color: "#c2c6d6", fontSize: 14, margin: 0 }}>
        <strong>Expert:</strong> {expertName}
      </p>

      <p style={{ color: "#c2c6d6", fontSize: 14, margin: 0 }}>
        <strong>Proposal Price:</strong> ${proposedPrice.toLocaleString()}
      </p>

      <p style={{ color: "#c2c6d6", fontSize: 14, margin: 0 }}>
        <strong>Timeline:</strong> {proposal.proposedTimelineDays || proposal.estimatedDays} days
      </p>

      <p style={{ color: "#c2c6d6", fontSize: 14, margin: 0 }}>
        <strong>Status:</strong> {contractCreated.status || "DRAFT"}
      </p>
    </div>

    <div
      style={{
        marginBottom: 16,
        padding: "10px 12px",
        borderRadius: 8,
        background: hasEnoughWallet ? "rgba(34,197,94,0.08)" : "rgba(250,204,21,0.08)",
        border: `1px solid ${hasEnoughWallet ? "rgba(34,197,94,0.25)" : "rgba(250,204,21,0.25)"}`,
        color: hasEnoughWallet ? "#22c55e" : "#facc15",
        fontSize: 13,
      }}
    >
      Wallet balance: ${Number(walletBalance ?? 0).toLocaleString()}
      {" — "}
      Required: ${requiredDeposit.toFixed(2)}
      {" "}
      ({platformFeeRate}% platform fee)
    </div>

    {hasEnoughWallet ? (
      <button
        type="button"
        onClick={handleSignContract}
        disabled={isSigning}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "11px 20px",
          background: isSigning ? "rgba(0,240,255,0.08)" : "#00F0FF",
          color: isSigning ? "#00F0FF" : "#002022",
          border: "1px solid rgba(0,240,255,0.5)",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 700,
          cursor: isSigning ? "not-allowed" : "pointer",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
          {isSigning ? "hourglass_empty" : "draw"}
        </span>
        {isSigning ? "Signing..." : "Sign Contract"}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => navigate("/client/wallet")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "11px 20px",
          background: "rgba(250,204,21,0.12)",
          color: "#facc15",
          border: "1px solid rgba(250,204,21,0.35)",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
          account_balance_wallet
        </span>
        Deposit Wallet
      </button>
    )}
  </div>
)}
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

          {/* Milestone Drafts */}
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

          {/* Counter Offer — if present */}
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

                <div
                  className={`font-semibold ${
                    hasEnoughWallet ? "text-green-400" : "text-yellow-400"
                  }`}
                >
                  Required Deposit: ${requiredDeposit.toFixed(2)}
                  {" "}
                  ({platformFeeRate}% platform fee)
                </div>

              </div>

              {!hasEnoughWallet && (
                <div className="mb-5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-300">
                  Your wallet balance is insufficient. Please deposit funds before signing the contract.
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAcceptModal(false)}
                  className="rounded-lg border border-white/15 px-5 py-2.5 text-slate-300 transition hover:bg-white/5"
                >
                  Cancel
                </button>

                {hasEnoughWallet ? (
                  <button
                    onClick={handleAccept}
                    disabled={isAccepting}
                    className="rounded-lg bg-green-500 px-5 py-2.5 font-bold text-white transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isAccepting ? "Creating..." : "Create Contract"}
                  </button>
                ) : (
                  <button
                    onClick={() => navigate("/client/wallet")}
                    className="rounded-lg bg-yellow-400 px-5 py-2.5 font-bold text-[#1d1500] transition hover:bg-yellow-300"
                  >
                    Deposit Wallet
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {showWaitingExpertModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 px-4">
            <div className="w-full max-w-md rounded-2xl border border-cyan-400/20 bg-[#0b1220] p-6 shadow-2xl shadow-cyan-500/10">
              <h2 className="mb-3 text-center text-2xl font-bold text-white">
                Contract Signed Successfully
              </h2>

              <p className="mb-6 text-center leading-7 text-slate-300">
                You have signed the contract successfully.
                <br />
                Please wait for the AI Expert to sign it.
              </p>

              <div className="flex justify-center">
                <button
                  onClick={checkContractAndGoProject}
                  className="rounded-lg bg-cyan-400 px-8 py-3 font-bold text-white transition hover:brightness-110"
                >
                  Check Project Status
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