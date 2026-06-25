// src/modules/client/pages/MilestoneDeliverablesPage.jsx
//
// GET  /api/milestones/{milestoneId}                       → thông tin milestone
// GET  /api/milestones/{milestoneId}/deliverables           → list deliverable đã submit
// POST /api/deliverables/{deliverableId}/approve            → Client chấp nhận deliverable
// POST /api/deliverables/{deliverableId}/request-revision   → Client yêu cầu sửa lại (RevisionRequest)

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";

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

const STATUS_CONFIG = {
  SUBMITTED: { label: "Submitted", color: "#facc15" },
  APPROVED:  { label: "Approved",  color: "#22c55e" },
  REJECTED:  { label: "Revision Requested", color: "#f87171" },
};

// Hiển thị 1 link field — nhiều field deliverable trỏ về cùng 1 URL placeholder
// trong dữ liệu test hiện tại (fileUrl/demoUrl/testResultUrl giống nhau), nhưng
// về mặt schema đây là 3 link khác nhau nên vẫn hiển thị riêng từng ô.
function LinkRow({ icon, label, url }) {
  if (!url) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#00F0FF", flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, color: "#8c90a0", margin: "0 0 2px", fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
        <a href={url} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 13, color: "#c2c6d6", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#00F0FF")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#c2c6d6")}>
          {url}
        </a>
      </div>
      <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#8c90a0", flexShrink: 0 }}>open_in_new</span>
    </div>
  );
}

// ── Request Revision Modal ──────────────────────────────────────────
function RequestRevisionModal({ onClose, onSubmit, submitting, error }) {
  const [note, setNote] = useState("");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "rgba(16,19,25,0.98)", border: "1px solid rgba(250,204,21,0.25)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 18, fontWeight: 700, color: "#facc15", margin: 0 }}>Request Revision</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8c90a0", cursor: "pointer" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        <label style={sectionLabel}>Nội dung cần sửa lại <span style={{ color: "#f87171" }}>*</span></label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={5}
          placeholder="Mô tả cụ thể phần nào chưa đạt yêu cầu, cần sửa gì..."
          style={{ width: "100%", background: "#1d2026", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "12px 14px", color: "#e1e2eb", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 14, resize: "none", boxSizing: "border-box", marginBottom: 16 }} />

        {error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 16 }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "transparent", color: "#c2c6d6", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>
            Hủy
          </button>
          <button onClick={() => onSubmit(note)} disabled={submitting || !note.trim()}
            style={{ flex: 2, padding: "12px", background: submitting ? "#1d2026" : "#facc15", color: submitting ? "#8c90a0" : "#1d1500", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: submitting || !note.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {submitting
              ? <><span className="material-symbols-outlined" style={{ fontSize: 16, animation: "spin 1s linear infinite" }}>autorenew</span>Đang gửi...</>
              : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit_note</span>Gửi yêu cầu sửa</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MilestoneDeliverablesPage() {
  const { milestoneId } = useParams();
  const navigate = useNavigate();

  const [milestone, setMilestone] = useState(null);
  const [deliverable, setDeliverable] = useState(null); // bản mới nhất (versionNumber cao nhất)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null); // "approve" | "revision"
  const [actionError, setActionError] = useState("");
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchData = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const msRes = await axiosInstance.get(`/milestones/${milestoneId}`, { signal });
      const msData = msRes.data?.data ?? msRes.data;
      setMilestone(msData);

      const delRes = await axiosInstance.get(`/milestones/${milestoneId}/deliverables`, { signal });
      const delRaw = delRes.data?.data ?? delRes.data;
      const list = Array.isArray(delRaw) ? delRaw : delRaw?.items ?? [];

      // Lấy bản deliverable mới nhất theo versionNumber, vì 1 milestone có thể có
      // nhiều lần submit (sau khi client request revision, expert nộp lại bản mới).
      const latest = [...list].sort((a, b) => (b.versionNumber ?? 0) - (a.versionNumber ?? 0))[0] ?? null;
      setDeliverable(latest);
    } catch (err) {
      if (err?.code === "ERR_CANCELED") return;
      setError(err?.response?.data?.message || "Không thể tải deliverable.");
    } finally {
      setLoading(false);
    }
  }, [milestoneId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const handleApprove = async () => {
    if (!deliverable?.deliverableId) return;
    if (!confirm("Xác nhận deliverable này đã đạt yêu cầu? Hành động này không thể hoàn tác.")) return;

    setActionLoading("approve");
    setActionError("");
    try {
      await axiosInstance.post(`/deliverables/${deliverable.deliverableId}/approve`);
      // Approve xong → Expert đã được mở khóa làm milestone tiếp theo (và nhận
      // notification riêng từ BE). Phía Client, đưa thẳng về trang Project Detail
      // để thấy ngay banner "Expert đang làm tới" đã nhảy sang milestone mới,
      // không cần ở lại trang deliverable này nữa.
      navigate(`/client/projects/${milestone.projectId}`, {
        state: { successMsg: "Deliverable đã được chấp nhận! Tiền đã giải ngân, Expert có thể bắt đầu milestone tiếp theo." },
      });
    } catch (err) {
      setActionError(err?.response?.data?.message || "Approve thất bại. Vui lòng thử lại.");
      setActionLoading(null);
    }
  };

  const handleRequestRevision = async (note) => {
    if (!deliverable?.deliverableId) return;

    setActionLoading("revision");
    setActionError("");
    try {
      await axiosInstance.post(`/deliverables/${deliverable.deliverableId}/request-revision`, {
        feedback: note,
      });
      setShowRevisionModal(false);
      setSuccessMsg("Yêu cầu sửa đã được gửi cho Expert.");
      await fetchData();
    } catch (err) {
      setActionError(err?.response?.data?.message || "Gửi yêu cầu sửa thất bại.");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <ClientLayout>
        <div style={{ textAlign: "center", padding: "120px 0", color: "#8c90a0" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 16, animation: "spin 1s linear infinite", color: "#00F0FF" }}>autorenew</span>
          Loading deliverable...
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </ClientLayout>
    );
  }

  if (error || !milestone) {
    return (
      <ClientLayout>
        <div style={{ textAlign: "center", padding: "120px 24px" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#f87171", display: "block", marginBottom: 12 }}>error_outline</span>
          <p style={{ color: "#f87171", fontSize: 15, marginBottom: 20 }}>{error || "Không tìm thấy milestone."}</p>
          <button onClick={() => navigate(-1)}
            style={{ padding: "10px 24px", background: "#00F0FF", color: "#002022", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
            Quay lại
          </button>
        </div>
      </ClientLayout>
    );
  }

  const dStatus = STATUS_CONFIG[deliverable?.status] || STATUS_CONFIG.SUBMITTED;
  const canReview = deliverable?.status === "SUBMITTED";
  const submittedAt = deliverable?.submittedAt
    ? new Date(deliverable.submittedAt).toLocaleString("vi-VN")
    : "—";
  const reviewDeadline = deliverable?.reviewDeadlineAt
    ? new Date(deliverable.reviewDeadlineAt).toLocaleString("vi-VN")
    : null;

  return (
    <ClientLayout>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>

        <button onClick={() => navigate(`/client/projects/${milestone.projectId}`)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#8c90a0", cursor: "pointer", fontSize: 14, marginBottom: 24, padding: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
          Back to Project
        </button>

        {successMsg && (
          <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 10, padding: "12px 16px", color: "#4ade80", fontSize: 14, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
            {successMsg}
          </div>
        )}

        {/* Header */}
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 12, color: "#8c90a0", margin: "0 0 4px" }}>{milestone.projectTitle}</p>
              <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 22, fontWeight: 700, color: "#e1e2eb", margin: 0 }}>
                {milestone.title}
              </h1>
            </div>
            {deliverable && (
              <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", color: dStatus.color, background: dStatus.color + "15", border: `1px solid ${dStatus.color}40`, whiteSpace: "nowrap" }}>
                {dStatus.label}
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <div>
              <span style={sectionLabel}>Milestone Amount</span>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 18, fontWeight: 700, color: "#00F0FF" }}>
                ${milestone.amount?.toLocaleString() ?? "—"}
              </div>
            </div>
            <div>
              <span style={sectionLabel}>Submitted</span>
              <div style={{ fontSize: 13, color: "#c2c6d6", fontWeight: 600 }}>{submittedAt}</div>
            </div>
            {reviewDeadline && (
              <div>
                <span style={sectionLabel}>Review Deadline</span>
                <div style={{ fontSize: 13, color: "#facc15", fontWeight: 600 }}>{reviewDeadline}</div>
              </div>
            )}
            {deliverable?.versionNumber != null && (
              <div>
                <span style={sectionLabel}>Version</span>
                <div style={{ fontSize: 13, color: "#c2c6d6", fontWeight: 600 }}>v{deliverable.versionNumber}</div>
              </div>
            )}
          </div>
        </div>

        {!deliverable ? (
          <div style={cardStyle}>
            <p style={{ fontSize: 14, color: "#8c90a0", textAlign: "center", padding: "24px 0" }}>
              Expert chưa nộp deliverable cho milestone này.
            </p>
          </div>
        ) : (
          <>
            {/* Links */}
            <div style={{ ...cardStyle, marginBottom: 20 }}>
              <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                Deliverable Links
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <LinkRow icon="folder_zip" label="File" url={deliverable.fileUrl} />
                <LinkRow icon="play_circle" label="Demo" url={deliverable.demoUrl} />
                <LinkRow icon="fact_check" label="Test Result" url={deliverable.testResultUrl} />
              </div>
            </div>

            {/* Description + Handover Notes */}
            {deliverable.description && (
              <div style={{ ...cardStyle, marginBottom: 20 }}>
                <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  Description
                </h3>
                <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.9, whiteSpace: "pre-line", margin: 0, wordBreak: "break-word" }}>
                  {deliverable.description}
                </p>
              </div>
            )}

            {deliverable.handoverNotes && (
              <div style={{ ...cardStyle, marginBottom: 20, border: "1px solid rgba(192,193,255,0.15)", background: "rgba(192,193,255,0.02)" }}>
                <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#c0c1ff", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(192,193,255,0.1)" }}>
                  Handover Notes
                </h3>
                <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.9, whiteSpace: "pre-line", margin: 0, wordBreak: "break-word" }}>
                  {deliverable.handoverNotes}
                </p>
              </div>
            )}

            {/* Acceptance Criteria — từ milestone, để client review đối chiếu */}
            {milestone.acceptanceCriteria && (
              <div style={{ ...cardStyle, marginBottom: 20 }}>
                <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  Acceptance Criteria
                </h3>
                <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.9, whiteSpace: "pre-line", margin: 0 }}>
                  {milestone.acceptanceCriteria}
                </p>
              </div>
            )}

            {/* Previous feedback nếu có (bản trước đã từng bị request revision) */}
            {deliverable.clientFeedback && (
              <div style={{ ...cardStyle, marginBottom: 20, border: "1px solid rgba(250,204,21,0.2)", background: "rgba(250,204,21,0.02)" }}>
                <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#facc15", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(250,204,21,0.1)" }}>
                  Your Previous Feedback
                </h3>
                <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.9, whiteSpace: "pre-line", margin: 0 }}>
                  {deliverable.clientFeedback}
                </p>
              </div>
            )}

            {actionError && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 20 }}>{actionError}</div>
            )}

            {/* Actions — chỉ hiện khi deliverable đang chờ review */}
            {canReview && (
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => setShowRevisionModal(true)} disabled={!!actionLoading}
                  style={{ flex: 1, padding: "13px", background: "rgba(250,204,21,0.08)", color: "#facc15", border: "1px solid rgba(250,204,21,0.25)", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: actionLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit_note</span>
                  Request Revision
                </button>
                <button onClick={handleApprove} disabled={!!actionLoading}
                  style={{ flex: 1, padding: "13px", background: actionLoading === "approve" ? "#1d2026" : "#22c55e", color: actionLoading === "approve" ? "#8c90a0" : "#002022", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: actionLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {actionLoading === "approve"
                    ? <><span className="material-symbols-outlined" style={{ fontSize: 18, animation: "spin 1s linear infinite" }}>autorenew</span>Đang xử lý...</>
                    : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>Approve Deliverable</>}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showRevisionModal && (
        <RequestRevisionModal
          onClose={() => setShowRevisionModal(false)}
          onSubmit={handleRequestRevision}
          submitting={actionLoading === "revision"}
          error={actionError}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </ClientLayout>
  );
}