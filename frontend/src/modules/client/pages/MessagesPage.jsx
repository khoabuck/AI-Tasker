// src/modules/client/pages/MessagesPage.jsx
//
// GET  /api/conversations/me                       → list conversations
// GET  /api/conversations/{conversationId}/messages → lấy lịch sử chat
// POST /api/conversations/{conversationId}/messages { content, messageType, attachmentUrl }
//
// LƯU Ý: BE chưa có response mẫu thật (test trả "data": []). Dùng optional chaining +
// nhiều tên field dự phòng. Khi có response thật, kiểm tra lại field tên/avatar đối phương
// và field phân biệt "tin nhắn của tôi" trong messages[].

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ClientNavbar from "../../../components/layout/ClientNavbar";
import axiosInstance from "../../../api/axiosInstance";
import authService from "../../../services/auth.service";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatMessageTime(dateStr) {
  if (!dateStr) return "";

  const date = new Date(dateStr);

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// ── Proposal Review Modal — Client xem proposal, Accept hoặc Yêu cầu sửa ──
function ProposalReviewModal({ state, onClose, onRequestRevision }) {
  const [revisionNote, setRevisionNote] = useState("");
  const [showRevisionForm, setShowRevisionForm] = useState(false);

  const p = state.data;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "rgba(16,19,25,0.98)", border: "1px solid rgba(0,240,255,0.2)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 19, fontWeight: 700, color: "#e1e2eb", margin: 0 }}>
            {showRevisionForm ? "Request Revision" : "Review Proposal"}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8c90a0", cursor: "pointer" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        {state.loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#8c90a0" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 36, animation: "spin 1s linear infinite", color: "#00F0FF" }}>autorenew</span>
          </div>
        ) : state.error && !p ? (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "12px 16px", color: "#f87171", fontSize: 13 }}>
            {state.error}
          </div>
        ) : p ? (
          showRevisionForm ? (
            // ── Revision request form: keep existing proposal data and add notes only ──
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ fontSize: 13, color: "#8c90a0", margin: 0, lineHeight: 1.6 }}>
                The current proposal details will be sent with the message for the expert to compare.
                You only need to note what changes you want.
              </p>

              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 14, fontSize: 12, color: "#8c90a0", display: "flex", flexDirection: "column", gap: 4 }}>
                <span>Proposed Price: <span style={{ color: "#00F0FF" }}>${p.proposedPrice?.toLocaleString() ?? "—"}</span></span>
                <span>Timeline: <span style={{ color: "#e1e2eb" }}>{p.proposedTimelineDays ?? "—"} days</span></span>
              </div>

              <div>
                <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", marginBottom: 8 }}>
                  Revision notes (e.g. lower price, shorten timeline, add outputs...)
                </label>
                <textarea value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)}
                  placeholder="Example: The price is a bit high, please lower it to $450 and shorten the timeline to 45 days..."
                  rows={4}
                  style={{ width: "100%", background: "#1d2026", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "12px 14px", color: "#e1e2eb", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 14, resize: "none", boxSizing: "border-box" }} />
              </div>

              {state.error && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13 }}>{state.error}</div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowRevisionForm(false)}
                  style={{ flex: 1, padding: "12px", background: "transparent", color: "#c2c6d6", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>
                  Back
                </button>
                <button onClick={() => onRequestRevision(revisionNote)} disabled={state.requestingRevision}
                  style={{ flex: 2, padding: "12px", background: state.requestingRevision ? "#1d2026" : "#facc15", color: "#1d1500", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: state.requestingRevision ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {state.requestingRevision
                    ? <><span className="material-symbols-outlined" style={{ fontSize: 16, animation: "spin 1s linear infinite" }}>autorenew</span>Sending...</>
                    : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span>Send revision request</>}
                </button>
              </div>
            </div>
          ) : (
            // ── Hiện proposal đầy đủ để review ──
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div>
                  <span style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", marginBottom: 6 }}>Proposed Price</span>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 700, color: "#00F0FF" }}>${p.proposedPrice?.toLocaleString() ?? "—"}</div>
                </div>
                <div>
                  <span style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", marginBottom: 6 }}>Timeline</span>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 700, color: "#e1e2eb" }}>{p.proposedTimelineDays ?? "—"} <span style={{ fontSize: 13, fontWeight: 400, color: "#8c90a0" }}>days</span></div>
                </div>
              </div>

              {p.coverLetter && (
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#e1e2eb", marginBottom: 6 }}>Cover Letter</p>
                  <p style={{ fontSize: 13, color: "#c2c6d6", lineHeight: 1.7, margin: 0, whiteSpace: "pre-line" }}>{p.coverLetter}</p>
                </div>
              )}
              {p.expectedOutputs && (
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#e1e2eb", marginBottom: 6 }}>Expected Outputs</p>
                  <p style={{ fontSize: 13, color: "#c2c6d6", lineHeight: 1.7, margin: 0, whiteSpace: "pre-line" }}>{p.expectedOutputs}</p>
                </div>
              )}
              {p.workingApproach && (
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#e1e2eb", marginBottom: 6 }}>Working Approach</p>
                  <p style={{ fontSize: 13, color: "#c2c6d6", lineHeight: 1.7, margin: 0, whiteSpace: "pre-line" }}>{p.workingApproach}</p>
                </div>
              )}
              {p.preliminaryMilestonePlan && (
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#c0c1ff", marginBottom: 6 }}>Preliminary Milestone Plan</p>
                  <p style={{ fontSize: 13, color: "#c2c6d6", lineHeight: 1.7, margin: 0, whiteSpace: "pre-line" }}>{p.preliminaryMilestonePlan}</p>
                </div>
              )}

              {state.error && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13 }}>{state.error}</div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowRevisionForm(true)}
                  style={{ flex: 1, padding: "12px", background: "rgba(250,204,21,0.08)", color: "#facc15", border: "1px solid rgba(250,204,21,0.25)", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit_note</span>
                  Yêu cầu sửa
                </button>
                
              </div>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const initialConvId = conversationId;
  const currentUser = authService.getCurrentUser();
  const currentUserId = currentUser?.userId ?? currentUser?.id;

  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState("");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [proposalModal, setProposalModal] = useState(null); // { loading, error, data, accepting, requestingRevision }
  const [openConversationMenu, setOpenConversationMenu] = useState(null);

  // Pin/Delete chưa có API thật từ BE (không có trong danh sách endpoint) — lưu tạm
  // vào localStorage để giữ trạng thái qua reload. Khi BE bổ sung API, thay 2 phần này
  // bằng gọi API thật (PATCH /conversations/{id}/pin, DELETE /conversations/{id}).
  const [pinnedIds, setPinnedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("pinnedConversationIds") || "[]");
    } catch { return []; }
  });
  const [deletedIds, setDeletedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("deletedConversationIds") || "[]");
    } catch { return []; }
  });

  const scrollRef = useRef(null);
  const pollRef = useRef(null);

  // ── Load conversations ───────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/conversations/me");
      console.log("CURRENT USER", currentUser);
      console.log("CONVERSATIONS RESPONSE", res.data);
      const raw = res.data?.data ?? res.data;
      const list = Array.isArray(raw) ? raw : raw?.items ?? [];

      // Chuẩn hoá field về shape UI đang dùng (id, name, avatar, online, lastMessage, time, unread)
      const normalized = list
        .map((c) => {
          const convId = c.conversationId ?? c.id ?? c.conversationID;

          return {
            id: convId,
            name: c.expertName || c.otherPartyName || c.clientName || "Expert",
            avatar:
              c.expertAvatarUrl ||
              c.otherPartyAvatarUrl ||
              `https://i.pravatar.cc/100?u=${c.expertUserId ?? c.expertProfileId ?? convId}`,
            online: c.isOtherPartyOnline ?? false,
            lastMessage: c.lastMessage?.content || c.lastMessageContent || "Start conversation",
            time: timeAgo(c.lastMessage?.createdAt || c.lastMessageAt || c.updatedAt || c.createdAt),
            unread: c.unreadCount || 0,
            relatedProposalId: c.relatedProposalId,
            relatedJobId: c.relatedJobId,
            relatedJobTitle: c.relatedJobTitle,
            pinned: pinnedIds.includes(convId),
            raw: c,
          };
        })
        .filter((c) => c.id != null)
        //.filter((c) => !deletedIds.includes(c.id))
        // Pin gần nhất lên đầu tiên (pinnedIds[0] mới nhất → vị trí 1, pinnedIds[1] → vị trí 2...),
        // các conversation chưa pin giữ nguyên thứ tự BE trả về.
        .sort((a, b) => {
          if (a.pinned && b.pinned) return pinnedIds.indexOf(a.id) - pinnedIds.indexOf(b.id);
          if (a.pinned) return -1;
          if (b.pinned) return 1;
          return 0;
        });

      setConversations(normalized);

      if (normalized.length > 0) {
      const target = initialConvId
        ? normalized.find((c) => String(c.id) === String(initialConvId))
        : normalized[0];

      setActiveChat(target ?? normalized[0]);
    } else {
      setActiveChat(null);
    }
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load conversations.");
    } finally {
      setLoadingList(false);
    }
  }, [initialConvId, pinnedIds, deletedIds]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // ── Load messages khi chọn conversation ──────────────────────────
  const fetchMessages = useCallback(async (convId, silent = false) => {
    if (!convId) return;
    if (!silent) setLoadingMessages(true);
    try {
      const res = await axiosInstance.get(`/conversations/${convId}/messages`);
      const raw = res.data?.data ?? res.data;
      const list = Array.isArray(raw) ? raw : raw?.items ?? [];

      const normalized = list.map((m) => {
      const senderId = m.senderUserId ?? m.senderId ?? m.userId;

      const isMe =
        currentUserId != null && senderId != null
          ? String(senderId) === String(currentUserId)
          : (m.isMine ?? m.senderType === "CLIENT" ?? false);

      return {
        id: m.messageId ?? m.id,
        text: m.content,
        isMe,
        time: formatMessageTime(m.createdAt),
        avatar: m.senderAvatarUrl,
      };
    });

      setMessages(normalized);
    } catch (err) {
      if (!silent) setError(err?.response?.data?.message || "Unable to load messages.");
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (!activeChat?.id) return;
    fetchMessages(activeChat.id);

    pollRef.current = setInterval(() => fetchMessages(activeChat.id, true), 5000);
    return () => clearInterval(pollRef.current);
  }, [activeChat?.id, fetchMessages]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Gửi tin nhắn ──────────────────────────────────────────────────
  const handleSend = async () => {
    const content = input.trim();
    if (!content || !activeChat?.id) return;

    setInput("");
    // Optimistic UI: hiện tin nhắn ngay, rollback nếu lỗi
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        text: content,
        isMe: true,
        time: formatMessageTime(new Date()),
      },
    ]);

    try {
      await axiosInstance.post(`/conversations/${activeChat.id}/messages`, {
        content,
        messageType: "TEXT",
        attachmentUrl: null,
      });
      await fetchMessages(activeChat.id, true);
    } catch (err) {
      setError(err?.response?.data?.message || "Send message failed.");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(content);
    }
  };

  const handleUploadFile = async (file, type) => {
    if (!file || !activeChat?.id) return;

    if (type === "FILE") {
      // There is no regular file upload endpoint in the API list — only /api/uploads/images for images.
      setError("Uploading attachments (non-image) is not supported. Please ask backend to add a file upload endpoint.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axiosInstance.post("/uploads/images", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data?.url ?? res.data?.data?.url ?? res.data;

      await axiosInstance.post(`/conversations/${activeChat.id}/messages`, {
        content: "[Image]",
        messageType: "IMAGE",
        attachmentUrl: url,
      });
      await fetchMessages(activeChat.id, true);
    } catch (err) {
      setError(err?.response?.data?.message || "Image upload failed.");
    }
  };

  // MOCK/TẠM: cho hiện nút "Review Proposal" khi có relatedJobId (chưa cần relatedProposalId có sẵn).
  // Khi bấm, sẽ tự tìm proposalId đã ACCEPT/SUBMITTED của expert này trong job đó, hiện proposal
  // để client review trước, KHÔNG tạo contract ngay — chỉ tạo contract khi client bấm Accept.
  const canReviewProposal = activeChat?.relatedProposalId || activeChat?.relatedJobId;

  const handleReviewProposal = async () => {
    setShowAttachMenu(false);
    if (!activeChat) return;

    setProposalModal({ loading: true, error: "", data: null });

    try {
      let proposalId = activeChat.relatedProposalId;

      // MOCK: chưa có proposalId sẵn → tự tìm qua job proposals
      if (!proposalId && activeChat.relatedJobId) {
        const propRes = await axiosInstance.get(`/jobs/${activeChat.relatedJobId}/proposals`);
        const propRaw = propRes.data?.data ?? propRes.data;
        const proposals = Array.isArray(propRaw) ? propRaw : propRaw?.items ?? [];

        // QUAN TRỌNG: 1 job có thể nhận proposal từ nhiều expert khác nhau, nhưng chỉ
        // được accept đúng 1. Phải lọc đúng proposal của expert trong conversation này
        // (so theo expertUserId), KHÔNG fallback lấy proposals[0] — tránh lấy nhầm
        // proposal của 1 expert khác đã gửi cho cùng job.
        const expertUserId = activeChat.raw?.expertUserId;
        const target = expertUserId != null
          ? proposals.find((p) => p.expertUserId === expertUserId)
          : null;

        if (!target) {
          setProposalModal({ loading: false, error: "No proposal found for this expert on the related job.", data: null });
          return;
        }
        proposalId = target.proposalId;
      }

      if (!proposalId) {
        setProposalModal({ loading: false, error: "Linked proposal not found.", data: null });
        return;
      }

      const res = await axiosInstance.get(`/proposals/${proposalId}`);
      let proposalData = res.data?.data ?? res.data;
      if (Array.isArray(proposalData)) proposalData = proposalData[0] ?? null;

      if (!proposalData) {
        setProposalModal({ loading: false, error: "Proposal not found.", data: null });
        return;
      }

      setProposalModal({ loading: false, error: "", data: proposalData });
    } catch (err) {
      setProposalModal({ loading: false, error: err?.response?.data?.message || "Unable to load proposal. Please try again.", data: null });
    }
  };


  // Client gửi yêu cầu sửa — gửi message kèm toàn bộ nội dung proposal hiện tại làm tham chiếu,
  // KHÔNG gọi resubmit (resubmit là việc của expert tự làm sau khi đọc feedback này).
  const handleRequestRevision = async (feedbackText) => {
    if (!proposalModal?.data || !activeChat?.id) return;
    setProposalModal((prev) => ({ ...prev, requestingRevision: true, error: "" }));

    const p = proposalModal.data;
    const summary =
`Revision request for proposal (keeping existing details for reference):

— Proposed Price: $${p.proposedPrice?.toLocaleString() ?? "—"}
— Timeline: ${p.proposedTimelineDays ?? "—"} days
— Cover Letter: ${p.coverLetter ?? "—"}
— Expected Outputs: ${p.expectedOutputs ?? "—"}
— Working Approach: ${p.workingApproach ?? "—"}
— Milestone Plan: ${p.preliminaryMilestonePlan ?? "—"}

Client notes: ${feedbackText || "(no additional notes)"}`;

    try {
      await axiosInstance.post(`/conversations/${activeChat.id}/messages`, {
        content: summary,
        messageType: "TEXT",
        attachmentUrl: null,
      });
      await fetchMessages(activeChat.id, true);
      setProposalModal(null);
    } catch (err) {
      setProposalModal((prev) => ({ ...prev, requestingRevision: false, error: err?.response?.data?.message || "Revision request failed." }));
    }
  };


  // ── Pin / Unpin conversation ──────────────────────────────────────
  // Chưa có API pin thật từ BE — lưu vào localStorage để giữ qua reload.
  // Conversation pin gần nhất → vị trí 1 (đầu danh sách), pin cũ hơn lùi xuống vị trí 2, 3...
  const handlePinConversation = (conversationId) => {
    setPinnedIds((prev) => {
      const next = prev.includes(conversationId)
        ? prev.filter((id) => id !== conversationId) // đã pin → bấm lại để unpin
        : [conversationId, ...prev]; // pin mới → lên đầu danh sách pin
      localStorage.setItem("pinnedConversationIds", JSON.stringify(next));
      return next;
    });
    setOpenConversationMenu(null);
  };

  // ── Delete conversation (chỉ ẩn cục bộ — chưa có API DELETE thật từ BE) ──
  const handleDeleteConversation = (conversationId) => {
    if (!window.confirm("Delete this conversation? (Note: this only hides it on this device; backend does not support permanent delete yet)")) return;

    setDeletedIds((prev) => {
      const next = [...prev, conversationId];
      localStorage.setItem("deletedConversationIds", JSON.stringify(next));
      return next;
    });

    setConversations((prev) => prev.filter((c) => c.id !== conversationId));

    if (activeChat?.id === conversationId) {
      setActiveChat(null);
      setMessages([]);
    }

    setOpenConversationMenu(null);
  };

  if (loadingList) {
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#101319" }}>
        <ClientNavbar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#8c90a0" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, animation: "spin 1s linear infinite", color: "#00F0FF" }}>autorenew</span>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!activeChat) {
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#101319" }}>
        <ClientNavbar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#8c90a0", flexDirection: "column", gap: 12 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 64, color: "#272a30" }}>chat_bubble_outline</span>
          <p style={{ fontSize: 14 }}>No conversations yet.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        html, body, #root { height: 100%; margin: 0; padding: 0; }
        .msg-scroll::-webkit-scrollbar { width: 4px; }
        .msg-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#101319", color: "#e1e2eb", fontFamily: "Inter, sans-serif" }}>

        <ClientNavbar />

        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

          {/* Sidebar */}
          <aside style={{ width: 260, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.1)", background: "rgba(11,14,20,0.6)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 18, fontWeight: 700 }}>Inbox</h2>
            </div>
            <div className="msg-scroll" style={{ flex: 1, overflowY: "auto", padding: 8 }}>
              {conversations.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 12px", color: "#8c90a0" }}>
                  <p style={{ fontSize: 13 }}>Chưa có cuộc trò chuyện.</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div key={conv.id} onClick={() => setActiveChat(conv)}
                    style={{ padding: 12, borderRadius: 12, marginBottom: 4, cursor: "pointer", background: activeChat?.id === conv.id ? "rgba(173,198,255,0.08)" : "transparent", border: `1px solid ${activeChat?.id === conv.id ? "rgba(173,198,255,0.2)" : "transparent"}`, transition: "all 0.2s", position: "relative" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        <img src={conv.avatar} alt={conv.name} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", filter: conv.online ? "none" : "grayscale(0.5) opacity(0.8)" }} />
                        <span style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, background: conv.online ? "#00F0FF" : "#8c90a0", borderRadius: "50%", border: "2px solid #1d2026" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3, gap: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0, flex: 1 }}>
                            {conv.pinned && (
                              <span className="material-symbols-outlined" style={{ fontSize: 13, color: "#00F0FF", flexShrink: 0 }}>keep</span>
                            )}
                            <span style={{ fontWeight: conv.unread > 0 ? 700 : 500, fontSize: 14, color: "#e1e2eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.name}</span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0, position: "relative" }}>
                            <span style={{ fontSize: 10, color: "#8c90a0" }}>{conv.time}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenConversationMenu(openConversationMenu === conv.id ? null : conv.id); }}
                              style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: "#8c90a0", cursor: "pointer", borderRadius: 6 }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#fff"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#8c90a0"; }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>more_vert</span>
                            </button>

                            {openConversationMenu === conv.id && (
                              <>
                                <div onClick={(e) => { e.stopPropagation(); setOpenConversationMenu(null); }} style={{ position: "fixed", inset: 0, zIndex: 60 }} />
                                <div onClick={(e) => e.stopPropagation()}
                                  style={{ position: "absolute", right: 0, top: 26, zIndex: 70, width: 176, background: "#171b23", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, boxShadow: "0 12px 30px rgba(0,0,0,0.6)", overflow: "hidden" }}>
                                  <button onClick={() => handlePinConversation(conv.id)}
                                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "none", border: "none", color: "#e1e2eb", fontSize: 13, cursor: "pointer", textAlign: "left" }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{conv.pinned ? "keep_off" : "keep"}</span>
                                    {conv.pinned ? "Unpin chat" : "Pin chat"}
                                  </button>
                                  <button onClick={() => handleDeleteConversation(conv.id)}
                                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "none", border: "none", color: "#f87171", fontSize: 13, cursor: "pointer", textAlign: "left" }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(248,113,113,0.1)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                                    Delete chat
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        <p style={{ fontSize: 12, color: conv.unread > 0 ? "#c2c6d6" : "#8c90a0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.lastMessage}</p>
                      </div>
                      {conv.unread > 0 && (
                        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#00F0FF", color: "#002022", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{conv.unread}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* Chat window */}
          <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", minWidth: 0 }}>

            {/* Chat header */}
            <div style={{ flexShrink: 0, height: 64, padding: "0 20px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>

                <button
                  onClick={() => navigate(-1)}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.03)",
                    color: "#8c90a0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all .2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(0,240,255,.35)";
                    e.currentTarget.style.color = "#00F0FF";
                    e.currentTarget.style.background = "rgba(0,240,255,.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,.1)";
                    e.currentTarget.style.color = "#8c90a0";
                    e.currentTarget.style.background = "rgba(255,255,255,.03)";
                  }}
                >
                  <span className="material-symbols-outlined">
                    arrow_back
                  </span>
                </button>
                <div style={{ position: "relative" }}>
                  <img src={activeChat.avatar} alt={activeChat.name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(173,198,255,0.3)" }} />
                  {activeChat.online && <div style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, background: "#00F0FF", borderRadius: "50%", border: "2px solid #101319" }} />}
                </div>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{activeChat.name}</h3>
                  {activeChat.relatedJobTitle && (
                    <p style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: "#00F0FF", display: "flex", alignItems: "center", gap: 4, margin: 0 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00F0FF", animation: "pulse 2s infinite", flexShrink: 0 }} />
                      {activeChat.relatedJobTitle}
                    </p>
                  )}
                </div>
              </div>

            </div>

            {/* Messages area */}
            <div className="msg-scroll" style={{ flex: 1, overflowY: "auto", padding: "20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
              {loadingMessages ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 32, animation: "spin 1s linear infinite", color: "#00F0FF" }}>autorenew</span>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#8c90a0" }}>
                  <p style={{ fontSize: 13 }}>Chưa có tin nhắn. Hãy bắt đầu trò chuyện!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} style={{ display: "flex", gap: 10, flexDirection: msg.isMe ? "row-reverse" : "row", alignSelf: msg.isMe ? "flex-end" : "flex-start", maxWidth: "95%" }}>
                    {!msg.isMe && (
                      msg.avatar
                        ? <img src={msg.avatar} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", alignSelf: "flex-end", flexShrink: 0 }} />
                        : <div style={{ width: 30, flexShrink: 0 }} />
                    )}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: msg.isMe ? "flex-end" : "flex-start", gap: 3 }}>
                      <div style={{ padding: "10px 14px", borderRadius: msg.isMe ? "16px 16px 0 16px" : "16px 16px 16px 0", background: msg.isMe ? "linear-gradient(135deg, #1772eb, #00F0FF)" : "rgba(50,53,59,0.9)", border: msg.isMe ? "none" : "1px solid rgba(255,255,255,0.05)", boxShadow: msg.isMe ? "0 4px 15px rgba(0,240,255,0.2)" : "none", color: msg.isMe ? "#fff" : "#c2c6d6", fontSize: 14, lineHeight: 1.6, wordBreak: "break-word" }}>
                        {msg.text}
                      </div>
                      <span style={{ fontSize: 10, color: "#8c90a0" }}>{msg.time}</span>
                    </div>
                  </div>
                ))
              )}
              <div ref={scrollRef} />
            </div>

            {/* Error */}
            {error && (
              <div style={{ margin: "0 32px 8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "8px 14px", color: "#f87171", fontSize: 12 }}>
                {error}
              </div>
            )}

            {/* Input area */}
            <div className="shrink-0 px-8 pb-4 pt-2">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#1a1d24] px-3 py-2 shadow-xl transition-all duration-200 focus-within:border-cyan-400/40">
                
                {/* Attach menu */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAttachMenu((v) => !v)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
                      showAttachMenu
                        ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30"
                        : "text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-400"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[22px] transition-transform ${
                        showAttachMenu ? "rotate-45" : ""
                      }`}
                    >
                      add
                    </span>
                  </button>

                  {showAttachMenu && (
                    <>
                      <div
                        onClick={() => setShowAttachMenu(false)}
                        className="fixed inset-0 z-40"
                      />

                      <div className="absolute bottom-[calc(100%+10px)] left-0 z-50 w-56 rounded-xl border border-white/10 bg-[#101319]/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachMenu(false);
                            document.getElementById("msg-image-input")?.click();
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/5"
                        >
                          <span className="material-symbols-outlined text-[19px] text-slate-400">
                            image
                          </span>
                          <span className="text-sm font-medium text-slate-300">
                            Hình ảnh
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachMenu(false);
                            document.getElementById("msg-file-input")?.click();
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/5"
                        >
                          <span className="material-symbols-outlined text-[19px] text-slate-400">
                            attach_file
                          </span>
                          <span className="text-sm font-medium text-slate-300">
                            File
                          </span>
                        </button>
                      </div>
                    </>
                  )}

                  <input
                    id="msg-image-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUploadFile(e.target.files?.[0], "IMAGE")}
                  />

                  <input
                    id="msg-file-input"
                    type="file"
                    className="hidden"
                    onChange={(e) => handleUploadFile(e.target.files?.[0], "FILE")}
                  />
                </div>

                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Message..."
                  rows={1}
                  className="flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 text-white placeholder:text-slate-500 outline-none"
                />

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                    input.trim()
                      ? "bg-cyan-500 hover:bg-cyan-400 text-[#002022] shadow-lg shadow-cyan-500/25 hover:bg-cyan-300 active:scale-95"
                      : "cursor-not-allowed bg-white/5 text-slate-600"
                  }`}
                >
                  <span className="material-symbols-outlined text-[22px]">
                    send
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal review proposal (Accept hoặc Yêu cầu sửa) ── */}
      {proposalModal && (
        <ProposalReviewModal
          state={proposalModal}
          onClose={() => setProposalModal(null)}
          onRequestRevision={handleRequestRevision}
        />
      )}

      
    </>
  );
}