// src/modules/client/pages/DisputeDetailPage.jsx
//
// GET  /api/disputes/me                      → list dispute của Client hiện tại
// GET  /api/disputes/{disputeId}              → chi tiết 1 dispute
// POST /api/disputes/{disputeId}/evidences    → bổ sung bằng chứng { evidenceText, fileUrl }
//
// LƯU Ý: chưa test được response thật của GET /disputes/{disputeId} (chưa có dispute
// nào được tạo để thử). Field dưới đây dựa trên request schema đã xác nhận
// (OpenDisputeRequest: projectId, milestoneId, respondentUserId, disputedAmount, reason,
// evidenceText, evidenceFileUrl) cộng thêm các field suy luận hợp lý cho 1 response
// dispute (disputeId, status, createdAt, resolution, resolvedAt, evidences[]).
// Khi có response thật, kiểm tra lại toàn bộ field trong unwrap bên dưới.

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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

const DISPUTE_STATUS = {
  OPEN:        { label: "Open",        color: "#f97316" },
  PENDING:     { label: "Pending Review", color: "#facc15" },
  UNDER_REVIEW:{ label: "Under Review", color: "#facc15" },
  RESOLVED:    { label: "Resolved",    color: "#22c55e" },
  REJECTED:    { label: "Rejected",    color: "#8c90a0" },
  CLOSED:      { label: "Closed",      color: "#8c90a0" },
};

export default function ClientDisputeDetailPage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("projectId");
  const navigate = useNavigate();

  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [evidenceFileUrl, setEvidenceFileUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadImageError, setUploadImageError] = useState("");
  const [submittingEvidence, setSubmittingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState("");
  const [evidenceSent, setEvidenceSent] = useState(false);

  // Tìm dispute đúng theo projectId truyền qua query param — vì hiện tại điều hướng
  // tới trang này chỉ biết projectId (không biết sẵn disputeId), nên phải lấy list
  // GET /disputes/me rồi lọc ra đúng dispute khớp projectId.
  const fetchDispute = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const res = await axiosInstance.get("/disputes/me", { signal });
      const raw = res.data?.data ?? res.data;
      const list = Array.isArray(raw) ? raw : raw?.items ?? [];

      const match = projectId
        ? list.find((d) => String(d.projectId) === String(projectId))
        : list[0];

      if (!match) {
        setError("Không tìm thấy khiếu nại nào cho project này.");
        return;
      }

      // Lấy chi tiết đầy đủ qua disputeId (list /me có thể chỉ trả tóm tắt)
      const detailRes = await axiosInstance.get(`/disputes/${match.disputeId}`, { signal });
      const detail = detailRes.data?.data ?? detailRes.data;
      setDispute(detail ?? match);
    } catch (err) {
      if (err?.code === "ERR_CANCELED") return;
      setError(err?.response?.data?.message || "Không thể tải thông tin khiếu nại.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchDispute(controller.signal);
    return () => controller.abort();
  }, [fetchDispute]);

  

  const handleAddEvidence = async () => {
    if ((!evidenceText.trim() && !evidenceFileUrl) || !dispute?.disputeId) return;

    setSubmittingEvidence(true);
    setEvidenceError("");
    try {
      await axiosInstance.post(`/disputes/${dispute.disputeId}/evidences`, {
        evidenceText: evidenceText.trim(),
        evidenceFileUrl: evidenceFileUrl.trim(),
      });
      setEvidenceSent(true);
      setEvidenceText("");
      setEvidenceFileUrl("");
      await fetchDispute();
      setTimeout(() => setEvidenceSent(false), 3000);
    } catch (err) {
      setEvidenceError(err?.response?.data?.message || "Gửi bằng chứng thất bại.");
    } finally {
      setSubmittingEvidence(false);
    }
  };

  if (loading) {
    return (
      <ClientLayout>
        <div style={{ textAlign: "center", padding: "120px 0", color: "#8c90a0" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 16, animation: "spin 1s linear infinite", color: "#00F0FF" }}>autorenew</span>
          Loading dispute...
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </ClientLayout>
    );
  }

  if (error || !dispute) {
    return (
      <ClientLayout>
        <div style={{ textAlign: "center", padding: "120px 24px" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#f87171", display: "block", marginBottom: 12 }}>error_outline</span>
          <p style={{ color: "#f87171", fontSize: 15, marginBottom: 20 }}>{error || "Không tìm thấy khiếu nại."}</p>
          <button onClick={() => navigate("/client/projects")}
            style={{ padding: "10px 24px", background: "#00F0FF", color: "#002022", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
            Quay lại Projects
          </button>
        </div>
      </ClientLayout>
    );
  }

  const dStatus = DISPUTE_STATUS[dispute.status] || DISPUTE_STATUS.OPEN;
  const isClosed = ["RESOLVED", "REJECTED", "CLOSED"].includes(dispute.status);
  const createdAt = dispute.createdAt ? new Date(dispute.createdAt).toLocaleString("vi-VN") : "—";
  const resolvedAt = dispute.resolvedAt ? new Date(dispute.resolvedAt).toLocaleString("vi-VN") : null;
  const evidences = Array.isArray(dispute.evidences) ? dispute.evidences : [];

  return (
    <ClientLayout>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>

        <button onClick={() => navigate(projectId ? `/client/projects/${projectId}` : "/client/projects")}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#8c90a0", cursor: "pointer", fontSize: 14, marginBottom: 24, padding: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
          Back to Project
        </button>

        {/* Header */}
        <div style={{ ...cardStyle, marginBottom: 20, border: "1px solid rgba(249,115,22,0.2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 12, color: "#8c90a0", margin: "0 0 4px" }}>{dispute.projectTitle || `Project #${dispute.projectId}`}</p>
              <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 22, fontWeight: 700, color: "#f97316", margin: 0 }}>
                Dispute #{dispute.disputeId}
              </h1>
            </div>
            <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", color: dStatus.color, background: dStatus.color + "15", border: `1px solid ${dStatus.color}40`, whiteSpace: "nowrap" }}>
              {dStatus.label}
            </span>
          </div>

          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <div>
              <span style={sectionLabel}>Disputed Amount</span>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 18, fontWeight: 700, color: "#f97316" }}>
                ${Number(dispute.disputedAmount ?? 0).toLocaleString()}
              </div>
            </div>
            <div>
              <span style={sectionLabel}>Opened</span>
              <div style={{ fontSize: 13, color: "#c2c6d6", fontWeight: 600 }}>{createdAt}</div>
            </div>
            {dispute.milestoneId && (
              <div>
                <span style={sectionLabel}>Milestone</span>
                <div style={{ fontSize: 13, color: "#c2c6d6", fontWeight: 600 }}>{dispute.milestoneTitle || `#${dispute.milestoneId}`}</div>
              </div>
            )}
          </div>
        </div>

        {/* Reason */}
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            Reason
          </h3>
          <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.9, whiteSpace: "pre-line", margin: 0 }}>
            {dispute.reason || "—"}
          </p>
        </div>

        {/* Initial evidence text */}
        {dispute.evidenceText && (
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              Initial Evidence
            </h3>
            <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.9, whiteSpace: "pre-line", margin: 0 }}>
              {dispute.evidenceText}
            </p>
          </div>
        )}

        {/* Additional evidences timeline */}
        {evidences.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              Additional Evidence
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {evidences.map((ev, i) => (
                <div key={ev.evidenceId ?? i} style={{ padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
                  <p style={{ fontSize: 13, color: "#c2c6d6", lineHeight: 1.7, margin: "0 0 6px", whiteSpace: "pre-line" }}>{ev.evidenceText}</p>
                  {ev.fileUrl && (
                    <a href={ev.fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#00F0FF" }}>
                      Xem file đính kèm
                    </a>
                  )}
                  <p style={{ fontSize: 11, color: "#5b6470", margin: "6px 0 0" }}>
                    {ev.createdAt ? new Date(ev.createdAt).toLocaleString("vi-VN") : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resolution — chỉ hiện khi Admin đã xử lý xong */}
        {isClosed && (
          <div style={{ ...cardStyle, marginBottom: 20, border: "1px solid rgba(34,197,94,0.2)", background: "rgba(34,197,94,0.02)" }}>
            <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#22c55e", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(34,197,94,0.1)" }}>
              Resolution
            </h3>
            <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.9, whiteSpace: "pre-line", margin: "0 0 8px" }}>
              {dispute.resolution || dispute.resolutionNote || "Khiếu nại đã được xử lý."}
            </p>
            {resolvedAt && (
              <p style={{ fontSize: 12, color: "#8c90a0", margin: 0 }}>Resolved at: {resolvedAt}</p>
            )}
          </div>
        )}

        {/* Add evidence — chỉ cho phép khi dispute còn đang mở */}
        {!isClosed && (
          <div style={cardStyle}>
            <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              Add More Evidence
            </h3>
            <textarea value={evidenceText} onChange={(e) => setEvidenceText(e.target.value)} rows={4}
              placeholder="Bổ sung thêm thông tin, link tài liệu, mô tả chi tiết hơn..."
              style={{ width: "100%", background: "#1d2026", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "12px 14px", color: "#e1e2eb", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 14, resize: "none", boxSizing: "border-box", marginBottom: 12 }} />

            {/* Upload ảnh bổ sung — chỉ hỗ trợ ảnh vì BE chỉ có /uploads/images */}
            <div style={{ marginBottom: 12 }}>
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
                Link bằng chứng
              </label>

              <input
                type="url"
                value={evidenceFileUrl}
                onChange={(e) => setEvidenceFileUrl(e.target.value)}
                placeholder="https://drive.google.com/... hoặc https://example.com/evidence.pdf"
                style={{
                  width: "100%",
                  background: "#1d2026",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  color: "#e1e2eb",
                  outline: "none",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />

              <p style={{ fontSize: 11, color: "#5b6470", marginTop: 6, marginBottom: 0 }}>
                Dán link Google Drive, Dropbox, OneDrive, PDF hoặc hình ảnh công khai.
              </p>
            </div>

            {evidenceError && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 12 }}>{evidenceError}</div>
            )}

            <button onClick={handleAddEvidence} disabled={submittingEvidence || (!evidenceText.trim() && !evidenceFileUrl.trim()) || evidenceSent}
              style={{ padding: "11px 22px", background: evidenceSent ? "#22c55e" : (!evidenceText.trim() && !evidenceFileUrl) ? "rgba(0,240,255,0.08)" : "#00F0FF", color: evidenceSent ? "#002022" : (!evidenceText.trim() && !evidenceFileUrl) ? "#8c90a0" : "#002022", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: (!evidenceText.trim() && !evidenceFileUrl) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                {evidenceSent ? "check_circle" : submittingEvidence ? "hourglass_empty" : "upload_file"}
              </span>
              {evidenceSent ? "Đã gửi!" : submittingEvidence ? "Đang gửi..." : "Submit Evidence"}
            </button>
          </div>
        )}

      </div>
    </ClientLayout>
  );
}