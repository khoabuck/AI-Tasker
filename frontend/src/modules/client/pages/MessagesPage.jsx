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

// ── Proposal Review Modal — Client xem proposal, Accept hoặc Yêu cầu sửa ──
function ProposalReviewModal({ state, onClose, onAccept, onRequestRevision }) {
  const [revisionNote, setRevisionNote] = useState("");
  const [showRevisionForm, setShowRevisionForm] = useState(false);

  const p = state.data;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "rgba(16,19,25,0.98)", border: "1px solid rgba(0,240,255,0.2)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 19, fontWeight: 700, color: "#e1e2eb", margin: 0 }}>
            {showRevisionForm ? "Yêu cầu chỉnh sửa" : "Review Proposal"}
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
            // ── Form yêu cầu sửa: giữ nguyên data cũ, chỉ thêm ghi chú ──
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ fontSize: 13, color: "#8c90a0", margin: 0, lineHeight: 1.6 }}>
                Toàn bộ thông tin proposal hiện tại sẽ được gửi kèm vào tin nhắn để expert đối chiếu.
                Bạn chỉ cần ghi chú điều muốn thay đổi.
              </p>

              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 14, fontSize: 12, color: "#8c90a0", display: "flex", flexDirection: "column", gap: 4 }}>
                <span>Proposed Price: <span style={{ color: "#00F0FF" }}>${p.proposedPrice?.toLocaleString() ?? "—"}</span></span>
                <span>Timeline: <span style={{ color: "#e1e2eb" }}>{p.proposedTimelineDays ?? "—"} days</span></span>
              </div>

              <div>
                <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", marginBottom: 8 }}>
                  Ghi chú muốn sửa (vd: giảm giá, đổi timeline, bổ sung output...)
                </label>
                <textarea value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)}
                  placeholder="Ví dụ: Giá hơi cao, mong bạn giảm xuống $450 và rút ngắn timeline còn 45 ngày..."
                  rows={4}
                  style={{ width: "100%", background: "#1d2026", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "12px 14px", color: "#e1e2eb", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 14, resize: "none", boxSizing: "border-box" }} />
              </div>

              {state.error && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13 }}>{state.error}</div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowRevisionForm(false)}
                  style={{ flex: 1, padding: "12px", background: "transparent", color: "#c2c6d6", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>
                  Quay lại
                </button>
                <button onClick={() => onRequestRevision(revisionNote)} disabled={state.requestingRevision}
                  style={{ flex: 2, padding: "12px", background: state.requestingRevision ? "#1d2026" : "#facc15", color: "#1d1500", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: state.requestingRevision ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {state.requestingRevision
                    ? <><span className="material-symbols-outlined" style={{ fontSize: 16, animation: "spin 1s linear infinite" }}>autorenew</span>Đang gửi...</>
                    : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span>Gửi yêu cầu sửa</>}
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
                <button onClick={onAccept} disabled={state.accepting}
                  style={{ flex: 1, padding: "12px", background: state.accepting ? "#1d2026" : "#22c55e", color: state.accepting ? "#8c90a0" : "#002022", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: state.accepting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {state.accepting
                    ? <><span className="material-symbols-outlined" style={{ fontSize: 16, animation: "spin 1s linear infinite" }}>autorenew</span>Đang xử lý...</>
                    : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>Accept & Tạo hợp đồng</>}
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
  const [walletBalance, setWalletBalance] = useState(null);
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
            lastMessage: c.lastMessage?.content || c.lastMessageContent || "Bắt đầu cuộc trò chuyện",
            time: timeAgo(c.lastMessage?.createdAt || c.lastMessageAt || c.updatedAt || c.createdAt),
            unread: c.unreadCount || 0,
            relatedProposalId: c.relatedProposalId,
            relatedContractId: c.relatedContractId,
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
      setError(err?.response?.data?.message || "Không thể tải danh sách trò chuyện.");
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

  // MOCK/TẠM: cho hiện nút "Review Proposal" khi có relatedJobId (chưa cần relatedProposalId có sẵn).
  // Khi bấm, sẽ tự tìm proposalId đã ACCEPT/SUBMITTED của expert này trong job đó, hiện proposal
  // để client review trước, KHÔNG tạo contract ngay — chỉ tạo contract khi client bấm Accept.
  const canReviewProposal = (activeChat?.relatedProposalId || activeChat?.relatedJobId) && !activeChat?.relatedContractId;

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
          setProposalModal({ loading: false, error: "Không tìm thấy proposal của expert này cho job liên quan.", data: null });
          return;
        }
        proposalId = target.proposalId;
      }

      if (!proposalId) {
        setProposalModal({ loading: false, error: "Không tìm thấy proposal liên kết.", data: null });
        return;
      }

      const res = await axiosInstance.get(`/proposals/${proposalId}`);
      let proposalData = res.data?.data ?? res.data;
      if (Array.isArray(proposalData)) proposalData = proposalData[0] ?? null;

      if (!proposalData) {
        setProposalModal({ loading: false, error: "Không tìm thấy proposal này.", data: null });
        return;
      }

      setProposalModal({ loading: false, error: "", data: proposalData });
    } catch (err) {
      setProposalModal({ loading: false, error: err?.response?.data?.message || "Không thể tải proposal. Vui lòng thử lại.", data: null });
    }
  };

  // Client Accept proposal → mới thực sự tạo contract
  // Lấy số dư ví — response thật: { success, balance } (không có wrapper "data").
  const fetchWalletBalance = async () => {
    try {
      const res = await axiosInstance.get("/wallets/balance");
      const bal = res.data?.balance ?? res.data?.data?.balance ?? null;
      setWalletBalance(bal);
      return bal;
    } catch {
      setWalletBalance(null);
      return null;
    }
  };

  const handleAcceptAndCreateContract = async () => {
    if (!proposalModal?.data?.proposalId) return;
    setProposalModal((prev) => ({ ...prev, accepting: true, error: "" }));
    try {
      try {
        await axiosInstance.post(`/proposals/${proposalModal.data.proposalId}/decision?decision=ACCEPT`);
      } catch (decisionErr) {
        // Nếu BE báo proposal đã ACCEPTED từ trước, coi đây là thành công và tiếp tục
        // sang bước tạo contract — không cần chặn lại vì kết quả mong muốn (đã accept) đã đạt.
        const msg = decisionErr?.response?.data?.message || "";
        const alreadyAccepted = /already accepted/i.test(msg);
        if (!alreadyAccepted) throw decisionErr;
      }

      const res = await axiosInstance.post(`/contracts/from-proposal/${proposalModal.data.proposalId}`);
      const contractData = res.data?.data ?? res.data;

      setProposalModal(null);
      setActiveChat((prev) => prev ? { ...prev, relatedContractId: contractData?.contractId } : prev);
      setContractModal({ loading: false, error: "", data: contractData, proposal: proposalModal.data });
      fetchWalletBalance();
    } catch (err) {
      setProposalModal((prev) => ({ ...prev, accepting: false, error: err?.response?.data?.message || "Accept proposal thất bại." }));
    }
  };

  // Client gửi yêu cầu sửa — gửi message kèm toàn bộ nội dung proposal hiện tại làm tham chiếu,
  // KHÔNG gọi resubmit (resubmit là việc của expert tự làm sau khi đọc feedback này).
  const handleRequestRevision = async (feedbackText) => {
    if (!proposalModal?.data || !activeChat?.id) return;
    setProposalModal((prev) => ({ ...prev, requestingRevision: true, error: "" }));

    const p = proposalModal.data;
    const summary =
`Yêu cầu chỉnh sửa proposal (giữ nguyên thông tin cũ để đối chiếu):

— Proposed Price: $${p.proposedPrice?.toLocaleString() ?? "—"}
— Timeline: ${p.proposedTimelineDays ?? "—"} days
— Cover Letter: ${p.coverLetter ?? "—"}
— Expected Outputs: ${p.expectedOutputs ?? "—"}
— Working Approach: ${p.workingApproach ?? "—"}
— Milestone Plan: ${p.preliminaryMilestonePlan ?? "—"}

Ghi chú từ client: ${feedbackText || "(không có ghi chú thêm)"}`;

    try {
      await axiosInstance.post(`/conversations/${activeChat.id}/messages`, {
        content: summary,
        messageType: "TEXT",
        attachmentUrl: null,
      });
      await fetchMessages(activeChat.id, true);
      setProposalModal(null);
    } catch (err) {
      setProposalModal((prev) => ({ ...prev, requestingRevision: false, error: err?.response?.data?.message || "Gửi yêu cầu sửa thất bại." }));
    }
  };

  const handleViewContract = async () => {
    setShowAttachMenu(false);
    if (!activeChat?.relatedContractId) return;

    setContractModal({ loading: true, error: "", data: null });
    try {
      const res = await axiosInstance.get(`/contracts/${activeChat.relatedContractId}`);
      const data = res.data?.data ?? res.data;

      let proposalData = null;
      const proposalId = data?.relatedProposalId || data?.proposalId || activeChat?.relatedProposalId;
      if (proposalId) {
        try {
          const propRes = await axiosInstance.get(`/proposals/${proposalId}`);
          let rawProposal = propRes.data?.data ?? propRes.data;
          if (Array.isArray(rawProposal)) rawProposal = rawProposal[0] ?? null;
          proposalData = rawProposal;
        } catch {
          // Không chặn việc hiện contract nếu lookup proposal lỗi
        }
      }

      setContractModal({ loading: false, error: "", data, proposal: proposalData });
      fetchWalletBalance();
    } catch (err) {
      setContractModal({ loading: false, error: err?.response?.data?.message || "Không thể tải hợp đồng.", data: null });
    }
  };

  const handleConfirmContract = async () => {
    if (!contractModal?.data?.contractId) return;
    setContractModal((prev) => ({ ...prev, confirming: true, error: "" }));
    try {
      const res = await axiosInstance.post(`/contracts/${contractModal.data.contractId}/confirm`);
      const data = res.data?.data ?? res.data;

      // Tự gửi message báo "đã ký" vào conversation để 2 bên thấy ngay trong chat
      if (activeChat?.id) {
        try {
          await axiosInstance.post(`/conversations/${activeChat.id}/messages`, {
            content: "Client đã xác nhận hợp đồng.",
            messageType: "TEXT",
            attachmentUrl: null,
          });
          await fetchMessages(activeChat.id, true);
        } catch {
          // Không chặn flow chính nếu gửi message lỗi
        }
      }

      // Cả 2 bên đã confirm → tự động tạo Project
      if (data?.clientConfirmedAt && data?.expertConfirmedAt) {
        try {
          const projRes = await axiosInstance.post(`/projects/from-contract/${data.contractId}`);
          const projData = projRes.data?.data ?? projRes.data;

          setContractModal({ loading: false, error: "", data, confirming: false, projectCreated: projData });

          if (activeChat?.id) {
            await axiosInstance.post(`/conversations/${activeChat.id}/messages`, {
              content: "Cả hai bên đã xác nhận hợp đồng. Project đã được khởi tạo!",
              messageType: "TEXT",
              attachmentUrl: null,
            });
            await fetchMessages(activeChat.id, true);
          }
          return;
        } catch (projErr) {
          setContractModal({ loading: false, error: projErr?.response?.data?.message || "Cả 2 bên đã ký nhưng tạo Project thất bại. Vui lòng thử lại.", data, confirming: false });
          return;
        }
      }

      setContractModal(null);
    } catch (err) {
      setContractModal((prev) => ({ ...prev, confirming: false, error: err?.response?.data?.message || "Ký hợp đồng thất bại." }));
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
    if (!window.confirm("Xóa cuộc trò chuyện này? (Lưu ý: chỉ ẩn trên thiết bị này, BE chưa hỗ trợ xóa vĩnh viễn)")) return;

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
                {canReviewProposal && (
                  <button onClick={handleReviewProposal}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "linear-gradient(90deg, #1772eb, #00F0FF)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>description</span>
                    Tạo hợp đồng
                  </button>
                )}
                {activeChat.relatedContractId && (
                  <button onClick={handleViewContract}
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
                          {canReviewProposal && (
                            <button onClick={handleReviewProposal}
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

      {/* ── Modal review proposal (Accept hoặc Yêu cầu sửa) ── */}
      {proposalModal && (
        <ProposalReviewModal
          state={proposalModal}
          onClose={() => setProposalModal(null)}
          onAccept={handleAcceptAndCreateContract}
          onRequestRevision={handleRequestRevision}
        />
      )}

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

                {/* Project đã khởi tạo (cả 2 bên đã confirm) */}
                {contractModal.projectCreated && (
                  <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#22c55e" }}>celebration</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#22c55e", margin: "0 0 2px" }}>Project đã được khởi tạo!</p>
                      <p style={{ fontSize: 12, color: "#8c90a0", margin: 0 }}>Cả 2 bên đã xác nhận hợp đồng.</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button onClick={() => setContractModal(null)}
                    style={{ flex: 1, padding: "12px", background: "transparent", color: "#c2c6d6", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>
                    Đóng
                  </button>
                  {contractModal.projectCreated ? (
                    <button onClick={() => { setContractModal(null); navigate(`/client/projects/${contractModal.projectCreated.projectId}`); }}
                      style={{ flex: 2, padding: "12px", background: "linear-gradient(90deg, #1772eb, #00F0FF)", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
                      Xem Project
                    </button>
                  ) : contractModal.data.status !== "CONFIRMED" && !contractModal.data.clientConfirmedAt ? (
                    (() => {
                      // Client chỉ ký được khi ví đủ tiền — so với giá đã chốt trong proposal.
                      // Nếu chưa load được balance (null) thì coi như chưa xác định, không
                      // chặn cứng nhưng cũng không cho ký nhầm — hiện nút nạp tiền để an toàn.
                      const requiredAmount = contractModal.proposal?.proposedPrice ?? null;
                      const hasEnoughFunds = requiredAmount != null && walletBalance != null && walletBalance >= requiredAmount;

                      if (requiredAmount != null && !hasEnoughFunds) {
                        return (
                          <button onClick={() => { setContractModal(null); navigate("/client/wallet"); }}
                            style={{ flex: 2, padding: "12px", background: "rgba(250,204,21,0.1)", color: "#facc15", border: "1px solid rgba(250,204,21,0.3)", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>account_balance_wallet</span>
                            Nạp thêm tiền vào ví
                          </button>
                        );
                      }

                      return (
                        <button onClick={handleConfirmContract} disabled={contractModal.confirming}
                          style={{ flex: 2, padding: "12px", background: contractModal.confirming ? "#1d2026" : "linear-gradient(90deg, #1772eb, #00F0FF)", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: contractModal.confirming ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          {contractModal.confirming
                            ? <><span className="material-symbols-outlined" style={{ fontSize: 16, animation: "spin 1s linear infinite" }}>autorenew</span>Đang ký...</>
                            : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>draw</span>Ký hợp đồng</>}
                        </button>
                      );
                    })()
                  ) : null}
                </div>

                {/* Cảnh báo thiếu tiền — hiện ngay trên nút để rõ lý do bị ẩn nút Ký */}
                {!contractModal.projectCreated
                  && contractModal.data.status !== "CONFIRMED"
                  && !contractModal.data.clientConfirmedAt
                  && contractModal.proposal?.proposedPrice != null
                  && walletBalance != null
                  && walletBalance < contractModal.proposal.proposedPrice && (
                  <div style={{ display: "flex", gap: 10, padding: "10px 14px", background: "rgba(250,204,21,0.06)", border: "1px solid rgba(250,204,21,0.2)", borderRadius: 8, fontSize: 12.5, color: "#facc15" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, flexShrink: 0 }}>info</span>
                    <span>
                      Số dư ví hiện tại: <strong>{walletBalance.toLocaleString()}đ</strong> — cần ít nhất <strong>{contractModal.proposal.proposedPrice.toLocaleString()}đ</strong> để ký hợp đồng này.
                    </span>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}