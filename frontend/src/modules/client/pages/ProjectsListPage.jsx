// src/modules/client/pages/ProjectsListPage.jsx
// GET /api/projects/me  ← lấy tất cả projects, FE filter theo query param ?status=

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";

const STATUS_TABS = [
  { key: "IN_PROGRESS", label: "In Progress", icon: "pending_actions", color: "#facc15" },
  { key: "COMPLETED",   label: "Completed",   icon: "verified",        color: "#22c55e" },
  { key: "DISPUTED",    label: "Disputed",     icon: "gavel",           color: "#f97316" },
];

const STATUS_CONFIG = {
  IN_PROGRESS: { label: "In Progress", color: "#facc15", bg: "rgba(250,204,21,0.08)", border: "rgba(250,204,21,0.25)" },
  COMPLETED:   { label: "Completed",   color: "#22c55e", bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.25)"  },
  DISPUTED:    { label: "Disputed",    color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.25)" },
};

function ProjectCard({ project }) {
  const navigate = useNavigate();
  const cfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.IN_PROGRESS;
  const expertName = project.expertName || project.expert?.fullName || "Expert";

  return (
    <div
      onClick={() => navigate(`/client/projects/${project.projectId}`)}
      style={{ background: "rgba(16,19,25,0.85)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: 22, cursor: "pointer", transition: "all 0.2s" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,240,255,0.3)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 16, fontWeight: 700, color: "#e1e2eb", margin: "0 0 6px" }}>
            {project.title || project.jobTitle}
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={project.expertAvatar || `https://i.pravatar.cc/60?u=${project.expertId}`} alt={expertName}
              style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />
            <span style={{ fontSize: 13, color: "#8c90a0" }}>{expertName}</span>
          </div>
        </div>
        <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, whiteSpace: "nowrap" }}>
          {cfg.label}
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          {project.totalAmount != null && (
            <div>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 15, fontWeight: 700, color: "#00F0FF" }}>
                ${project.totalAmount.toLocaleString()}
              </span>
            </div>
          )}
          {project.progress != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 100, height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <div style={{ width: `${project.progress}%`, height: "100%", background: cfg.color, borderRadius: 999 }} />
              </div>
              <span style={{ fontSize: 12, color: "#8c90a0" }}>{project.progress}%</span>
            </div>
          )}
        </div>

        {project.status === "COMPLETED" && (
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/client/projects/${project.projectId}/review`); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "rgba(250,204,21,0.08)", color: "#facc15", border: "1px solid rgba(250,204,21,0.25)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>star</span>
            Leave Review
          </button>
        )}

        {project.status === "DISPUTED" && (
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/client/disputes?projectId=${project.projectId}`); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "rgba(249,115,22,0.08)", color: "#f97316", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>gavel</span>
            View Dispute
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProjectsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const activeStatus = searchParams.get("status") || "IN_PROGRESS";

  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProjects = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const res = await axiosInstance.get("/projects/me", { signal });
      const raw = res.data;
      setAllProjects(Array.isArray(raw) ? raw : raw.items ?? raw.data ?? []);
    } catch (err) {
      if (err?.code === "ERR_CANCELED") return;
      setError(err?.response?.data?.message || "Không thể tải danh sách projects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchProjects(controller.signal);
    return () => controller.abort();
  }, [fetchProjects, location.key]);

  const filteredProjects = allProjects.filter((p) => p.status === activeStatus);

  return (
    <ClientLayout>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 30, fontWeight: 700, color: "#e1e2eb", marginBottom: 6 }}>My Projects</h1>
          <p style={{ color: "#8c90a0", fontSize: 14, margin: 0 }}>Theo dõi tiến độ các project đang hợp tác.</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          {STATUS_TABS.map((tab) => {
            const count = allProjects.filter((p) => p.status === tab.key).length;
            const active = activeStatus === tab.key;
            return (
              <button key={tab.key}
                onClick={() => setSearchParams({ status: tab.key })}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", background: "none", border: "none", borderBottom: active ? `2px solid ${tab.color}` : "2px solid transparent", color: active ? tab.color : "#8c90a0", cursor: "pointer", fontSize: 14, fontWeight: active ? 700 : 500, fontFamily: "Inter, sans-serif", transition: "all 0.2s", marginBottom: -1 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{tab.icon}</span>
                {tab.label}
                <span style={{ padding: "2px 7px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", background: active ? tab.color + "20" : "rgba(255,255,255,0.06)", color: active ? tab.color : "#8c90a0" }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#8c90a0" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 16, animation: "spin 1s linear infinite", color: "#00F0FF" }}>autorenew</span>
            Loading projects...
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#f87171", display: "block", marginBottom: 12 }}>error_outline</span>
            <p style={{ color: "#f87171", fontSize: 15, marginBottom: 20 }}>{error}</p>
            <button onClick={() => fetchProjects(new AbortController().signal)}
              style={{ padding: "10px 24px", background: "rgba(0,240,255,0.08)", color: "#00F0FF", border: "1px solid rgba(0,240,255,0.3)", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
              Thử lại
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filteredProjects.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 72, display: "block", marginBottom: 16, color: "#272a30" }}>folder_off</span>
            <p style={{ color: "#8c90a0", fontSize: 16, marginBottom: 6 }}>Không có project nào ở trạng thái {STATUS_CONFIG[activeStatus]?.label}</p>
          </div>
        )}

        {/* List */}
        {!loading && !error && filteredProjects.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filteredProjects.map((project) => (
              <ProjectCard key={project.projectId} project={project} />
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </ClientLayout>
  );
}