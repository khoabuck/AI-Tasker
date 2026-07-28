// src/modules/client/pages/ClientProposalDetailPage.jsx
//
// GET  /api/proposals/{proposalId}
// GET  /api/contracts/{contractId}
// POST /api/proposals/{proposalId}/decision?decision=ACCEPT|REJECT
// POST /api/proposals/{proposalId}/decline-accepted-deal
// POST /api/contracts/from-proposal/{proposalId}
// POST /api/conversations
// POST /api/conversations/{conversationId}/messages
//
// Luồng mới:
// 1. Accept Proposal chỉ chuyển Proposal sang ACCEPTED.
// 2. Accept Proposal không tự tạo Contract.
// 3. Client chủ động bấm Create Contract.
// 4. Contract CANCELLED có thể được tạo lại.
// 5. Contract DRAFT được tiếp tục tại ClientContractSignPage.
// 6. Backend tự tạo Project và lock Escrow khi hai bên ký đủ.

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

const PROPOSAL_STATUS = {
  SUBMITTED: { label: "Submitted", color: "#facc15" },
  PENDING:   { label: "Pending",   color: "#facc15" },
  ACCEPTED:  { label: "Accepted",  color: "#22c55e" },
  REJECTED:  { label: "Rejected",  color: "#ef4444" },
  WITHDRAWN: { label: "Withdrawn", color: "#8c90a0" },
  COUNTERED: { label: "Countered", color: "#c0c1ff" },
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
    <div
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          maxWidth: "100vw",
          minWidth: 0,
          boxSizing: "border-box",
          overflowX: "hidden",

          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 480,
            minWidth: 0,
            boxSizing: "border-box",
            overflowX: "hidden",

            background: "rgba(16,19,25,0.98)",
            border: "1px solid rgba(192,193,255,0.25)",
            borderRadius: 16,
            padding: 28,
            boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
          }}
        >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              minWidth: 0,
              flex: 1,
            }}
          >
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

  const [actionLoading, setActionLoading] = useState(null);
  // "accept" | "decline" | "createContract" | "declineAccepted"

  const [showMessage, setShowMessage] = useState(false);

  const [contract, setContract] = useState(null);
  const [contractChecked, setContractChecked] = useState(false);
  const [contractError, setContractError] = useState("");

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);

  // Modal riêng cho proposal đã ACCEPTED.
  // Dùng API /decline-accepted-deal để bỏ expert đã chọn và reopen job.
  const [showDeclineAcceptedModal, setShowDeclineAcceptedModal] =
    useState(false);
  const [declineAcceptedReason, setDeclineAcceptedReason] =
    useState("");
  const [declineAcceptedError, setDeclineAcceptedError] =
    useState("");

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
    if (!proposal) {
      setContract(null);
      setContractChecked(false);
      setContractError("");
      return;
    }

    const contractId = proposal?.contractId ?? null;

    /*
    * ACCEPTED nhưng contractId = null là trạng thái hợp lệ:
    * Proposal đã được chọn nhưng Client chưa tạo Contract.
    */
    if (!contractId) {
      setContract(null);
      setContractChecked(true);
      setContractError("");
      return;
    }

    const controller = new AbortController();

    const fetchContract = async () => {
      setContractChecked(false);
      setContractError("");

      try {
        const response = await axiosInstance.get(
          `/contracts/${contractId}`,
          {
            signal: controller.signal,
          }
        );

        const contractData =
          response.data?.data ??
          response.data ??
          null;

        setContract(contractData);
      } catch (err) {
        if (
          err?.code === "ERR_CANCELED" ||
          err?.name === "CanceledError"
        ) {
          return;
        }

        if (err?.response?.status === 404) {
          setContract(null);
          return;
        }

        setContractError(
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load contract."
        );
      } finally {
        if (!controller.signal.aborted) {
          setContractChecked(true);
        }
      }
    };

    fetchContract();

    return () => controller.abort();
  }, [proposal]);

  // ── Accept ────────────────────────────────────────────────────────
  const handleAccept = async () => {
    if (actionLoading) return;

    setShowAcceptModal(false);
    setActionLoading("accept");
    setAcceptError("");

    try {
      const response = await axiosInstance.post(
        `/proposals/${proposalId}/decision?decision=ACCEPT`
      );

      const acceptedProposal =
        response.data?.data ??
        response.data ??
        null;

      if (!acceptedProposal?.proposalId) {
        throw new Error(
          response.data?.message ||
          "Accepted proposal data was not returned by API."
        );
      }

      /*
      * Chỉ cập nhật Proposal.
      * Không tạo Contract.
      * Không chuyển sang trang ký.
      */
      setProposal(acceptedProposal);
      setContract(null);
      setContractChecked(true);
    } catch (err) {
      setAcceptError(
        err?.response?.data?.message ||
        err?.message ||
        "Accept proposal failed."
      );
    } finally {
      setActionLoading(null);
    }
  };


  const handleCreateContract = async () => {
    if (actionLoading) return;

    const proposalStatus = String(
      proposal?.status ?? ""
    )
      .trim()
      .toUpperCase();

    if (proposalStatus !== "ACCEPTED") {
      setAcceptError(
        "Only an accepted proposal can be used to create a contract."
      );
      return;
    }

    setActionLoading("createContract");
    setAcceptError("");
    setContractError("");

    try {
      const response = await axiosInstance.post(
        `/contracts/from-proposal/${proposalId}`
      );

      const createdContract =
        response.data?.data ??
        response.data ??
        null;

      if (!createdContract?.contractId) {
        throw new Error(
          response.data?.message ||
          "Contract ID was not returned by API."
        );
      }

      /*
      * Dùng đúng Contract mới Backend trả về.
      * Trường hợp Create Contract Again sẽ nhận contractId mới.
      */
      setContract(createdContract);

      setProposal((prev) =>
        prev
          ? {
              ...prev,
              contractId: createdContract.contractId,
            }
          : prev
      );

      navigate(`/client/proposals/${proposalId}/contract`, {
        state: {
          contract: createdContract,
        },
      });
    } catch (err) {
      setAcceptError(
        err?.response?.data?.message ||
        err?.message ||
        "Create contract failed."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ── Decline ───────────────────────────────────────────────────────
  const handleDecline = async () => {
    if (actionLoading) return;
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

  // ── Decline Accepted Deal ───────────────────────────────────────────
  // Dùng khi Proposal đã ACCEPTED nhưng Client không muốn tiếp tục với Expert này.
  // BE sẽ chuyển proposal sang REJECTED và reopen job.
  const handleDeclineAcceptedDeal = async () => {
    if (actionLoading) return;

    const trimmedReason = declineAcceptedReason.trim();

    if (!trimmedReason) {
      setDeclineAcceptedError("Decline reason is required.");
      return;
    }

    setActionLoading("declineAccepted");
    setDeclineAcceptedError("");
    setAcceptError("");

    try {
      const response = await axiosInstance.post(
        `/proposals/${proposalId}/decline-accepted-deal`,
        {
          reason: trimmedReason,
        }
      );

      const declinedProposal =
        response.data?.data ??
        response.data ??
        null;

      // BE đã test trả status REJECTED.
      // Cập nhật local state để tránh UI còn giữ ACCEPTED.
      if (declinedProposal?.proposalId) {
        setProposal(declinedProposal);
      } else {
        setProposal((prev) =>
          prev
            ? {
                ...prev,
                status: "REJECTED",
              }
            : prev
        );
      }

      setContract(null);
      setShowDeclineAcceptedModal(false);
      setDeclineAcceptedReason("");

      // Báo các trang list refresh lại job/proposal.
      window.dispatchEvent(new Event("jobs:refresh"));
      window.dispatchEvent(new Event("projects:refresh"));

      // BE trả "The job was reopened" nên quay về tab OPEN.
      navigate("/client/jobs?status=OPEN", {
        replace: true,
        state: {
          acceptedDealDeclined: true,
          jobId:
            declinedProposal?.jobId ??
            proposal?.jobId ??
            null,
        },
      });
    } catch (err) {
      setDeclineAcceptedError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Decline accepted deal failed."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────
  if (loading && !proposal) {
  return (
    <ClientLayout>
      <div
        style={{
          width: "100%",
          maxWidth: 860,
          minWidth: 0,
          minHeight: "calc(100vh - 96px)",
          margin: "0 auto",
          padding: "40px 24px",
          boxSizing: "border-box",
          background: "#0b0e14",
          color: "#8c90a0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflowX: "clip",
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

        Loading proposal...

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

  if (error) {
  return (
    <ClientLayout>
      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          minHeight: "calc(100vh - 96px)",
          boxSizing: "border-box",
          overflowX: "hidden",
          background: "#0b0e14",
          textAlign: "center",
          padding: "120px 24px 40px",
        }}
      >
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
}

  if (!proposal) return null;

  const proposalStatus = String(
    proposal?.status ?? ""
  )
    .trim()
    .toUpperCase();

  const contractStatus = String(
    contract?.status ?? ""
  )
    .trim()
    .toUpperCase();

  const projectStatus = String(
    contract?.projectStatus ?? ""
  )
    .trim()
    .toUpperCase();

  const pStatus =
    PROPOSAL_STATUS[proposalStatus] ||
    PROPOSAL_STATUS.SUBMITTED;

  const isPending =
    proposalStatus === "SUBMITTED" ||
    proposalStatus === "PENDING";

  const isAccepted =
    proposalStatus === "ACCEPTED";

  const isAccepting =
    actionLoading === "accept";

  const isDeclining =
    actionLoading === "decline";

  const isCreatingContract =
    actionLoading === "createContract";

  const isDecliningAccepted =
    actionLoading === "declineAccepted";

  const isProcessing =
    Boolean(actionLoading);

  const expertName =
    proposal.expertName ||
    proposal.fullName ||
    "Expert";

  const proposedPrice = Number(
    proposal.proposedPrice ||
    proposal.bidAmount ||
    0
  );

  const acceptDisabled = isProcessing;

  const canCreateContract =
    isAccepted &&
    !proposal?.contractId;

  const canContinueContract =
    isAccepted &&
    contractStatus === "DRAFT";

  const canCreateContractAgain =
    isAccepted &&
    contractStatus === "CANCELLED";

  // Chỉ hiện Decline Proposal khi deal đã accepted nhưng chưa có contract
  // hoặc contract draft đã bị cancel/expired.
  // Nếu contract còn DRAFT đang chờ ký thì xử lý ở trang Contract riêng.
  const canDeclineAcceptedDeal =
    canCreateContract ||
    canCreateContractAgain;

  const isProjectActive =
    contractStatus === "CONFIRMED" &&
    projectStatus === "ACTIVE" &&
    Boolean(contract?.projectId);

  const createdAt = proposal.createdAt
    ? new Date(proposal.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <ClientLayout>
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 860,
          minWidth: 0,
          margin: "0 auto",
          padding: "40px 24px",
          boxSizing: "border-box",
          overflowX: "clip",
        }}
      >

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

            <div
              style={{
                flex: "1 1 280px",
                minWidth: 0,
                maxWidth: "100%",
                overflowWrap: "anywhere",
              }}
            >
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
                    {formatCurrency(proposal.proposedPrice || proposal.bidAmount)}
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

          {/* Proposal ACCEPTED nhưng chưa tạo Contract */}
          {contractChecked && canCreateContract && (
            <div
              style={{
                ...cardStyle,
                marginBottom: 24,
                border: "1px solid rgba(34,197,94,0.3)",
                background: "rgba(34,197,94,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 21,
                    color: "#22c55e",
                  }}
                >
                  check_circle
                </span>

                <h3
                  style={{
                    margin: 0,
                    color: "#22c55e",
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  Proposal Accepted
                </h3>
              </div>

              <p
                style={{
                  margin: "0 0 16px",
                  color: "#c2c6d6",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                This proposal has been accepted. The contract has not been
                created yet.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={handleCreateContract}
                  disabled={isCreatingContract || isDecliningAccepted}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "11px 20px",
                    borderRadius: 8,
                    background: isCreatingContract
                      ? "rgba(0,240,255,0.08)"
                      : "#00F0FF",
                    color: isCreatingContract
                      ? "#00F0FF"
                      : "#002022",
                    border: "1px solid rgba(0,240,255,0.4)",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor:
                      isCreatingContract || isDecliningAccepted
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 17 }}
                  >
                    {isCreatingContract
                      ? "hourglass_empty"
                      : "description"}
                  </span>

                  {isCreatingContract
                    ? "Creating..."
                    : "Create Contract"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDeclineAcceptedReason("");
                    setDeclineAcceptedError("");
                    setShowDeclineAcceptedModal(true);
                  }}
                  disabled={isCreatingContract || isDecliningAccepted}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "11px 20px",
                    borderRadius: 8,
                    background: "rgba(239,68,68,0.08)",
                    color: "#f87171",
                    border: "1px solid rgba(239,68,68,0.3)",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor:
                      isCreatingContract || isDecliningAccepted
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      isCreatingContract || isDecliningAccepted
                        ? 0.6
                        : 1,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 17 }}
                  >
                    {isDecliningAccepted
                      ? "hourglass_empty"
                      : "close"}
                  </span>

                  {isDecliningAccepted
                    ? "Declining..."
                    : "Decline Proposal"}
                </button>
              </div>
            </div>
          )}

          {/* Contract DRAFT */}
          {contractChecked && canContinueContract && (
            <div
              style={{
                ...cardStyle,
                marginBottom: 24,
                border: "1px solid rgba(0,240,255,0.3)",
                background: "rgba(0,240,255,0.03)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 21,
                    color: "#00F0FF",
                  }}
                >
                  description
                </span>

                <h3
                  style={{
                    margin: 0,
                    color: "#00F0FF",
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  Contract Draft In Progress
                </h3>
              </div>

              <p
                style={{
                  margin: "0 0 16px",
                  color: "#c2c6d6",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                A contract draft exists and is waiting for the required
                signatures.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/client/proposals/${proposalId}/contract`
                  )
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "11px 20px",
                  borderRadius: 8,
                  background: "#00F0FF",
                  color: "#002022",
                  border: "none",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 17 }}
                >
                  arrow_forward
                </span>

                Continue to Contract
              </button>
            </div>
          )}

          {/* Contract cũ đã CANCELLED */}
          {contractChecked && canCreateContractAgain && (
            <div
              style={{
                ...cardStyle,
                marginBottom: 24,
                border: "1px solid rgba(250,204,21,0.3)",
                background: "rgba(250,204,21,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 21,
                    color: "#facc15",
                  }}
                >
                  history
                </span>

                <h3
                  style={{
                    margin: 0,
                    color: "#facc15",
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  Contract Draft Cancelled
                </h3>
              </div>

              <p
                style={{
                  margin: "0 0 16px",
                  color: "#c2c6d6",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                The previous contract draft was cancelled or expired. The
                accepted proposal is still valid.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={handleCreateContract}
                  disabled={isCreatingContract || isDecliningAccepted}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "11px 20px",
                    borderRadius: 8,
                    background: isCreatingContract
                      ? "rgba(250,204,21,0.08)"
                      : "#facc15",
                    color: isCreatingContract
                      ? "#facc15"
                      : "#292000",
                    border: "1px solid rgba(250,204,21,0.4)",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor:
                      isCreatingContract || isDecliningAccepted
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 17 }}
                  >
                    {isCreatingContract
                      ? "hourglass_empty"
                      : "refresh"}
                  </span>

                  {isCreatingContract
                    ? "Creating..."
                    : "Create Contract Again"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDeclineAcceptedReason("");
                    setDeclineAcceptedError("");
                    setShowDeclineAcceptedModal(true);
                  }}
                  disabled={isCreatingContract || isDecliningAccepted}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "11px 20px",
                    borderRadius: 8,
                    background: "rgba(239,68,68,0.08)",
                    color: "#f87171",
                    border: "1px solid rgba(239,68,68,0.3)",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor:
                      isCreatingContract || isDecliningAccepted
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      isCreatingContract || isDecliningAccepted
                        ? 0.6
                        : 1,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 17 }}
                  >
                    {isDecliningAccepted
                      ? "hourglass_empty"
                      : "close"}
                  </span>

                  {isDecliningAccepted
                    ? "Declining..."
                    : "Decline Proposal"}
                </button>
              </div>
            </div>
          )}

          {/* Contract CONFIRMED và Project ACTIVE */}
          {contractChecked && isProjectActive && (
            <div
              style={{
                ...cardStyle,
                marginBottom: 24,
                border: "1px solid rgba(34,197,94,0.3)",
                background: "rgba(34,197,94,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 21,
                    color: "#22c55e",
                  }}
                >
                  verified
                </span>

                <h3
                  style={{
                    margin: 0,
                    color: "#22c55e",
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  Project Active
                </h3>
              </div>

              <p
                style={{
                  margin: "0 0 16px",
                  color: "#c2c6d6",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                Both sides signed the contract. The project is active and
                escrow has been locked by the backend.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/client/projects/${contract.projectId}`
                  )
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "11px 20px",
                  borderRadius: 8,
                  background: "#22c55e",
                  color: "#002022",
                  border: "none",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 17 }}
                >
                  arrow_forward
                </span>

                Go to Project
              </button>
            </div>
          )}

          {/* Lỗi tải Contract */}
          {contractError && (
            <div
              style={{
                ...cardStyle,
                marginBottom: 24,
                border: "1px solid rgba(239,68,68,0.3)",
                background: "rgba(239,68,68,0.04)",
                color: "#f87171",
                fontSize: 13,
              }}
            >
              {contractError}
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
                      gridTemplateColumns: "minmax(0, 1fr) auto auto",
                      width: "100%",
                      maxWidth: "100%",
                      minWidth: 0,
                      gap: 16,
                      alignItems: "center",
                      padding: 16,
                      boxSizing: "border-box",
                      overflow: "hidden",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        minWidth: 0,
                        overflow: "hidden",
                      }}
                    >
                      <p
                        style={{
                          color: "#e1e2eb",
                          fontWeight: 700,
                          margin: "0 0 4px",
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                        }}
                      >
                        {index + 1}. {m.title}
                      </p>
                      <p style={{ color: "#8c90a0", fontSize: 13, margin: 0 }}>
                        Duration: {m.durationDays} days
                      </p>
                    </div>

                    <span style={{ color: "#00F0FF", fontWeight: 800, fontFamily: "JetBrains Mono, monospace" }}>
                      {formatCurrency(m.amount)}
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
                      {formatCurrency(proposal.counterPrice)}
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

      {showDeclineAcceptedModal && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 px-4">
        <div className="w-full max-w-[500px] rounded-2xl border border-red-400/25 bg-[#0b1220] p-6 shadow-2xl shadow-red-500/10">
          <div className="mb-4 flex items-center gap-3">
            <span className="material-symbols-outlined text-[28px] text-red-400">
              warning
            </span>

            <h2 className="m-0 text-xl font-bold text-red-400">
              Decline Accepted Proposal
            </h2>
          </div>

          <p className="mb-4 leading-relaxed text-slate-300">
            This will reject the accepted proposal from{" "}
            <span className="font-bold text-white">
              {expertName}
            </span>
            {" "}and reopen the job.
          </p>

          <label
            htmlFor="decline-accepted-reason"
            className="mb-2 block text-sm font-bold text-slate-300"
          >
            Reason
          </label>

          <textarea
            id="decline-accepted-reason"
            value={declineAcceptedReason}
            onChange={(event) => {
              setDeclineAcceptedReason(event.target.value);

              if (declineAcceptedError) {
                setDeclineAcceptedError("");
              }
            }}
            disabled={isDecliningAccepted}
            rows={4}
            maxLength={500}
            placeholder="Enter the reason for declining this accepted proposal..."
            className="mb-2 w-full resize-y rounded-lg border border-white/15 bg-white/5 px-3 py-3 text-sm text-slate-100 outline-none focus:border-red-400/60 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <div className="mb-3 text-right text-xs text-slate-500">
            {declineAcceptedReason.length}/500
          </div>

          {declineAcceptedError && (
            <div className="mb-4 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {declineAcceptedError}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                if (isDecliningAccepted) return;

                setShowDeclineAcceptedModal(false);
                setDeclineAcceptedReason("");
                setDeclineAcceptedError("");
              }}
              disabled={isDecliningAccepted}
              className="rounded-lg border border-white/15 px-5 py-2.5 font-semibold text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDeclineAcceptedDeal}
              disabled={
                isDecliningAccepted ||
                !declineAcceptedReason.trim()
              }
              className="rounded-lg bg-red-500 px-5 py-2.5 font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDecliningAccepted
                ? "Declining..."
                : "Decline Proposal"}
            </button>
          </div>
        </div>
      </div>
    )}

      {showAcceptModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 px-4">
          <div className="w-full max-w-[520px] rounded-2xl border border-green-400/25 bg-[#0b1220] p-6 shadow-2xl shadow-green-500/10">
            <h2 className="mb-3 text-2xl font-bold text-green-400">
              Accept Proposal
            </h2>

            <p className="mb-5 leading-relaxed text-slate-300">
              Do you want to accept this proposal from{" "}
              <span className="font-bold text-white">
                {expertName}
              </span>
              ?
            </p>

            <p className="mb-5 text-sm leading-relaxed text-slate-400">
              Accepting this proposal selects this expert. A contract will not
              be created until you click Create Contract afterward.
            </p>

            <div className="mb-5 rounded-xl bg-white/5 p-4">
              <div className="mb-2 text-white">
                Price: {formatCurrency(proposedPrice)}
              </div>

              <div className="mb-3 text-white">
                Timeline: {proposal.proposedTimelineDays || proposal.estimatedDays} days
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
                {isAccepting
                  ? "Accepting..."
                  : "Accept Proposal"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
  html,
  body,
  #root {
    width: 100%;
    max-width: 100%;
    margin: 0;
    overflow-x: hidden !important;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }
`}</style>
    </ClientLayout>
  );
}