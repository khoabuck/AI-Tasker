// src/modules/client/pages/MessagesPage.jsx
//
// GET  /api/conversations/me                       → list conversations
// GET  /api/conversations/{conversationId}/messages → lấy lịch sử chat
// POST /api/conversations/{conversationId}/messages { content, messageType, attachmentUrl }
//
// BE trả message đầy đủ:
// GET messages trả danh sách lịch sử.
// POST messages trả message vừa tạo.
// FE không tạo pending message, dùng dữ liệu từ BE. Dùng optional chaining +
// nhiều tên field dự phòng. Khi có response thật, kiểm tra lại field tên/avatar đối phương
// và field phân biệt "tin nhắn của tôi" trong messages[].

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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

function formatMessageTime(value) {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const initialConvId = conversationId;
  const [searchParams] = useSearchParams();
  const newExpertUserId = searchParams.get("newExpertUserId");
  const newExpertProfileId = searchParams.get("newExpertProfileId");
  const newExpertName = searchParams.get("newExpertName");
  const overrideJobTitle = searchParams.get("jobTitle");
  const isNewChatDraft = !conversationId && !!newExpertUserId;
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
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

  

  const scrollRef = useRef(null);
  const pollRef = useRef(null);

  // ── Load conversations ───────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/conversations/me");
      
      const raw = res.data?.data ?? res.data;
      const list = Array.isArray(raw) ? raw : raw?.items ?? [];

      const normalized = list
      .map((c) => {
        const convId = c.conversationId ?? c.id ?? c.conversationID;

        return {
          id: convId,
          name: c.expertName || c.otherPartyName || c.clientName || "Expert",
          avatar:
            c.expertAvatarUrl ||
            c.otherPartyAvatarUrl ||
            null,
          online: c.isOtherPartyOnline ?? false,
          lastMessage: c.lastMessage?.content || c.lastMessageContent || "Start conversation",
          time: timeAgo(c.lastMessage?.createdAt || c.lastMessageAt || c.updatedAt || c.createdAt),
          unread: c.unreadCount || 0,
          relatedProposalId: c.relatedProposalId,
          relatedJobId: c.relatedJobId,
          relatedJobTitle: c.relatedJobTitle,
          raw: c,
        };
      })
      .filter((c) => c.id != null);

      setConversations(normalized);

      if (normalized.length > 0) {
      const target = initialConvId
        ? normalized.find((c) => String(c.id) === String(initialConvId))
        : isNewChatDraft
        ? null // đang tạo draft chat mới — không tự chọn conversation nào khác
        : normalized[0];

      if (!isNewChatDraft) {
        const resolved = target ?? normalized[0];
        setActiveChat(
          resolved && overrideJobTitle
            ? { ...resolved, relatedJobTitle: overrideJobTitle }
            : resolved
        );
      }
    } else if (!isNewChatDraft) {
      setActiveChat(null);
    }
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load conversations.");
    } finally {
      setLoadingList(false);
    }
  }, [initialConvId, isNewChatDraft, overrideJobTitle]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
  if (!isNewChatDraft) return;

  setActiveChat({
    id: null,
    name: newExpertName ? decodeURIComponent(newExpertName) : "Expert",
    avatar: null,
    online: false,
    lastMessage: "",
    time: "",
    unread: 0,
    relatedProposalId: null,
    relatedJobId: null,
    relatedJobTitle: null,
    raw: {
      expertUserId: Number(newExpertUserId),
      expertProfileId: newExpertProfileId ? Number(newExpertProfileId) : null,
    },
  });
  setMessages([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isNewChatDraft, newExpertUserId, newExpertProfileId, newExpertName]);

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
            : Boolean(
                m.isMine ??
                  (m.senderRole === "CLIENT" || m.senderType === "CLIENT")
              );

        return {
          id: m.conversationMessageId ?? m.messageId ?? m.id,
          text: m.content,
          isMe,
          time: formatMessageTime(m.createdAt),
          avatar: m.senderAvatarUrl,
          messageType: m.messageType,
          attachmentUrl: m.attachmentUrl,
        };
      });


    setMessages(normalized);

     
    } catch (err) {
      if (!silent) setError(err?.response?.data?.message || "Unable to load messages.");
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, [currentUserId]);

  const MESSAGE_POLL_INTERVAL = 5000;

useEffect(() => {
  if (!activeChat?.id) return;

  fetchMessages(activeChat.id);

  pollRef.current = setInterval(
    () => fetchMessages(activeChat.id, true),
    MESSAGE_POLL_INTERVAL
  );

  return () => clearInterval(pollRef.current);
}, [activeChat?.id, fetchMessages]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Gửi tin nhắn ──────────────────────────────────────────────────
  const handleSend = async () => {
  const content = input.trim();
  if (!content || !activeChat) return;

  setInput("");
  

  try {
    let convId = activeChat.id;

    if (!convId) {
      // Draft chưa có conversation thật — tạo mới ngay lúc gửi tin đầu tiên.
      const res = await axiosInstance.post("/conversations", {
        conversationType: "JOB_INQUIRY",
        expertUserId: activeChat.raw.expertUserId,
        expertProfileId: activeChat.raw.expertProfileId,
        initialMessage: content,
      });
      const conv = res.data?.data ?? res.data;
      convId = conv?.conversationId ?? conv?.id;

      if (!convId) throw new Error("Conversation was not created.");

      setActiveChat((prev) => ({ ...prev, id: convId }));
      navigate(`/client/messages/${convId}`, { replace: true });
      await fetchConversations();
    } else {
      await axiosInstance.post(`/conversations/${convId}/messages`, {
        content,
        messageType: "TEXT",
        attachmentUrl: null,
      });
    }

    setError("");
    await fetchMessages(convId, true);
  } catch (err) {
    setError(err?.response?.data?.message || "Send message failed.");
    setInput(content);
  }
};

  const handleUploadFile = async (file) => {
    if (!file || !activeChat?.id) return;


    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axiosInstance.post("/uploads/images", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    const url =
      res.data?.image?.url ??
      res.data?.data?.image?.url ??
      res.data?.data?.url ??
      res.data?.url;

    if (!url) {
      throw new Error("Upload succeeded but image URL was not returned.");
    }

    await axiosInstance.post(`/conversations/${activeChat.id}/messages`, {
      content: "[Image]",
      messageType: "TEXT",
      attachmentUrl: url,
    });

    setError("");
    await fetchMessages(activeChat.id, true);
    } catch (err) {
      setError(err?.response?.data?.message || "Image upload failed.");
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
                  <p style={{ fontSize: 13 }}>No conversations yet.</p>
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
                            <span style={{ fontWeight: conv.unread > 0 ? 700 : 500, fontSize: 14, color: "#e1e2eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.name}</span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                            <span style={{ fontSize: 10, color: "#8c90a0" }}>{conv.time}</span>
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
                  <p style={{ fontSize: 13 }}>No messages yet. Start the conversation!</p>
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
                      <div
                        style={{
                          padding: msg.attachmentUrl ? 4 : "10px 14px",
                          borderRadius: msg.isMe ? "16px 16px 0 16px" : "16px 16px 16px 0",
                          background: msg.isMe
                            ? "linear-gradient(135deg, #1772eb, #00F0FF)"
                            : "rgba(50,53,59,0.9)",
                          border: msg.isMe ? "none" : "1px solid rgba(255,255,255,0.05)",
                          boxShadow: msg.isMe ? "0 4px 15px rgba(0,240,255,0.2)" : "none",
                          color: msg.isMe ? "#fff" : "#c2c6d6",
                          fontSize: 14,
                          lineHeight: 1.6,
                          wordBreak: "break-word",
                        }}
                      >
                        {msg.attachmentUrl ? (
                        <img
                          src={msg.attachmentUrl}
                          alt="Attachment"
                          onClick={() => setPreviewImageUrl(msg.attachmentUrl)}
                          style={{
                            display: "block",
                            maxWidth: 260,
                            maxHeight: 320,
                            borderRadius: 12,
                            objectFit: "cover",
                            cursor: "zoom-in",
                          }}
                        />
                      ) : (
                        msg.text
                      )}
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
                            Image
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
                    onChange={(e) => handleUploadFile(e.target.files?.[0])}
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

      {/* ── Image preview modal ── */}
      {previewImageUrl && (
        <div
          onClick={() => setPreviewImageUrl(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            background: "rgba(0,0,0,0.88)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            cursor: "zoom-out",
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewImageUrl(null);
            }}
            style={{
              position: "fixed",
              top: 20,
              right: 20,
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(16,19,25,0.85)",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span className="material-symbols-outlined">
              close
            </span>
          </button>

          <img
            src={previewImageUrl}
            alt="Preview"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "92vw",
              maxHeight: "88vh",
              borderRadius: 14,
              objectFit: "contain",
              boxShadow: "0 20px 80px rgba(0,0,0,0.65)",
              cursor: "default",
            }}
          />
        </div>
      )}

      
    </>
  );
}