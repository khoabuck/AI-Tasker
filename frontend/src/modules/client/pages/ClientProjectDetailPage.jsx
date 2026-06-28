// src/modules/client/pages/ClientProjectDetailPage.jsx
//
// GET  /api/projects/{projectId}                → thông tin project
// GET  /api/projects/{projectId}/milestones      → danh sách milestone
// POST /api/disputes                             → mở dispute mới
//      { projectId, milestoneId, respondentUserId, disputedAmount, reason, evidenceText, evidenceFileUrl }
//
// Nút "Open Dispute" xuất hiện ở 2 nơi theo đúng ngữ cảnh:
//  - Cạnh từng milestone, khi project đang ACTIVE — milestoneId gắn trực tiếp vào milestone đó.
//  - Ở cấp toàn project, chỉ khi project đã COMPLETED — milestoneId để null (tranh chấp sau
//    khi đã nhận toàn bộ sản phẩm, không gắn riêng 1 milestone).

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";

const STATUS_CONFIG = {
  ACTIVE:    { label: "Active",    color: "#facc15", bg: "rgba(250,204,21,0.08)", border: "rgba(250,204,21,0.25)" },
  COMPLETED: { label: "Completed", color: "#22c55e", bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.25)"  },
  DISPUTED:  { label: "Disputed",  color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.25)" },
};

const MILESTONE_STATUS = {
  PENDING:   { label: "Pending",   color: "#8c90a0" },
  SUBMITTED: { label: "Submitted", color: "#facc15" },
  APPROVED:  { label: "Approved",  color: "#22c55e" },
  REJECTED:  { label: "Rejected",  color: "#f87171" },
};

const cardStyle = {
  background: "rgba(16,19,25,0.85)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 16,
  padding: 28,
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
};

// ── Open Dispute Modal ──────────────────────────────────────────────
function OpenDisputeModal({ project, milestone, onClose, onSubmitted }) {
  const [reason, setReason] = useState("");
  const [disputedAmount, setDisputedAmount] = useState(milestone?.amount ?? project?.totalAmount ?? "");
  const [evidenceText, setEvidenceText] = useState("");
  const [evidenceFileUrl, setEvidenceFileUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const respondentUserId =
    project?.expertUserId ??
    project?.expert?.userId ??
    project?.expert?.expertUserId ??
    project?.expertProfile?.userId ??
    project?.expertProfile?.expertUserId;

  // BE chỉ có /uploads/images — chỉ hỗ trợ ảnh làm bằng chứng (screenshot, ảnh chụp
  // sản phẩm lỗi...). Không có endpoint upload PDF/file thường, nên ô input giới
  // hạn accept="image/*" để tránh người dùng chọn file sẽ luôn lỗi khi gửi lên.
  const handleUploadImage = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axiosInstance.post("/uploads/images", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const raw = res.data?.data ?? res.data;

      const url =
        raw?.url ??
        raw?.fileUrl ??
        raw?.imageUrl ??
        raw?.path ??
        raw?.data?.url ??
        "";

      setEvidenceFileUrl(String(url || ""));
    } catch (err) {
      setUploadError(err?.response?.data?.message || "Image upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError("Please enter the reason for your complaint.");
      return;
    }

    if (!Number(project?.projectId ?? project?.id)) {
      setError("Project not identified. Please reload the page.");
      return;
    }

    if (!Number(respondentUserId)) {
      setError("Expert not identified. Please reload the page.");
      return;
    }

    if (!Number(disputedAmount) || Number(disputedAmount) <= 0) {
      setError("The amount in dispute must be greater than 0.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const payload = {
        projectId: Number(project.projectId ?? project.id),
        milestoneId: Number(milestone?.milestoneId ?? milestone?.id ?? 0),
        respondentUserId: Number(respondentUserId),
        disputedAmount: Number(disputedAmount) || 0,
        reason: reason.trim(),
        evidenceText: evidenceText.trim() || "",
        evidenceFileUrl: String(evidenceFileUrl || ""),
      };

      console.log("DISPUTE_PAYLOAD:");
      console.log(JSON.stringify(payload, null, 2));

      await axiosInstance.post("/disputes", payload);
      onSubmitted();
      onClose();
    } catch (err) {
        console.log("DISPUTE_ERROR_STATUS:", err?.response?.status);
        console.log("DISPUTE_ERROR_DATA:", err?.response?.data);

        setError(
          err?.response?.data?.message ||
          err?.response?.data?.title ||
          "Complaint filed failed. Please try again."
        );
      }finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "rgba(16,19,25,0.98)", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 520, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 19, fontWeight: 700, color: "#f97316", margin: "0 0 4px" }}>Open Dispute</h3>
            <p style={{ fontSize: 12, color: "#8c90a0", margin: 0 }}>
              {milestone ? `Related to milestones: ${milestone.title || "Milestone"}` : "Complaint for the entire project"}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8c90a0", cursor: "pointer" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", marginBottom: 8 }}>
              Amount in dispute (VND)
            </label>
            <input type="number" value={disputedAmount} onChange={(e) => setDisputedAmount(e.target.value)}
              style={{ width: "100%", background: "#1d2026", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "12px 14px", color: "#e1e2eb", outline: "none", fontFamily: "JetBrains Mono, monospace", fontSize: 14, boxSizing: "border-box" }} />
          </div>

          <div>
            <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", marginBottom: 8 }}>
              Reason for complaint <span style={{ color: "#f87171" }}>*</span>
            </label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
              placeholder="Example: The delivered product does not meet the agreed-upon requirements..."
              style={{ width: "100%", background: "#1d2026", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "12px 14px", color: "#e1e2eb", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 14, resize: "none", boxSizing: "border-box" }} />
          </div>

          <div>
            <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", marginBottom: 8 }}>
              Evidence (further description)
            </label>
            <textarea value={evidenceText} onChange={(e) => setEvidenceText(e.target.value)} rows={3}
              placeholder="Provide detailed evidence, including links to documents, screenshots of messages, etc."
              style={{ width: "100%", background: "#1d2026", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "12px 14px", color: "#e1e2eb", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 14, resize: "none", boxSizing: "border-box" }} />
          </div>

          {/* Upload ảnh bằng chứng — chỉ hỗ trợ ảnh vì BE chỉ có /uploads/images */}
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#8c90a0",
                marginBottom: 8,
              }}
            >
              Proof link (optional)
            </label>

            <input
              type="url"
              value={evidenceFileUrl}
              onChange={(e) => setEvidenceFileUrl(e.target.value)}
              placeholder="https://drive.google.com/... hoặc https://example.com/file.pdf"
              style={{
                width: "100%",
                background: "#1d2026",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                padding: "12px 14px",
                color: "#e1e2eb",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            <p
              style={{
                marginTop: 8,
                color: "#8c90a0",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              Paste the Google Drive, Dropbox, OneDrive link
            </p>

            {uploadError && (
              <p style={{ fontSize: 12, color: "#f87171", marginTop: 6 }}>{uploadError}</p>
            )}
            <p style={{ fontSize: 11, color: "#5b6470", marginTop: 6, marginBottom: 0 }}>
              Only images are supported. To attach other documents (PDF, video, etc.), paste the link into the "Proof" box above.
            </p>
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13 }}>{error}</div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "transparent", color: "#c2c6d6", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting || uploading}
              style={{ flex: 2, padding: "12px", background: submitting ? "#1d2026" : "#f97316", color: submitting ? "#8c90a0" : "#1a0a00", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: submitting || uploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {submitting
                ? <><span className="material-symbols-outlined" style={{ fontSize: 16, animation: "spin 1s linear infinite" }}>autorenew</span>Sending...</>
                : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>gavel</span>Submit a complaint</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientProjectDetailPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [disputeModal, setDisputeModal] = useState(null); // { milestone } | { milestone: null } khi mở cho cả project
  // bannerMsg dùng chung cho mọi thông báo thành công cần hiện khi quay lại trang
  // này — ví dụ sau khi vừa approve 1 deliverable ở MilestoneDeliverablesPage và
  // navigate về đây kèm state.successMsg, hoặc sau khi vừa mở dispute thành công.
  const [bannerMsg, setBannerMsg] = useState(location.state?.successMsg || "");

  const fetchData = useCallback(async (signal, silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    setError("");

    try {
      const res = await axiosInstance.get(`/projects/${projectId}`, { signal });
      const projectData = res.data?.data ?? res.data;
      setProject(projectData);

      try {
        const msRes = await axiosInstance.get(`/projects/${projectId}/milestones`, { signal });
        const msRaw = msRes.data?.data ?? msRes.data;
        setMilestones(Array.isArray(msRaw) ? msRaw : msRaw?.items ?? []);
      } catch {
        setMilestones([]);
      }
    } catch (err) {
      if (err?.code === "ERR_CANCELED") return;

      if (!silent) {
        setError(err?.response?.data?.message || "Unable to load project information.");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [projectId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  useEffect(() => {
    if (project?.status !== "ACTIVE") return;

    const intervalId = setInterval(() => {
      fetchData(undefined, true);
    }, 3000);

    return () => clearInterval(intervalId);
  }, [project?.status, fetchData]);

  if (loading) {
    return (
      <ClientLayout>
        <div style={{ textAlign: "center", padding: "120px 0", color: "#8c90a0" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 16, animation: "spin 1s linear infinite", color: "#00F0FF" }}>autorenew</span>
          Loading project...
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </ClientLayout>
    );
  }

  if (error || !project) {
    return (
      <ClientLayout>
        <div style={{ textAlign: "center", padding: "120px 24px" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#f87171", display: "block", marginBottom: 12 }}>error_outline</span>
          <p style={{ color: "#f87171", fontSize: 15, marginBottom: 20 }}>{error || "Project not found."}</p>
          <button onClick={() => navigate("/client/projects")}
            style={{ padding: "10px 24px", background: "#00F0FF", color: "#002022", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
            Back to list
          </button>
        </div>
      </ClientLayout>
    );
  }

  const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.ACTIVE;
  const expertName = project.expertName || project.expert?.fullName || "Expert";
  const startDate = project.startDate || project.createdAt
    ? new Date(project.startDate || project.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  // Milestone "đang làm" = milestone đầu tiên chưa APPROVED.
  const currentMilestoneIndex = milestones.findIndex((m) => m.status !== "APPROVED");
  const currentMilestone = currentMilestoneIndex >= 0 ? milestones[currentMilestoneIndex] : null;

  return (
    <ClientLayout>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>

        {/* Back */}
        <button onClick={() => navigate(-1)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#8c90a0", cursor: "pointer", fontSize: 14, marginBottom: 24, padding: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
          Back 
        </button>

        {/* Header card */}
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
            <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 24, fontWeight: 700, color: "#e1e2eb", margin: 0 }}>
              {project.title || project.jobTitle}
            </h1>
            <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", color: statusCfg.color, background: statusCfg.bg, border: `1px solid ${statusCfg.border}` }}>
              {statusCfg.label}
            </span>
          </div>
          <p style={{ fontSize: 13, color: "#8c90a0", margin: "0 0 20px" }}>Started {startDate}</p>

          {/* Expert info */}
          <div style={{ paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <img src={project.expertAvatar || `https://i.pravatar.cc/80?u=${project.expertId}`} alt={expertName}
              style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(0,240,255,0.25)" }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#e1e2eb", margin: "0 0 2px", fontFamily: "Hanken Grotesk, sans-serif" }}>{expertName}</p>
              <p style={{ fontSize: 12, color: "#8c90a0", margin: 0 }}>{project.expertTitle || "AI Expert"}</p>
            </div>

            <button onClick={() => navigate(project.conversationId ? `/client/messages?conversationId=${project.conversationId}` : "/client/messages")}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "rgba(192,193,255,0.08)", color: "#c0c1ff", border: "1px solid rgba(192,193,255,0.25)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chat</span>
              Message
            </button>

            {project.status === "COMPLETED" && (
              <>
                <button onClick={() => navigate(`/client/projects/${projectId}/review`)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "rgba(250,204,21,0.08)", color: "#facc15", border: "1px solid rgba(250,204,21,0.25)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>star</span>
                  Leave Review
                </button>

                {/* Open Dispute cho toàn project — chỉ khi đã COMPLETED, không gắn milestone cụ thể */}
                <button onClick={() => setDisputeModal({ milestone: null })}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "rgba(249,115,22,0.08)", color: "#f97316", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>gavel</span>
                  Open Dispute
                </button>
              </>
            )}

            {project.status === "DISPUTED" && (
              <button onClick={() => navigate(`/client/disputes?projectId=${projectId}`)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "rgba(249,115,22,0.08)", color: "#f97316", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>gavel</span>
                View Dispute
              </button>
            )}
          </div>
        </div>

        {bannerMsg && (
          <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 10, padding: "12px 16px", color: "#4ade80", fontSize: 14, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
            {bannerMsg}
          </div>
        )}

        {/* Banner milestone hiện tại — chỉ có ý nghĩa khi project còn ACTIVE */}
        {project.status === "ACTIVE" && currentMilestone && (
          <div style={{ ...cardStyle, marginBottom: 20, border: "1px solid rgba(250,204,21,0.25)", background: "rgba(250,204,21,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 28, color: "#facc15" }}>flag</span>
                <div>
                  <p style={{ fontSize: 11, color: "#8c90a0", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 2px", fontFamily: "JetBrains Mono, monospace" }}>
                    Expert is working on it.
                  </p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#e1e2eb", margin: 0 }}>
                    {currentMilestone.title || `Milestone ${currentMilestoneIndex + 1}`}
                  </p>
                </div>
              </div>
              <span style={{ padding: "5px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", color: "#facc15", background: "rgba(250,204,21,0.12)", border: "1px solid rgba(250,204,21,0.3)" }}>
                {currentMilestoneIndex + 1} / {milestones.length}
              </span>
            </div>

            {milestones.length > 0 && (
              <div style={{ marginTop: 16, display: "flex", gap: 4 }}>
                {milestones.map((m, i) => {
                  const done = m.status === "APPROVED";
                  const active = i === currentMilestoneIndex;
                  return (
                    <div key={m.milestoneId ?? i} style={{ flex: 1, height: 6, borderRadius: 3, background: done ? "#22c55e" : active ? "#facc15" : "rgba(255,255,255,0.08)" }} />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Milestone list */}
        <div style={cardStyle}>
          <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 16, fontWeight: 700, color: "#e1e2eb", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            Milestones
          </h3>

          {milestones.length === 0 ? (
            <p style={{ fontSize: 14, color: "#8c90a0", textAlign: "center", padding: "24px 0" }}>No milestones have been created yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {milestones.map((m, index) => {
                const normalizedStatus = (m.status || "").toUpperCase();
                const mCfg = MILESTONE_STATUS[m.status] || MILESTONE_STATUS.PENDING;
                const isCurrent = index === currentMilestoneIndex;
                const hasSubmittedDeliverable = m.status === "SUBMITTED";

                return (
                  <div key={m.milestoneId ?? index}
                    style={{ background: isCurrent ? "rgba(250,204,21,0.04)" : "rgba(255,255,255,0.02)", border: `1px solid ${isCurrent ? "rgba(250,204,21,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {isCurrent && <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#facc15" }}>arrow_right</span>}
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#e1e2eb", margin: "0 0 4px" }}>
                          {m.title || `Milestone ${index + 1}`}
                        </p>
                      </div>
                      {m.description && (
                        <p style={{ fontSize: 13, color: "#8c90a0", margin: 0 }}>{m.description}</p>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      {m.amount != null && (
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, color: "#00F0FF", fontWeight: 700 }}>
                          ${m.amount.toLocaleString()}
                        </span>
                      )}
                      <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", color: mCfg.color, background: mCfg.color + "15", border: `1px solid ${mCfg.color}40` }}>
                        {mCfg.label}
                      </span>
                      {hasSubmittedDeliverable && (
                        <button onClick={() => navigate(`/client/milestones/${m.milestoneId}/deliverables`)}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "rgba(192,193,255,0.1)", color: "#c0c1ff", border: "1px solid rgba(192,193,255,0.3)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>visibility</span>
                          Review
                        </button>
                      )}

                      {/* Open Dispute gắn theo milestone — chỉ khi project còn ACTIVE.
                          Khi đã COMPLETED, dispute chỉ mở ở cấp project (nút header phía trên). */}
                      {project.status === "ACTIVE" && (
                        <button onClick={() => setDisputeModal({ milestone: m })}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "rgba(249,115,22,0.08)", color: "#f97316", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>gavel</span>
                          Dispute
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {disputeModal && (
        <OpenDisputeModal
          project={project}
          milestone={disputeModal.milestone}
          onClose={() => setDisputeModal(null)}
          onSubmitted={() => setBannerMsg("The complaint has been submitted. The administrator will review it and respond as soon as possible.")}
        />
      )}
    </ClientLayout>
  );
}