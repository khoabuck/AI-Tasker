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
import { useNavigate, useSearchParams } from "react-router-dom";
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

export default function MessagesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialConvId = searchParams.get("conversationId");
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
  const [contractModal, setContractModal] = useState(null); // { loading, error, data }

  const scrollRef = useRef(null);
  const pollRef = useRef(null);

  // ── Load conversations ───────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/conversations/me");
      const raw = res.data?.data ?? res.data;
      const list = Array.isArray(raw) ? raw : raw?.items ?? [];

      // Chuẩn hoá field về shape UI đang dùng (id, name, avatar, online, lastMessage, time, unread)
      const normalized = list.map((c) => ({
        id: c.conversationId,
        name: c.expertFullName || c.otherPartyName || c.expertName || "Expert",
        avatar: c.expertAvatarUrl || c.otherPartyAvatarUrl || `https://i.pravatar.cc/100?u=${c.conversationId}`,
        online: c.isOtherPartyOnline ?? false,
        lastMessage: c.lastMessage?.content || c.lastMessageContent || "Bắt đầu cuộc trò chuyện",
        time: timeAgo(c.lastMessage?.createdAt || c.updatedAt || c.createdAt),
        unread: c.unreadCount || 0,
        relatedProposalId: c.relatedProposalId,
        relatedContractId: c.relatedContractId,
        relatedJobId: c.relatedJobId,
        relatedJobTitle: c.relatedJobTitle,
        raw: c,
      }));

      setConversations(normalized);

      if (normalized.length > 0) {
        const target = initialConvId
          ? normalized.find((c) => c.id === Number(initialConvId))
          : normalized[0];
        setActiveChat(target || normalized[0]);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Không thể tải danh sách trò chuyện.");
    } finally {
      setLoadingList(false);
    }
  }, [initialConvId]);

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
        // Ưu tiên so sánh senderUserId với user hiện tại — đây là field tiêu chuẩn
        // gần như chắc chắn BE trả về, đáng tin hơn isMine/senderType (có thể không tồn tại).
        const senderId = m.senderUserId ?? m.senderId ?? m.userId;
        const isMe = currentUserId != null && senderId != null
          ? String(senderId) === String(currentUserId)
          : (m.isMine ?? m.senderType === "CLIENT" ?? false);

        return {
          id: m.messageId ?? m.id,
          text: m.content,
          isMe,
          time: m.createdAt
            ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "",
          avatar: m.senderAvatarUrl,
        };
      });

      setMessages(normalized);
    } catch (err) {
      if (!silent) setError(err?.response?.data?.message || "Không thể tải tin nhắn.");
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
    setMessages((prev) => [...prev, {
      id: tempId, text: content, isMe: true,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }]);

    try {
      await axiosInstance.post(`/conversations/${activeChat.id}/messages`, {
        content,
        messageType: "TEXT",
        attachmentUrl: null,
      });
      await fetchMessages(activeChat.id, true);
    } catch (err) {
      setError(err?.response?.data?.message || "Gửi tin nhắn thất bại.");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(content);
    }
  };

  const handleUploadFile = async (file, type) => {
    if (!file || !activeChat?.id) return;

    if (type === "FILE") {
      // Chưa có endpoint upload file thường trong API list — chỉ /api/uploads/images cho ảnh.
      setError("Tải file đính kèm (không phải ảnh) chưa được hỗ trợ. Vui lòng báo BE bổ sung endpoint upload file.");
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
        content: "[Hình ảnh]",
        messageType: "IMAGE",
        attachmentUrl: url,
      });
      await fetchMessages(activeChat.id, true);
    } catch (err) {
      setError(err?.response?.data?.message || "Tải ảnh lên thất bại.");
    }
  };

  // MOCK/TẠM: cho hiện nút "Tạo hợp đồng" khi có relatedJobId (chưa cần relatedProposalId có sẵn).
  // Khi bấm, sẽ tự tìm proposalId đã ACCEPT của expert này trong job đó.
  // TODO: bỏ điều kiện tạm này khi BE đã gắn relatedProposalId thẳng vào conversation lúc tạo.
  const canCreateContract = (activeChat?.relatedProposalId || activeChat?.relatedJobId) && !activeChat?.relatedContractId;

  const handleCreateContract = async () => {
    setShowAttachMenu(false);
    if (!activeChat) return;

    setContractModal({ loading: true, error: "", data: null });

    try {
      let proposalId = activeChat.relatedProposalId;

      // MOCK: chưa có proposalId sẵn → tự tìm qua job proposals (lọc theo expert + status ACCEPTED)
      if (!proposalId && activeChat.relatedJobId) {
        const propRes = await axiosInstance.get(`/jobs/${activeChat.relatedJobId}/proposals`);
        const propRaw = propRes.data?.data ?? propRes.data;
        const proposals = Array.isArray(propRaw) ? propRaw : propRaw?.items ?? [];

        const accepted = proposals.find(
          (p) => p.status === "ACCEPTED" && (p.expertUserId === activeChat.raw?.expertUserId || !activeChat.raw?.expertUserId)
        ) || proposals.find((p) => p.status === "ACCEPTED") || proposals[0];

        if (!accepted) {
          setContractModal({ loading: false, error: "Job này chưa có proposal nào để tạo hợp đồng (mock lookup thất bại).", data: null });
          return;
        }
        proposalId = accepted.proposalId;
      }

      if (!proposalId) {
        setContractModal({ loading: false, error: "Không tìm thấy proposal liên kết để tạo hợp đồng.", data: null });
        return;
      }

      const res = await axiosInstance.post(`/contracts/from-proposal/${proposalId}`);
      const data = res.data?.data ?? res.data;
      setContractModal({ loading: false, error: "", data });
      setActiveChat((prev) => prev ? { ...prev, relatedContractId: data?.contractId } : prev);
    } catch (err) {
      setContractModal({ loading: false, error: err?.response?.data?.message || "Không thể tạo hợp đồng. Vui lòng thử lại.", data: null });
    }
  };

  const handleViewContract = async () => {
    setShowAttachMenu(false);
    if (!activeChat?.relatedContractId) return;

    setContractModal({ loading: true, error: "", data: null });
    try {
      const res = await axiosInstance.get(`/contracts/${activeChat.relatedContractId}`);
      const data = res.data?.data ?? res.data;
      setContractModal({ loading: false, error: "", data });
    } catch (err) {
      setContractModal({ loading: false, error: err?.response?.data?.message || "Không thể tải hợp đồng.", data: null });
    }
  };

  const handleConfirmContract = async () => {
    if (!contractModal?.data?.contractId) return;
    setContractModal((prev) => ({ ...prev, confirming: true }));
    try {
      const res = await axiosInstance.post(`/contracts/${contractModal.data.contractId}/confirm`);
      const data = res.data?.data ?? res.data;
      setContractModal({ loading: false, error: "", data, confirming: false });
    } catch (err) {
      setContractModal((prev) => ({ ...prev, confirming: false, error: err?.response?.data?.message || "Ký hợp đồng thất bại." }));
    }
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
          <p style={{ fontSize: 14 }}>Chưa có cuộc trò chuyện nào.</p>
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
                    style={{ padding: 12, borderRadius: 12, marginBottom: 4, cursor: "pointer", background: activeChat?.id === conv.id ? "rgba(173,198,255,0.08)" : "transparent", border: `1px solid ${activeChat?.id === conv.id ? "rgba(173,198,255,0.2)" : "transparent"}`, transition: "all 0.2s" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        <img src={conv.avatar} alt={conv.name} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", filter: conv.online ? "none" : "grayscale(0.5) opacity(0.8)" }} />
                        <span style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, background: conv.online ? "#00F0FF" : "#8c90a0", borderRadius: "50%", border: "2px solid #1d2026" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontWeight: conv.unread > 0 ? 700 : 500, fontSize: 14, color: "#e1e2eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.name}</span>
                          <span style={{ fontSize: 10, color: "#8c90a0", flexShrink: 0, marginLeft: 8 }}>{conv.time}</span>
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
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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

              <div style={{ display: "flex", gap: 8 }}>
                {canCreateContract && (
                  <button onClick={() => navigate(`/client/contracts/new?proposalId=${activeChat.relatedProposalId}&conversationId=${activeChat.id}`)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "linear-gradient(90deg, #1772eb, #00F0FF)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>description</span>
                    Tạo hợp đồng
                  </button>
                )}
                {activeChat.relatedContractId && (
                  <button onClick={() => navigate(`/client/contracts/${activeChat.relatedContractId}`)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(0,240,255,0.08)", color: "#00F0FF", border: "1px solid rgba(0,240,255,0.25)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>visibility</span>
                    Xem hợp đồng
                  </button>
                )}
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
            <div style={{ flexShrink: 0, padding: "10px 32px 16px" }}>
              <div style={{ background: "rgba(29,32,38,0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "8px 12px" }}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>

                  {/* Nút "+" — popup tiện ích (Hợp đồng / Hình ảnh / File) */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <button onClick={() => setShowAttachMenu((v) => !v)}
                      style={{ width: 36, height: 36, borderRadius: 10, background: showAttachMenu ? "rgba(0,240,255,0.1)" : "transparent", border: "none", color: showAttachMenu ? "#00F0FF" : "#8c90a0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 22, transform: showAttachMenu ? "rotate(45deg)" : "none", transition: "transform 0.15s" }}>add</span>
                    </button>

                    {showAttachMenu && (
                      <>
                        <div onClick={() => setShowAttachMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                        <div style={{ position: "absolute", bottom: "calc(100% + 10px)", left: 0, width: 220, background: "rgba(16,19,25,0.98)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, boxShadow: "0 8px 30px rgba(0,0,0,0.6)", padding: 6, zIndex: 50 }}>
                          {canCreateContract && (
                            <button onClick={handleCreateContract}
                              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "none", border: "none", borderRadius: 8, cursor: "pointer", textAlign: "left" }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,240,255,0.08)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#00F0FF" }}>description</span>
                              <span style={{ fontSize: 13, color: "#e1e2eb", fontWeight: 600 }}>Tạo hợp đồng</span>
                            </button>
                          )}
                          {activeChat?.relatedContractId && (
                            <button onClick={handleViewContract}
                              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "none", border: "none", borderRadius: 8, cursor: "pointer", textAlign: "left" }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,240,255,0.08)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#00F0FF" }}>contract_edit</span>
                              <span style={{ fontSize: 13, color: "#e1e2eb", fontWeight: 600 }}>Xem hợp đồng & Ký tên</span>
                            </button>
                          )}
                          <button onClick={() => { setShowAttachMenu(false); document.getElementById("msg-image-input")?.click(); }}
                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "none", border: "none", borderRadius: 8, cursor: "pointer", textAlign: "left" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#8c90a0" }}>image</span>
                            <span style={{ fontSize: 13, color: "#c2c6d6" }}>Hình ảnh</span>
                          </button>
                          <button onClick={() => { setShowAttachMenu(false); document.getElementById("msg-file-input")?.click(); }}
                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "none", border: "none", borderRadius: 8, cursor: "pointer", textAlign: "left" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#8c90a0" }}>attach_file</span>
                            <span style={{ fontSize: 13, color: "#c2c6d6" }}>File</span>
                          </button>
                        </div>
                      </>
                    )}

                    {/* Input file ẩn — dùng /api/uploads/images cho ảnh, file thường cần endpoint upload riêng (chưa có trong API list) */}
                    <input id="msg-image-input" type="file" accept="image/*" style={{ display: "none" }}
                      onChange={(e) => handleUploadFile(e.target.files?.[0], "IMAGE")} />
                    <input id="msg-file-input" type="file" style={{ display: "none" }}
                      onChange={(e) => handleUploadFile(e.target.files?.[0], "FILE")} />
                  </div>

                  <textarea value={input} onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Type a message..." rows={1}
                    style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#e1e2eb", fontSize: 14, fontFamily: "Inter, sans-serif", resize: "none", lineHeight: 1.6 }} />
                  <button onClick={handleSend} disabled={!input.trim()}
                    style={{ width: 36, height: 36, borderRadius: 10, background: input.trim() ? "#1772eb" : "#272a30", border: "none", color: input.trim() ? "#fff" : "#666b78", display: "flex", alignItems: "center", justifyContent: "center", cursor: input.trim() ? "pointer" : "not-allowed", boxShadow: input.trim() ? "0 4px 12px rgba(23,114,235,0.4)" : "none", flexShrink: 0, transition: "transform 0.1s" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal hợp đồng (tạo mới / xem / ký) ── */}
      {contractModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={(e) => e.target === e.currentTarget && setContractModal(null)}>
          <div style={{ background: "rgba(16,19,25,0.98)", border: "1px solid rgba(0,240,255,0.2)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 520, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 19, fontWeight: 700, color: "#e1e2eb", margin: 0 }}>Hợp đồng dự án</h3>
              <button onClick={() => setContractModal(null)} style={{ background: "none", border: "none", color: "#8c90a0", cursor: "pointer" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
              </button>
            </div>

            {contractModal.loading ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#8c90a0" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 36, animation: "spin 1s linear infinite", color: "#00F0FF" }}>autorenew</span>
              </div>
            ) : contractModal.error ? (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "12px 16px", color: "#f87171", fontSize: 13 }}>
                {contractModal.error}
              </div>
            ) : contractModal.data ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Status */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#8c90a0" }}>Mã hợp đồng: <span style={{ color: "#c2c6d6", fontFamily: "JetBrains Mono, monospace" }}>#{contractModal.data.contractId}</span></span>
                  <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", color: "#facc15", background: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.3)" }}>
                    {contractModal.data.status || "DRAFT"}
                  </span>
                </div>

                {/* Thông tin chính */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  {contractModal.data.title && (
                    <div><span style={{ fontSize: 11, color: "#8c90a0" }}>Tiêu đề: </span><span style={{ fontSize: 13, color: "#e1e2eb" }}>{contractModal.data.title}</span></div>
                  )}
                  {(contractModal.data.totalAmount ?? contractModal.data.amount) != null && (
                    <div><span style={{ fontSize: 11, color: "#8c90a0" }}>Tổng giá trị: </span><span style={{ fontSize: 14, color: "#00F0FF", fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>${(contractModal.data.totalAmount ?? contractModal.data.amount)?.toLocaleString()}</span></div>
                  )}
                  {contractModal.data.deadline && (
                    <div><span style={{ fontSize: 11, color: "#8c90a0" }}>Hạn hoàn thành: </span><span style={{ fontSize: 13, color: "#c2c6d6" }}>{new Date(contractModal.data.deadline).toLocaleDateString("vi-VN")}</span></div>
                  )}
                </div>

                {/* Milestones */}
                {Array.isArray(contractModal.data.milestoneDrafts ?? contractModal.data.milestones) && (contractModal.data.milestoneDrafts ?? contractModal.data.milestones).length > 0 && (
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#8c90a0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Milestones</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(contractModal.data.milestoneDrafts ?? contractModal.data.milestones).map((m, i) => (
                        <div key={m.milestoneDraftId ?? i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 12px", display: "flex", justifyContent: "space-between", gap: 10 }}>
                          <span style={{ fontSize: 13, color: "#c2c6d6" }}>{m.title || `Milestone ${i + 1}`}</span>
                          {m.amount != null && <span style={{ fontSize: 13, color: "#00F0FF", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>${m.amount.toLocaleString()}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trạng thái xác nhận 2 bên */}
                {(contractModal.data.clientConfirmedAt || contractModal.data.expertConfirmedAt) && (
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ flex: 1, textAlign: "center", padding: "8px", borderRadius: 8, background: contractModal.data.clientConfirmedAt ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${contractModal.data.clientConfirmedAt ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)"}` }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: contractModal.data.clientConfirmedAt ? "#22c55e" : "#666b78" }}>
                        {contractModal.data.clientConfirmedAt ? "check_circle" : "schedule"}
                      </span>
                      <p style={{ fontSize: 11, color: "#8c90a0", margin: "2px 0 0" }}>Client {contractModal.data.clientConfirmedAt ? "đã ký" : "chưa ký"}</p>
                    </div>
                    <div style={{ flex: 1, textAlign: "center", padding: "8px", borderRadius: 8, background: contractModal.data.expertConfirmedAt ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${contractModal.data.expertConfirmedAt ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)"}` }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: contractModal.data.expertConfirmedAt ? "#22c55e" : "#666b78" }}>
                        {contractModal.data.expertConfirmedAt ? "check_circle" : "schedule"}
                      </span>
                      <p style={{ fontSize: 11, color: "#8c90a0", margin: "2px 0 0" }}>Expert {contractModal.data.expertConfirmedAt ? "đã ký" : "chưa ký"}</p>
                    </div>
                  </div>
                )}

                {contractModal.error && (
                  <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13 }}>{contractModal.error}</div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button onClick={() => setContractModal(null)}
                    style={{ flex: 1, padding: "12px", background: "transparent", color: "#c2c6d6", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>
                    Đóng
                  </button>
                  {contractModal.data.status !== "CONFIRMED" && !contractModal.data.clientConfirmedAt && (
                    <button onClick={handleConfirmContract} disabled={contractModal.confirming}
                      style={{ flex: 2, padding: "12px", background: contractModal.confirming ? "#1d2026" : "linear-gradient(90deg, #1772eb, #00F0FF)", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: contractModal.confirming ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      {contractModal.confirming
                        ? <><span className="material-symbols-outlined" style={{ fontSize: 16, animation: "spin 1s linear infinite" }}>autorenew</span>Đang ký...</>
                        : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>draw</span>Ký hợp đồng</>}
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}