// src/modules/client/pages/ProjectsPage.jsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";

const STATUS_CONFIG = {
 
  ACTIVE:    { label: "Active",    color: "#22c55e", bg: "rgba(34,197,94,0.08)",   border: "rgba(34,197,94,0.25)"   },
  COMPLETED: { label: "Completed", color: "#3b82f6", bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.25)"  },
  CANCELLED: { label: "Cancelled", color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.25)"   },
  DISPUTED:  { label: "Disputed",  color: "#f97316", bg: "rgba(249,115,22,0.08)",  border: "rgba(249,115,22,0.25)"  },
};

const FILTERS = [
  { key: "ALL",       label: "All",       color: "#e1e2eb" },
  { key: "ACTIVE",    label: "Active",    color: "#22c55e" },
  { key: "COMPLETED", label: "Completed", color: "#3b82f6" },
  { key: "CANCELLED", label: "Cancelled", color: "#ef4444" },
  { key: "DISPUTED",  label: "Disputed",  color: "#f97316" },
];



function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "#8c90a0", bg: "rgba(140,144,160,0.08)", border: "rgba(140,144,160,0.25)" };
  return (
    <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.05em", color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

function ProjectCard({ project }) {
  const navigate = useNavigate();
  const projectId = project.projectId;
  const date = project.createdAt
  ? new Date(project.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  : "—";

const budget = project.totalBudget ?? project.milestoneTotalAmount ?? 0;
const milestones = project.milestones || [];


 


  return (
    <div
      style={{ background: "rgba(16,19,25,0.85)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 28, display: "flex", flexDirection: "column", gap: 16, transition: "border-color 0.2s" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(0,240,255,0.25)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
    >
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontWeight: 700, fontSize: 18, color: "#e1e2eb" }}>
              {project.title || project.jobTitle || "Untitled Project"}
            </h3>
            
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#c2c6d6", fontSize: 13 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 15, color: "#00F0FF" }}>
                payments
              </span>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
                ${budget.toLocaleString()}
                <span style={{ fontWeight: 400, color: "#8c90a0", fontSize: 11 }}> USD</span>
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#8c90a0", fontSize: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>calendar_today</span>
              {date}
            </div>
          </div>
        </div>
        <StatusBadge status={project.status} />
      </div>

      {/* Description */}
      {project.description && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "12px 14px" }}>
          <p style={{ fontSize: 13, color: "#c2c6d6", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", whiteSpace: "pre-line" }}>
            {project.description}
          </p>
        </div>
      )}

      {/* Milestones */}
      {milestones.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {milestones.slice(0, 4).map((m) => (
            <span
              key={m.milestoneId}
              style={{
                padding: "4px 10px",
                background: "rgba(173,198,255,0.08)",
                border: "1px solid rgba(173,198,255,0.15)",
                borderRadius: 999,
                fontSize: 11,
                color: "#adc6ff",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {m.title}
            </span>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap" }}>

        {/* View Details — cyan */}
        <button
          onClick={() => navigate(`/client/projects/${projectId}`)}
          style={{ flex: 1, minWidth: 100, padding: "10px", background: "rgba(0,240,255,0.05)", color: "#00F0FF", border: "1px solid rgba(0,240,255,0.25)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "all 0.2s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,240,255,0.12)"; e.currentTarget.style.boxShadow = "0 0 14px rgba(0,240,255,0.2)"; e.currentTarget.style.borderColor = "#00F0FF"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,240,255,0.05)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "rgba(0,240,255,0.25)"; }}
        >
          View Details
        </button>

        {/* AI Recommendation — purple */}
        <button
          onClick={() => navigate(`/client/projects/${projectId}/recommendations`)}
          style={{ flex: 1, minWidth: 100, padding: "10px", background: "rgba(192,193,255,0.05)", color: "#c0c1ff", border: "1px solid rgba(192,193,255,0.25)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.2s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(192,193,255,0.12)"; e.currentTarget.style.boxShadow = "0 0 14px rgba(192,193,255,0.2)"; e.currentTarget.style.borderColor = "#c0c1ff"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(192,193,255,0.05)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "rgba(192,193,255,0.25)"; }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>auto_awesome</span>
          AI Rec
        </button>



        {/* Review — chỉ hiện khi COMPLETED */}
          {project.status === "COMPLETED" && (
            <button
              onClick={() => navigate(`/client/projects/${projectId}/review`)}
              style={{
                padding: "10px 14px",
                background: "rgba(59,130,246,0.08)",
                color: "#3b82f6",
                border: "1px solid rgba(59,130,246,0.25)",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(59,130,246,0.15)";
                e.currentTarget.style.boxShadow =
                  "0 0 12px rgba(59,130,246,0.2)";
                e.currentTarget.style.borderColor = "#3b82f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(59,130,246,0.08)";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor =
                  "rgba(59,130,246,0.25)";
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 16 }}
              >
                star
              </span>
              Review
            </button>
          )}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    axiosInstance.get("/projects/me")
    .then((res) => {
      const data = res.data?.data || [];
      setProjects(data);
    })
      .catch(() => setError("Failed to load projects. Please try again."))
      .finally(() => setLoading(false));
  }, [location.key]); // re-fetch mỗi khi navigate về trang này


  const filtered =
    filter === "ALL"
      ? projects
      : projects.filter((p) => p.status === filter);

  return (
    <ClientLayout>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 32, fontWeight: 700, color: "#e1e2eb", marginBottom: 6 }}>
              My Projects
            </h1>
            <p style={{ color: "#8c90a0", fontSize: 14 }}>
              {loading ? "Loading..." : filter === "ALL"
                ? `${projects.length} project${projects.length !== 1 ? "s" : ""} total`
                : `${filtered.length} project${filtered.length !== 1 ? "s" : ""} ${filter.toLowerCase()}`}
            </p>
          </div>
          <button
            onClick={() => navigate("/client/post-job")}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "#00F0FF", color: "#002022", fontWeight: 700, fontFamily: "Hanken Grotesk, sans-serif", fontSize: 14, border: "none", borderRadius: 10, cursor: "pointer", boxShadow: "0 0 20px rgba(0,240,255,0.25)", transition: "all 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 30px rgba(0,240,255,0.45)")}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 20px rgba(0,240,255,0.25)")}
          >
            <span className="material-symbols-outlined">add</span>
            Post New Job
          </button>
        </div>

        {/* Status summary cards */}
        {!loading && !error && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 32 }}>
            {FILTERS.filter(f => f.key !== "ALL").map((f) => {
              const count = projects.filter((p) => p.status === f.key).length;
              const isActive = filter === f.key;
              return (
                <button key={f.key} onClick={() => setFilter(f.key === filter ? "ALL" : f.key)}
                  style={{ padding: "14px 12px", borderRadius: 12, border: `1px solid ${isActive ? f.color : f.color + "30"}`, background: isActive ? f.color + "15" : "rgba(16,19,25,0.6)", cursor: "pointer", transition: "all 0.2s", textAlign: "center" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = f.color + "15")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = isActive ? f.color + "15" : "rgba(16,19,25,0.6)")}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: f.color, fontFamily: "Hanken Grotesk, sans-serif" }}>{count}</div>
                  <div style={{ fontSize: 10, color: f.color, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>{f.label}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
          {FILTERS.map((f) => {
            const count =
            f.key === "ALL"
              ? projects.length
              : projects.filter((p) => p.status === f.key).length;
            const isActive = filter === f.key;
            return (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer", transition: "all 0.2s", background: isActive ? f.color : "rgba(255,255,255,0.04)", color: isActive ? "#002022" : f.color, border: isActive ? "none" : `1px solid ${f.color}40` }}>
                {f.label}
                <span style={{ padding: "1px 6px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: isActive ? "rgba(0,0,0,0.2)" : f.color + "20", color: isActive ? "#002022" : f.color }}>
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
        {!loading && error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "16px 20px", color: "#f87171", fontSize: 14, textAlign: "center" }}>
            {error}
          </div>
        )}

        {/* List */}
        {!loading && !error && (
          filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 64, color: "#272a30", display: "block", marginBottom: 16 }}>inbox</span>
              <p style={{ color: "#8c90a0", fontSize: 15, marginBottom: 24 }}>
                {filter === "ALL" ? "No projects found." : `No ${filter.toLowerCase()} projects.`}
              </p>
              {filter === "ALL" && (
                <button onClick={() => navigate("/client/post-job")}
                  style={{ padding: "12px 32px", background: "#00F0FF", color: "#002022", fontWeight: 700, fontFamily: "Hanken Grotesk, sans-serif", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>
                  Post a Job
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {filtered.map((project) => (
                <ProjectCard
                  key={project.projectId}
                  project={project}
                />
              ))}
            </div>
          )
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </ClientLayout>
  );
}