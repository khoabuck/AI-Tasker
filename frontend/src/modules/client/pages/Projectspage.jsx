// src/modules/client/pages/ProjectsPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import { getJobsApi } from "../../../api/job.api";

const STATUS_CONFIG = {
  PENDING:   { label: "Pending",   color: "#facc15", bg: "rgba(250,204,21,0.08)",  border: "rgba(250,204,21,0.25)"  },
  ACTIVE:    { label: "Active",    color: "#00F0FF", bg: "rgba(0,240,255,0.08)",   border: "rgba(0,240,255,0.25)"   },
  COMPLETED: { label: "Completed", color: "#4ade80", bg: "rgba(74,222,128,0.08)",  border: "rgba(74,222,128,0.25)"  },
  CANCELLED: { label: "Cancelled", color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.25)" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.05em", color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

function JobCard({ job, onDelete }) {
  const navigate = useNavigate();
  const date = job.createdAt ? new Date(job.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";
  const skills = job.skills || [];

  return (
    <div style={{ background: "rgba(16,19,25,0.85)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 28, display: "flex", flexDirection: "column", gap: 16, transition: "border-color 0.2s, transform 0.2s" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,240,255,0.25)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontWeight: 700, fontSize: 18, color: "#e1e2eb" }}>
              {job.title || "Untitled Job"}
            </h3>
            {job.isAIAssisted && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", background: "rgba(0,240,255,0.08)", border: "1px solid rgba(0,240,255,0.2)", borderRadius: 999, fontSize: 10, color: "#00F0FF", fontFamily: "JetBrains Mono, monospace" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>auto_awesome</span>
                AI
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            {(job.budgetMin || job.budgetMax) && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#c2c6d6", fontSize: 13 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15, color: "#00F0FF" }}>payments</span>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
                  ${job.budgetMin?.toLocaleString()} — ${job.budgetMax?.toLocaleString()}
                  <span style={{ fontWeight: 400, color: "#8c90a0", fontSize: 11 }}> USD/mo</span>
                </span>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#8c90a0", fontSize: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>calendar_today</span>
              {date}
            </div>
          </div>
        </div>
        <StatusBadge status={job.status} />
      </div>

      {/* Description */}
      {(job.aIGeneratedDescription || job.description) && (
        <div style={{ background: job.aIGeneratedDescription ? "rgba(0,240,255,0.03)" : "rgba(255,255,255,0.02)", border: `1px solid ${job.aIGeneratedDescription ? "rgba(0,240,255,0.1)" : "rgba(255,255,255,0.06)"}`, borderRadius: 8, padding: "12px 14px" }}>
          {job.aIGeneratedDescription && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13, color: "#00F0FF" }}>auto_awesome</span>
              <span style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", color: "#00F0FF", textTransform: "uppercase", letterSpacing: "0.08em" }}>AI Generated</span>
            </div>
          )}
          <p style={{ fontSize: 13, color: "#c2c6d6", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", whiteSpace: "pre-line" }}>
            {job.aIGeneratedDescription || job.description}
          </p>
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {skills.slice(0, 8).map((s, i) => {
            const label = typeof s === "string" ? s : (s.skillLevelRequired || s.name || "Skill");
            return (
              <span key={i} style={{ padding: "4px 10px", background: "rgba(173,198,255,0.08)", border: "1px solid rgba(173,198,255,0.15)", borderRadius: 999, fontSize: 11, color: "#adc6ff", fontFamily: "JetBrains Mono, monospace" }}>
                {label}
              </span>
            );
          })}
          {skills.length > 8 && (
            <span style={{ padding: "4px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, fontSize: 11, color: "#8c90a0" }}>
              +{skills.length - 8} more
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => navigate(`/client/projects/${job.id}`)}
          style={{ flex: 1, padding: "10px", background: "#1d2026", color: "#e1e2eb", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "all 0.2s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#272a30"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#1d2026"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}>
          View Details
        </button>

        {/* TODO (BE): deleteJobApi(job.id) khi BE làm xong */}
        <button onClick={() => onDelete(job.id)}
          style={{ padding: "10px 16px", background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, fontSize: 14, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.15)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.08)"; }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
        </button>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // GET /api/jobs
  useEffect(() => {
    setLoading(true);
    getJobsApi({ Page: 1, PageSize: 50 })
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.items || []);
        setJobs(data);
      })
      .catch(() => setError("Failed to load projects. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  // TODO (BE): deleteJobApi(id) khi BE làm xong
  // const handleDelete = async (id) => {
  //   await deleteJobApi(id);
  //   setJobs(prev => prev.filter(j => j.id !== id));
  // };
  const handleDelete = (id) => {
    if (!confirm("Are you sure you want to delete this job?")) return;
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const FILTERS = ["ALL", "PENDING", "ACTIVE", "COMPLETED", "REMOVED"];
  const filtered = filter === "ALL" ? jobs : jobs.filter((j) => j.status === filter);

  return (
    <ClientLayout>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 32, fontWeight: 700, color: "#e1e2eb", marginBottom: 6 }}>
              My Projects
            </h1>
            <p style={{ color: "#8c90a0", fontSize: 14 }}>
              {loading ? "Loading..." : `${jobs.length} job${jobs.length !== 1 ? "s" : ""} posted`}
            </p>
          </div>
          <button onClick={() => navigate("/client/post-job")}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "#00F0FF", color: "#002022", fontWeight: 700, fontFamily: "Hanken Grotesk, sans-serif", fontSize: 14, border: "none", borderRadius: 10, cursor: "pointer", boxShadow: "0 0 20px rgba(0,240,255,0.25)", transition: "all 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 30px rgba(0,240,255,0.45)")}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 20px rgba(0,240,255,0.25)")}>
            <span className="material-symbols-outlined">add</span>
            Post New Job
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: "8px 18px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer", transition: "all 0.2s", background: filter === f ? "#00F0FF" : "rgba(255,255,255,0.04)", color: filter === f ? "#002022" : "#8c90a0", border: filter === f ? "none" : "1px solid rgba(255,255,255,0.1)" }}>
              {f}
            </button>
          ))}
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
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 64, color: "#272a30", display: "block", marginBottom: 16 }}>inbox</span>
              <p style={{ color: "#8c90a0", fontSize: 15, marginBottom: 24 }}>
                {filter === "ALL" ? "No jobs yet. Post your first job!" : `No jobs with status "${filter}".`}
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
              {filtered.map((job) => (
                <JobCard key={job.id} job={job} onDelete={handleDelete} />
              ))}
            </div>
          )
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </ClientLayout>
  );
}