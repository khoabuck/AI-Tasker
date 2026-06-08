// src/modules/client/pages/MessagesPage.jsx
// Trang Messages — nằm dưới Projects > Messages
// Không dùng ClientLayout vì trang này full-height, không cần footer

import { useState, useEffect } from "react";
import ClientNavbar from "../../../components/layout/ClientNavbar";
// TODO (BE): import axiosInstance from "../../../api/axiosInstance";

// ── MOCK DATA — xóa khi BE xong ──────────────────────────────────────
const MOCK_CONVERSATIONS = [
  {
    id: 1, name: "Alex Rivera", online: true,
    lastMessage: "I've attached the latest contract for the smart contract audit...",
    time: "2m ago", unread: 2,
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBVi3MpJBzOlALlauE7s72QbQw61tIrT04Mzpq5CZOggo1K4Opu1MGkAnvvbo748ML5bwd9vBMml0N6sQ23cUudW0XYKn6CmBQl8_4K2a7m0K9n0DtSesyIf8d5jCUzPF9Dk8lrfD8ebvtYJi--I-1weBl5vAC7owRo_tNyWVCfvdbyNEDbTEeJs4eif3kAiBDatywr7xdCCbiNQtZmbri-6JpkrXFV7WgyvShETCchOWj4uyJhYo0cu69-E84yl60x4sJh3WPpHBSi",
  },
  {
    id: 2, name: "Sarah Chen", online: false,
    lastMessage: "Great! Let me review those Figma mocks and get back to you.",
    time: "1h ago", unread: 0,
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuD_DIUzzFzB-isATVNKc1Eu_1jBVCNx71XlOUztfArtXIEIVXsVWIoZzSKHPb08I6LeLaDqpiqZR6x8SlGo5k7Y9pXIyaGLg-Rb6SlMNd80P9YRRUT607GHETHvGlDwz7GdGA-wDkWnsqvzM-mQWi6brTTv0vypYcGaW6-NcsF9IrhblPz1LipFK7gnG1evaacPYXeH6KYyWwiu3Vcfvag-jJiu1RdMMb_lyq6nUJMgzH7A4XzfA0JDGBKdsCWMT-qZ9sAKvdTIV_u-",
  },
];

const MOCK_MESSAGES = [
  { id: 1, text: "Hey! I've finished reviewing the security vulnerabilities we discussed earlier. The main issue was in the reentrancy guard implementation.", time: "10:42 AM", isMe: false, avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBMh5QqV0EUTlnIsAN1o-muVmjJSFunjbzmQk-mtJp6MnqDQGK1-7jU0ETdR9xD8XLYxwJZa3eOFg1YLfkOEwsi781Eg4WAMbR4jP24OYl8zXxO5jUBklGt4JrsVmBl4gcuUALlm2t9spT5Yy2MjKy16vuv0rwZuJakBcNoRcKrxR-SxWBF3B1e4SW3nSuTY2Xes-Kw7SSkAv4Q_mgqsz5Y8aTFAx_HG-6P1h8IzKUGAXPJW49e4xkbvwFd_86ea8K2CKmbMYhtusAz" },
  { id: 2, text: "Thanks Alex. Can you share the corrected snippet? I want to push this to the dev branch before the standup.", time: "10:44 AM", isMe: true },
  { id: 3, text: "Sure thing. Here is the updated logic using OpenZeppelin:", time: "10:45 AM", isMe: false, hasCode: true, avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAyeNMHJp1UwvLD0nkDksKUEaKfIk2NR9hBWyoV4OJqX1BwLvhoNnlZ3GMtnOQXPywDCMAANwqR79hJBy-siNvIL63e3QWdF3sZrsCx_QEk0NGJvzbPYuL6sVwm2JP1eZkovdFI_4YeVoF35DkoX_PmmGehzHj48rJ7JA9fLr-frQDhENxaylOoIw8IsaRIRqwkBdg70JDzRpbXwOXsW28Gym8bhD6YzCWKjzmjcuJRry_SlIhIO6S3bGT8P2HO" },
];
// ─────────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  // ── TODO (BE): Load conversations ────────────────────────────────
  // useEffect(() => {
  //   axiosInstance.get("/messages/conversations")
  //     .then(res => { setConversations(res.data); setActiveChat(res.data[0]); });
  // }, []);
  useEffect(() => {
    setConversations(MOCK_CONVERSATIONS);
    setActiveChat(MOCK_CONVERSATIONS[0]);
  }, []);

  // ── TODO (BE): Load messages khi chọn conversation ───────────────
  // useEffect(() => {
  //   if (!activeChat) return;
  //   axiosInstance.get(`/messages/conversations/${activeChat.id}/messages`)
  //     .then(res => setMessages(res.data));
  // }, [activeChat?.id]);
  useEffect(() => {
    if (activeChat) setMessages(MOCK_MESSAGES);
  }, [activeChat?.id]);

  const handleSend = async () => {
    if (!input.trim()) return;
    // ── TODO (BE): POST /messages { conversationId, text } ──────────
    // await axiosInstance.post("/messages", { conversationId: activeChat.id, text: input });
    setMessages((prev) => [...prev, {
      id: Date.now(), text: input, isMe: true,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }]);
    setInput("");
  };

  if (!activeChat) return null;

  return (
    <>
      <style>{`
        html, body, #root { height: 100%; margin: 0; padding: 0; }
        .msg-scroll::-webkit-scrollbar { width: 4px; }
        .msg-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>

      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#101319", color: "#e1e2eb", fontFamily: "Inter, sans-serif" }}>

        <ClientNavbar />

        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

          {/* Sidebar */}
          <aside style={{ width: 300, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.1)", background: "rgba(11,14,20,0.6)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 18, fontWeight: 700 }}>Inbox</h2>
              <button style={{ padding: 6, borderRadius: 8, background: "#272a30", border: "none", color: "#adc6ff", cursor: "pointer" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit_square</span>
              </button>
            </div>
            <div className="msg-scroll" style={{ flex: 1, overflowY: "auto", padding: 8 }}>
              {conversations.map((conv) => (
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
              ))}
            </div>
          </aside>

          {/* Chat window */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

            {/* Chat header */}
            <div style={{ flexShrink: 0, height: 64, padding: "0 20px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ position: "relative" }}>
                  <img src={activeChat.avatar} alt={activeChat.name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(173,198,255,0.3)" }} />
                  <div style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, background: "#00F0FF", borderRadius: "50%", border: "2px solid #101319" }} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Connected with {activeChat.name}</h3>
                  <p style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: "#00F0FF", display: "flex", alignItems: "center", gap: 4, margin: 0 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00F0FF", animation: "pulse 2s infinite", flexShrink: 0 }} />
                    Active Project: Smart Audit V2
                  </p>
                </div>
              </div>
              <button style={{ width: 36, height: 36, borderRadius: 10, background: "#272a30", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#8c90a0" }}>
                <span className="material-symbols-outlined">more_vert</span>
              </button>
            </div>

            {/* Messages area */}
            <div className="msg-scroll" style={{ flex: 1, overflowY: "auto", padding: "20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <span style={{ padding: "3px 10px", borderRadius: 999, background: "#272a30", fontSize: 10, fontFamily: "JetBrains Mono, monospace", color: "#8c90a0", border: "1px solid rgba(255,255,255,0.12)" }}>Today, Oct 24</span>
              </div>

              {messages.map((msg) => (
                <div key={msg.id} style={{ display: "flex", gap: 10, flexDirection: msg.isMe ? "row-reverse" : "row", alignSelf: msg.isMe ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                  {!msg.isMe && (
                    msg.avatar
                      ? <img src={msg.avatar} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", alignSelf: "flex-end", flexShrink: 0 }} />
                      : <div style={{ width: 30, flexShrink: 0 }} />
                  )}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: msg.isMe ? "flex-end" : "flex-start", gap: 3 }}>
                    <div style={{ padding: "10px 14px", borderRadius: msg.isMe ? "16px 16px 0 16px" : "16px 16px 16px 0", background: msg.isMe ? "linear-gradient(135deg, #1772eb, #00F0FF)" : "rgba(50,53,59,0.9)", border: msg.isMe ? "none" : "1px solid rgba(255,255,255,0.05)", boxShadow: msg.isMe ? "0 4px 15px rgba(0,240,255,0.2)" : "none", color: msg.isMe ? "#fff" : "#c2c6d6", fontSize: 14, lineHeight: 1.6 }}>
                      {msg.text}
                      {msg.hasCode && (
                        <div style={{ marginTop: 10, background: "#12151B", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: 14, fontFamily: "JetBrains Mono, monospace", fontSize: 12, overflowX: "auto" }}>
                          <pre style={{ color: "#c0c1ff", margin: 0 }}>{`contract SecurityAudit {\n    bool private _locked;\n    modifier noReentrant() {\n        require(!_locked, "Reentrancy");\n        _locked = true;\n        _;\n        _locked = false;\n    }\n}`}</pre>
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 10, color: "#8c90a0" }}>{msg.time}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Input area */}
            <div style={{ flexShrink: 0, padding: "8px 16px 12px" }}>
              <div style={{ background: "rgba(29,32,38,0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "8px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 6 }}>
                  {["add_circle", "image", "attach_file"].map((icon) => (
                    <button key={icon} style={{ padding: 6, background: "none", border: "none", color: "#8c90a0", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#00F0FF")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#8c90a0")}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
                    </button>
                  ))}
                  <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.12)", margin: "0 4px" }} />
                  <button style={{ padding: 6, background: "none", border: "none", color: "#8c90a0", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#00F0FF")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#8c90a0")}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>sentiment_satisfied</span>
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
                  <textarea value={input} onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Type a message..." rows={1}
                    style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#e1e2eb", fontSize: 14, fontFamily: "Inter, sans-serif", resize: "none", lineHeight: 1.6 }} />
                  <button onClick={handleSend}
                    style={{ width: 36, height: 36, borderRadius: 10, background: "#1772eb", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 12px rgba(23,114,235,0.4)", flexShrink: 0, transition: "transform 0.1s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}