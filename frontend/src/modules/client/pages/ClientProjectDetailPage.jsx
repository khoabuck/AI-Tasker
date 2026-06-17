// src/modules/client/pages/ClientProjectDetailPage.jsx
// GET /api/projects/{projectId}
// GET /api/projects/{projectId}/milestones
// Trang cơ bản — sẽ mở rộng khi BE hoàn thiện milestones/deliverables

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";

const STATUS_CONFIG = {
  IN_PROGRESS: { label: "In Progress", color: "#facc15", bg: "rgba(250,204,21,0.08)", border: "rgba(250,204,21,0.25)" },
  COMPLETED:   { label: "Completed",   color: "#22c55e", bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.25)"  },
  DISPUTED:    { label: "Disputed",    color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.25)" },
  ACTIVE:      { label: "Active",      color: "#00F0FF", bg: "rgba(0,240,255,0.08)",  border: "rgba(0,240,255,0.25)"  },
};

const MILESTONE_STATUS = {
  PENDING:    { label: "Pending",    color: "#8c90a0" },
  IN_PROGRESS:{ label: "In Progress",color: "#facc15" },
  SUBMITTED:  { label: "Submitted",  color: "#c0c1ff" },
  APPROVED:   { label: "Approved",   color: "#22c55e" },
  REJECTED:   { label: "Rejected",   color: "#ef4444" },
};

const cardStyle = {
  background: "rgba(16,19,25,0.85)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 16,
  padding: 28,
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
};

const labelStyle = {
  display: "block",
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "#8c90a0",
  marginBottom: 6,
};

export default function ClientProjectDetailPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const [projectRes, milestonesRes] = await Promise.allSettled([
        axiosInstance.get(`/projects/${projectId}`, { signal }),
        axiosInstance.get(`/projects/${projectId}/milestones`, { signal }),
      ]);

      if (projectRes.status === "fulfilled") {
        setProject(projectRes.value.data);
      } else {
        throw projectRes.reason;
      }

      if (milestonesRes.status === "fulfilled") {
        const raw = milestonesRes.value.data;
        setMilestones(Array.isArray(raw) ? raw : raw.items ?? raw.data ?? []);
      }
      // Milestones API có thể chưa sẵn sàng ở BE — fail im lặng, không chặn trang

    } catch (err) {
      if (err?.code === "ERR_CANCELED") return;
      setError(
        err?.response?.status === 404 ? "Không tìm thấy project này." :
        err?.response?.status === 403 ? "Bạn không có quyền xem project này." :
        err?.response?.data?.message || "Đã có lỗi xảy ra."
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  if (loading) return (
    <ClientLayout>
      <div style={{ textAlign: "center", padding: "120px 0", color: "#8c90a0" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 16, animation: "spin 1s linear infinite", color: "#00F0FF" }}>autorenew</span>
        Loading project...
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </ClientLayout>
  );

  if (error) return (
    <ClientLayout>
      <div style={{ textAlign: "center", padding: "120px 24px" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#f87171", display: "block", marginBottom: 12 }}>error_outline</span>
        <p style={{ color: "#f87171", fontSize: 15, marginBottom: 20 }}>{error}</p>
        <button onClick={() => navigate("/client/projects")}
          style={{ padding: "10px 24px", background: "#00F0FF", color: "#002022", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
          Back to Projects
        </button>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </ClientLayout>
  );

  if (!project) return null;

  const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.IN_PROGRESS;
  const expertName = project.expertName || project.expert?.fullName || "Expert";
  const startDate = project.startDate || project.createdAt
    ? new Date(project.startDate || project.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  return (
    <ClientLayout>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px" }}>

        {/* Back */}
        <button onClick={() => navigate("/client/projects")}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#8c90a0", cursor: "pointer", fontSize: 14, marginBottom: 28, padding: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#e1e2eb")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#8c90a0")}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
          Back to Projects
        </button>

        {/* Header card */}
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 26, fontWeight: 700, color: "#e1e2eb", marginBottom: 10 }}>
                {project.title || project.jobTitle}
              </h1>
              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", color: statusCfg.color, background: statusCfg.bg, border: `1px solid ${statusCfg.border}` }}>
                  {statusCfg.label}
                </span>
                <span style={{ fontSize: 13, color: "#8c90a0" }}>Started {startDate}</span>
              </div>
            </div>

            {project.totalAmount != null && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 700, color: "#00F0FF" }}>
                  ${project.totalAmount.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: "#8c90a0", marginTop: 2 }}>Total Amount</div>
              </div>
            )}
          </div>

          {/* Expert info */}
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 14 }}>
            <img src={project.expertAvatar || `https://i.pravatar.cc/80?u=${project.expertId}`} alt={expertName}
              style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(0,240,255,0.25)" }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#e1e2eb", margin: "0 0 2px", fontFamily: "Hanken Grotesk, sans-serif" }}>{expertName}</p>
              <p style={{ fontSize: 12, color: "#8c90a0", margin: 0 }}>{project.expertTitle || "AI Expert"}</p>
            </div>

            {project.status === "COMPLETED" && (
              <button onClick={() => navigate(`/client/projects/${projectId}/review`)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "rgba(250,204,21,0.08)", color: "#facc15", border: "1px solid rgba(250,204,21,0.25)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>star</span>
                Leave Review
              </button>
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

        {/* Description */}
        {project.description && (
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              Description
            </h3>
            <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.8, whiteSpace: "pre-line", margin: 0 }}>
              {project.description}
            </p>
          </div>
        )}

        {/* Milestones */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", margin: 0 }}>Milestones</h3>
            {milestones.length > 0 && (
              <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: "rgba(0,240,255,0.1)", color: "#00F0FF", border: "1px solid rgba(0,240,255,0.3)", fontFamily: "JetBrains Mono, monospace" }}>
                {milestones.length} total
              </span>
            )}
          </div>

          {milestones.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#272a30", display: "block", marginBottom: 12 }}>flag</span>
              <p style={{ color: "#8c90a0", fontSize: 14, margin: 0 }}>
                Chưa có milestone nào, hoặc tính năng đang được phát triển.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {milestones.map((m, index) => {
                const mCfg = MILESTONE_STATUS[m.status] || MILESTONE_STATUS.PENDING;
                return (
                  <div key={m.milestoneId ?? index}
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#e1e2eb", margin: "0 0 4px" }}>
                        {m.title || `Milestone ${index + 1}`}
                      </p>
                      {m.description && (
                        <p style={{ fontSize: 13, color: "#8c90a0", margin: 0 }}>{m.description}</p>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {m.amount != null && (
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, color: "#00F0FF", fontWeight: 700 }}>
                          ${m.amount.toLocaleString()}
                        </span>
                      )}
                      <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", color: mCfg.color, background: mCfg.color + "15", border: `1px solid ${mCfg.color}40` }}>
                        {mCfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </ClientLayout>
  );
}