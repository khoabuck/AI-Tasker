// src/modules/client/pages/ClientJobRecommendationPage.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance"; // ← adjust path nếu khác
import { findExistingConversationWithExpert } from "../../../utils/conversation.util";

const LEVEL_CONFIG = {
  JUNIOR: { label: "Junior", color: "#94a3b8" },
  MID:    { label: "Mid",    color: "#facc15" },
  SENIOR: { label: "Senior", color: "#00F0FF" },
  EXPERT: { label: "Expert", color: "#c0c1ff" },
};

function MatchScoreBar({ score }) {
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#facc15" : "#f97316";
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: "#8c90a0", fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase" }}>Match Score</span>
        <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: "JetBrains Mono, monospace" }}>{score.toFixed(1)}%</span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

// ── Message Modal ─────────────────────────────────────────────────────
function MessageModal({ expert, jobId, jobTitle, navigate, onClose }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    setSendError("");
    try {
      const existing = await findExistingConversationWithExpert(axiosInstance, {
        expertUserId: expert.userId,
      });

      let conversationId = existing?.conversationId ?? null;

      if (conversationId) {
        // Đã có hội thoại với expert này → gửi tiếp vào đó, không tạo mới.
        await axiosInstance.post(`/conversations/${conversationId}/messages`, {
          content: message,
          messageType: "TEXT",
          attachmentUrl: null,
        });
      } else {
        const res = await axiosInstance.post("/conversations", {
          conversationType: "JOB_INQUIRY",
          expertProfileId: expert.expertProfileId,
          relatedJobId: Number(jobId),
          initialMessage: message,
        });
        const conversation = res.data?.data ?? res.data;
        conversationId = conversation?.conversationId ?? conversation?.id;
      }

      setSent(true);
      setTimeout(() => {
        setSent(false);
        setMessage("");
        onClose();
        navigate(conversationId ? `/client/messages/${conversationId}` : "/client/messages");
      }, 800);
    } catch (err) {
      setSendError(err?.response?.data?.message || "Message sending failed. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "rgba(16,19,25,0.98)", border: "1px solid rgba(192,193,255,0.25)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={expert.avatarUrl} alt={expert.fullName}
              style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(192,193,255,0.3)" }} />
            <div>
              <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontWeight: 700, fontSize: 15, color: "#e1e2eb", margin: 0 }}>{expert.fullName}</h3>
              <p style={{ fontSize: 11, color: "#c0c1ff", fontFamily: "JetBrains Mono, monospace", margin: 0 }}>{expert.professionalTitle}</p>
            </div>
          </div>
          <button onClick={onClose}
            style={{ background: "none", border: "none", color: "#8c90a0", cursor: "pointer", padding: 4 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#e1e2eb")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#8c90a0")}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        {/* Message input */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", marginBottom: 8 }}>Your Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Hi ${expert.fullName.split(" ")[0]}, I would like to invite you to apply for my project...`}
            rows={5}
            style={{ width: "100%", background: "#1d2026", border: "1px solid rgba(192,193,255,0.2)", borderRadius: 10, padding: "12px 14px", color: "#e1e2eb", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 14, resize: "none", boxSizing: "border-box", transition: "border-color 0.2s", lineHeight: 1.6 }}
            onFocus={(e) => (e.target.style.borderColor = "#c0c1ff")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(192,193,255,0.2)")}
          />
          <p style={{ fontSize: 11, color: "#8c90a0", marginTop: 6 }}>{message.length}/500 characters</p>
        </div>

        {/* Send error */}
        {sendError && (
          <p style={{ fontSize: 12, color: "#f87171", marginBottom: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "8px 12px" }}>
            {sendError}
          </p>
        )}

        {/* Quick templates */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: "#8c90a0", fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Quick templates:</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
                `Hi ${expert.fullName.split(" ")[0]}, I would like to invite you to apply for my job: ${jobTitle || "this project"}.`,
                `Your skills look like a strong match for my project. Please take a look and let me know if you are interested.`,
                `Hi ${expert.fullName.split(" ")[0]}, I reviewed your profile and would like to invite you to discuss this job opportunity.`,
              ].map((t) => (
              <button key={t} onClick={() => setMessage(t)}
                style={{ padding: "4px 10px", background: "rgba(192,193,255,0.06)", border: "1px solid rgba(192,193,255,0.15)", borderRadius: 6, fontSize: 11, color: "#c0c1ff", cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "all 0.2s", textAlign: "left" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(192,193,255,0.12)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(192,193,255,0.06)")}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "11px", background: "transparent", color: "#c2c6d6", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            Cancel
          </button>
          <button onClick={handleSend} disabled={sending || !message.trim() || sent}
            style={{ flex: 2, padding: "11px", background: sent ? "#22c55e" : sending || !message.trim() ? "rgba(192,193,255,0.2)" : "rgba(192,193,255,0.15)", color: sent ? "#002022" : "#c0c1ff", border: `1px solid ${sent ? "#22c55e" : "rgba(192,193,255,0.3)"}`, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: sending || !message.trim() ? "not-allowed" : "pointer", fontFamily: "Hanken Grotesk, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s", boxShadow: sent ? "0 0 12px rgba(34,197,94,0.3)" : message.trim() ? "0 0 12px rgba(192,193,255,0.15)" : "none" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {sent ? "check_circle" : sending ? "hourglass_empty" : "send"}
            </span>
            {sent ? "Invite Sent!" : sending ? "Sending..." : "Send Invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function ClientJobRecommendationPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [experts, setExperts] = useState([]);
  const [jobTitle, setJobTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invitingExpert, setInvitingExpert] = useState(null);
  const [invitePopup, setInvitePopup] = useState({
    open: false,
    type: "success",
    message: "",
  });

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        // Gọi song song: recommendations + job title
        const [recRes, jobRes] = await Promise.all([
          axiosInstance.get(`/recommendations/jobs/${id}/experts`, {
            signal: controller.signal,
          }),
          axiosInstance.get(`/jobs/${id}`, {
            signal: controller.signal,
          }),
        ]);

        // BE có thể trả về array trực tiếp hoặc bọc trong data/items/experts
        const raw = recRes.data;
        setExperts(Array.isArray(raw) ? raw : raw.experts ?? raw.items ?? raw.data ?? []);

        // Lấy title từ job detail
        const job = jobRes.data;
        setJobTitle(job.title ?? job.jobTitle ?? "");
      } catch (err) {
        if (err?.code === "ERR_CANCELED") return; // unmount, bỏ qua
        const msg =
          err?.response?.status === 404
            ? "No data was found suggesting this job."
            : err?.response?.status === 403
            ? "You do not have permission to view this page."
            : err?.response?.data?.message || "An error occurred. Please try again.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => controller.abort(); // cleanup khi unmount
  }, [id]);

  // ── Retry handler ──────────────────────────────────────────────────
  const handleRetry = () => {
    setExperts([]);
    setError("");
    setLoading(true);
    // trigger lại useEffect bằng cách force re-mount hoặc dùng key state
    // Cách đơn giản: duplicate logic hoặc dùng callback ref. Ở đây reload page là đủ:
    window.location.reload();
  };

  return (
    <ClientLayout>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px" }}>

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#8c90a0", cursor: "pointer", fontSize: 14, marginBottom: 28, padding: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#e1e2eb")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#8c90a0")}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
          Back
        </button>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span className="material-symbols-outlined" style={{ color: "#c0c1ff", fontSize: 28, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 28, fontWeight: 700, color: "#e1e2eb", margin: 0 }}>
              AI <span style={{ color: "#c0c1ff" }}>Recommendations</span>
            </h1>
          </div>
          {jobTitle && (
            <p style={{ color: "#8c90a0", fontSize: 14, margin: 0 }}>
              Experts matched for: <span style={{ color: "#c2c6d6", fontWeight: 600 }}>{jobTitle}</span>
            </p>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#8c90a0" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 16, animation: "spin 1s linear infinite", color: "#c0c1ff" }}>autorenew</span>
            AI is analyzing experts...
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "20px 24px", textAlign: "center" }}>
            <p style={{ color: "#f87171", fontSize: 14, marginBottom: 14 }}>{error}</p>
            <button
              onClick={handleRetry}
              style={{ padding: "8px 20px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#f87171", fontSize: 13, cursor: "pointer" }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && experts.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#8c90a0" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 12, color: "#3d4050" }}>person_search</span>
            <p style={{ fontSize: 15, marginBottom: 6 }}>No recommendations yet for this job.</p>
            <p style={{ fontSize: 13 }}>Please try again after the job has been analyzed by AI.</p>
          </div>
        )}

        {/* Expert list */}
        {!loading && !error && experts.length > 0 && (
          <>
            <p style={{ color: "#8c90a0", fontSize: 13, marginBottom: 20 }}>
              Found <span style={{ color: "#c0c1ff", fontWeight: 700 }}>{experts.length}</span> experts ranked by AI match score
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {experts.map((expert, index) => {
                const level = LEVEL_CONFIG[expert.level] || { label: expert.level, color: "#8c90a0" };
                return (
                  <div
                    key={expert.expertProfileId}
                    style={{ background: "rgba(16,19,25,0.85)", backdropFilter: "blur(20px)", border: "1px solid rgba(192,193,255,0.12)", borderRadius: 16, padding: 24, transition: "all 0.2s", position: "relative", overflow: "hidden" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(192,193,255,0.35)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(192,193,255,0.06)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(192,193,255,0.12)"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    {/* Rank badge */}
                    <div style={{ position: "absolute", top: 16, right: 16, width: 28, height: 28, borderRadius: "50%", background: index === 0 ? "rgba(192,193,255,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${index === 0 ? "rgba(192,193,255,0.4)" : "rgba(255,255,255,0.1)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color: index === 0 ? "#c0c1ff" : "#8c90a0" }}>#{index + 1}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, paddingRight: 40 }}>
                      {/* Avatar */}
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        <img
                          src={expert.avatarUrl || `https://i.pravatar.cc/100?u=${expert.expertProfileId}`}
                          alt={expert.fullName}
                          style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(192,193,255,0.25)" }}
                        />
                        {expert.availableForWork && (
                          <span style={{ position: "absolute", bottom: 2, right: 2, width: 12, height: 12, borderRadius: "50%", background: "#22c55e", border: "2px solid #101319" }} />
                        )}
                      </div>

                      <div style={{ flex: 1 }}>
                        {/* Name + level */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontWeight: 700, fontSize: 17, color: "#e1e2eb", margin: 0 }}>{expert.fullName}</h3>
                          <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 9, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", background: level.color + "20", color: level.color, border: `1px solid ${level.color}40` }}>{level.label}</span>
                        </div>
                        <p style={{ fontSize: 12, color: "#c0c1ff", fontFamily: "JetBrains Mono, monospace", margin: "0 0 10px" }}>{expert.professionalTitle}</p>

                        {/* Stats */}
                        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 12 }}>
                          <span style={{ fontSize: 12, color: "#8c90a0" }}>{expert.yearsOfExperience} yrs exp</span>
                          <span style={{ fontSize: 12, color: "#8c90a0" }}>Score: <span style={{ color: "#facc15" }}>{expert.profileScore}</span>/100</span>
                          <span style={{ fontSize: 12, color: "#c2c6d6", fontFamily: "JetBrains Mono, monospace" }}>
                            
                          </span>
                          {!expert.availableForWork && <span style={{ fontSize: 12, color: "#f97316" }}>Not available</span>}
                        </div>

                        <MatchScoreBar score={expert.matchScore} />

                        {/* AI reason */}
                        {expert.matchReason && (
                          <div style={{ background: "rgba(192,193,255,0.04)", border: "1px solid rgba(192,193,255,0.1)", borderRadius: 8, padding: "8px 12px", marginTop: 12 }}>
                            <p style={{ fontSize: 12, color: "#c2c6d6", margin: 0, lineHeight: 1.6 }}>
                              <span style={{ color: "#c0c1ff", fontWeight: 600 }}>AI: </span>{expert.matchReason}
                            </p>
                          </div>
                        )}

                        {/* Risk note */}
                        {expert.riskNote && (
                          <p style={{ fontSize: 11, color: "#f97316", margin: "8px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>warning</span>
                            {expert.riskNote}
                          </p>
                        )}

                        {/* Skills */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                          {(expert.matchedSkills || []).map((s) => (
                            <span key={s.skillId} style={{ padding: "3px 10px", background: "rgba(192,193,255,0.08)", border: "1px solid rgba(192,193,255,0.2)", borderRadius: 999, fontSize: 11, color: "#c0c1ff", fontFamily: "JetBrains Mono, monospace" }}>{s.skillName}</span>
                          ))}
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                          {/* View Profile — cyan */}
                          <button
                            onClick={() => navigate(`/client/experts/${expert.expertProfileId}`)}
                            style={{ flex: 1, padding: "9px", background: "rgba(0,240,255,0.05)", color: "#00F0FF", border: "1px solid rgba(0,240,255,0.25)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,240,255,0.12)"; e.currentTarget.style.boxShadow = "0 0 12px rgba(0,240,255,0.2)"; e.currentTarget.style.borderColor = "#00F0FF"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,240,255,0.05)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "rgba(0,240,255,0.25)"; }}
                          >
                            View Profile
                          </button>


                          {/* Invite — green */}
                          <button
                            onClick={() => setInvitingExpert(expert)}
                            style={{ flex: 1, padding: "9px", background: "rgba(34,197,94,0.08)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.2s" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(34,197,94,0.15)"; e.currentTarget.style.boxShadow = "0 0 12px rgba(34,197,94,0.2)"; e.currentTarget.style.borderColor = "#22c55e"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(34,197,94,0.08)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "rgba(34,197,94,0.25)"; }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>send</span>
                            Invite
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Invite Modal */}
      {invitingExpert && (
        <MessageModal
          expert={invitingExpert}
          jobId={id}
          jobTitle={jobTitle}
          navigate={navigate}
          onClose={() => setInvitingExpert(null)}
        />
      )}
      {invitePopup.open && (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/65 p-6 backdrop-blur-sm"
          onClick={() => setInvitePopup((prev) => ({ ...prev, open: false }))}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-[420px] rounded-2xl border bg-[#101319] p-7 text-center shadow-2xl ${
              invitePopup.type === "success"
                ? "border-emerald-400/40"
                : "border-red-400/40"
            }`}
          >
            <div
              className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border ${
                invitePopup.type === "success"
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-400"
                  : "border-red-400/40 bg-red-400/10 text-red-400"
              }`}
            >
              <span className="material-symbols-outlined text-3xl">
                {invitePopup.type === "success" ? "check_circle" : "error"}
              </span>
            </div>

            <h3 className="mb-2 text-xl font-extrabold text-[#e1e2eb]">
              {invitePopup.type === "success" ? "Invite Sent" : "Invite Failed"}
            </h3>

            <p className="mb-6 text-sm leading-6 text-[#c2c6d6]">
              {invitePopup.message}
            </p>

            <button
              type="button"
              onClick={() => setInvitePopup((prev) => ({ ...prev, open: false }))}
              className="w-full rounded-xl border border-[#c0c1ff]/30 bg-[#c0c1ff]/10 px-4 py-3 text-sm font-bold text-[#c0c1ff] transition hover:bg-[#c0c1ff]/20"
            >
              OK
            </button>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </ClientLayout>
  );



}