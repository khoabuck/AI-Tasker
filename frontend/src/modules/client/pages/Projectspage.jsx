// src/modules/client/pages/ProjectsPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
<<<<<<< HEAD

// ── Status badge config ────────────────────────────────
const STATUS_CONFIG = {
  PENDING:   { label: "Pending",   color: "#facc15", bg: "rgba(250,204,21,0.1)",  border: "rgba(250,204,21,0.3)"  },
  ACTIVE:    { label: "Active",    color: "#00F0FF", bg: "rgba(0,240,255,0.1)",   border: "rgba(0,240,255,0.3)"   },
  COMPLETED: { label: "Completed", color: "#4ade80", bg: "rgba(74,222,128,0.1)",  border: "rgba(74,222,128,0.3)"  },
  CANCELLED: { label: "Cancelled", color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.3)" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.05em", color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
=======
import axiosInstance from "../../../api/axiosInstance";

const STATUS_CONFIG = {
  DRAFT:     { label: "Draft",     color: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.25)" },
  OPEN:      { label: "Open",      color: "#00F0FF", bg: "rgba(0,240,255,0.08)",   border: "rgba(0,240,255,0.25)"   },
  ACTIVE:    { label: "Active",    color: "#22c55e", bg: "rgba(34,197,94,0.08)",   border: "rgba(34,197,94,0.25)"   },
  COMPLETED: { label: "Completed", color: "#3b82f6", bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.25)"  },
  CANCELLED: { label: "Cancelled", color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.25)"   },
  DISPUTED:  { label: "Disputed",  color: "#f97316", bg: "rgba(249,115,22,0.08)",  border: "rgba(249,115,22,0.25)"  },
};

const FILTERS = [
  { key: "ALL",       label: "All",       color: "#e1e2eb" },
  { key: "DRAFT",     label: "Draft",     color: "#94a3b8" },
  { key: "OPEN",      label: "Open",      color: "#00F0FF" },
  { key: "ACTIVE",    label: "Active",    color: "#22c55e" },
  { key: "COMPLETED", label: "Completed", color: "#3b82f6" },
  { key: "CANCELLED", label: "Cancelled", color: "#ef4444" },
  { key: "DISPUTED",  label: "Disputed",  color: "#f97316" },
];

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "#8c90a0", bg: "rgba(140,144,160,0.08)", border: "rgba(140,144,160,0.25)" };
  return (
    <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.05em", color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
>>>>>>> origin/develop
      {cfg.label}
    </span>
  );
}

function JobCard({ job, onDelete }) {
  const navigate = useNavigate();
<<<<<<< HEAD
  const date = new Date(job.createdAt).toLocaleDateString("vi-VN");

  return (
    <div style={{ background: "rgba(16,19,25,0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 16, transition: "border-color 0.2s" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(0,240,255,0.3)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, marginRight: 16 }}>
          <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontWeight: 700, fontSize: 18, color: "#e1e2eb", marginBottom: 4 }}>
            {job.title}
          </h3>
          <p style={{ fontSize: 13, color: "#8c90a0", fontFamily: "JetBrains Mono, monospace" }}>
            {job.category}
          </p>
=======
  const date = job.createdAt ? new Date(job.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";
  const skills = job.skills || [];

  return (
    <div style={{ background: "rgba(16,19,25,0.85)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 28, display: "flex", flexDirection: "column", gap: 16, transition: "border-color 0.2s" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(0,240,255,0.25)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontWeight: 700, fontSize: 18, color: "#e1e2eb" }}>
              {job.title || "Untitled Job"}
            </h3>
            {job.isAiAssisted && (
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
>>>>>>> origin/develop
        </div>
        <StatusBadge status={job.status} />
      </div>

<<<<<<< HEAD
      {/* Description preview */}
      <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {job.description || "No description provided."}
      </p>

      {/* Budget + Date */}
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {(job.budgetFrom || job.budgetTo) && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#c2c6d6", fontSize: 13 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#00F0FF" }}>payments</span>
            ${job.budgetFrom} — ${job.budgetTo} USD/Month
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#8c90a0", fontSize: 13 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>calendar_today</span>
          Posted {date}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <button
          onClick={() => navigate(`/client/projects/${job.id}`)}
          style={{ flex: 1, padding: "10px", background: "#232A35", color: "#e1e2eb", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "background 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#32353b")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#232A35")}>
          View Details
        </button>

        {/* TODO (BE): Nút Delete sẽ gọi jobApi.deleteJob(job.id) thay vì xóa localStorage */}
        <button
          onClick={() => onDelete(job.id)}
          style={{ padding: "10px 16px", background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, fontSize: 14, cursor: "pointer", transition: "background 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(248,113,113,0.2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(248,113,113,0.1)")}>
=======
      {(job.aiGeneratedDescription || job.description) && (
        <div style={{ background: job.aiGeneratedDescription ? "rgba(0,240,255,0.03)" : "rgba(255,255,255,0.02)", border: `1px solid ${job.aiGeneratedDescription ? "rgba(0,240,255,0.1)" : "rgba(255,255,255,0.06)"}`, borderRadius: 8, padding: "12px 14px" }}>
          {job.aiGeneratedDescription && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13, color: "#00F0FF" }}>auto_awesome</span>
              <span style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", color: "#00F0FF", textTransform: "uppercase", letterSpacing: "0.08em" }}>AI Generated</span>
            </div>
          )}
          <p style={{ fontSize: 13, color: "#c2c6d6", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", whiteSpace: "pre-line" }}>
            {job.aiGeneratedDescription || job.description}
          </p>
        </div>
      )}

      {skills.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {skills.slice(0, 8).map((s, i) => {
            const label = typeof s === "string" ? s : (s.skillName || s.name || "Skill");
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

      <div style={{ display: "flex", gap: 10, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => navigate(`/client/projects/${job.jobPostingId || job.id}`)}
          style={{ flex: 1, padding: "10px", background: "rgba(0,240,255,0.05)", color: "#00F0FF", border: "1px solid rgba(0,240,255,0.25)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "all 0.2s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,240,255,0.12)"; e.currentTarget.style.boxShadow = "0 0 14px rgba(0,240,255,0.2)"; e.currentTarget.style.borderColor = "#00F0FF"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,240,255,0.05)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "rgba(0,240,255,0.25)"; }}>
          View Details
        </button>
        <button onClick={() => navigate(`/client/projects/${job.jobPostingId || job.id}/recommendations`)}
          style={{ flex: 1, padding: "10px", background: "rgba(192,193,255,0.05)", color: "#c0c1ff", border: "1px solid rgba(192,193,255,0.25)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.2s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(192,193,255,0.12)"; e.currentTarget.style.boxShadow = "0 0 14px rgba(192,193,255,0.2)"; e.currentTarget.style.borderColor = "#c0c1ff"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(192,193,255,0.05)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "rgba(192,193,255,0.25)"; }}>
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>auto_awesome</span>
          AI Recommendation
        </button>
        <button onClick={() => onDelete(job.jobPostingId || job.id)}
          style={{ padding: "10px 14px", background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", transition: "all 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(248,113,113,0.15)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(248,113,113,0.08)")}>
>>>>>>> origin/develop
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
<<<<<<< HEAD

  // ── TODO (BE): Thay useEffect bên dưới bằng API call ─────────────────────────
  // import { jobApi } from "../../../api/job.api";
  // useEffect(() => {
  //   jobApi.getMyJobs().then(res => setJobs(res.data));
  // }, []);
  // ─────────────────────────────────────────────────────────────────────────────

  // Đọc từ localStorage tạm (xóa khi BE xong)
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("client_jobs") || "[]");
    setJobs(stored);
  }, []);

  // ── TODO (BE): Thay hàm delete bên dưới bằng API call ────────────────────────
  // const handleDelete = async (id) => {
  //   await jobApi.deleteJob(id);
  //   setJobs(prev => prev.filter(j => j.id !== id));
  // };
  // ─────────────────────────────────────────────────────────────────────────────

  const handleDelete = (id) => {
    if (!confirm("Bạn chắc muốn xóa job này?")) return;
    const updated = jobs.filter((j) => j.id !== id);
    setJobs(updated);
    localStorage.setItem("client_jobs", JSON.stringify(updated)); // xóa khi BE xong
  };

  const FILTERS = ["ALL", "PENDING", "ACTIVE", "COMPLETED", "CANCELLED"];
=======
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    axiosInstance.get("/jobs/my")
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.items || []);
        setJobs(data);
      })
      .catch(() => setError("Failed to load projects. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = (id) => {
    if (!confirm("Are you sure you want to delete this job?")) return;
    setJobs((prev) => prev.filter((j) => (j.jobPostingId || j.id) !== id));
  };

>>>>>>> origin/develop
  const filtered = filter === "ALL" ? jobs : jobs.filter((j) => j.status === filter);

  return (
    <ClientLayout>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>

        {/* Header */}
<<<<<<< HEAD
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40 }}>
          <div>
            <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 32, fontWeight: 700, color: "#e1e2eb", marginBottom: 8 }}>
              My Projects
            </h1>
            <p style={{ color: "#c2c6d6" }}>
              {jobs.length} job{jobs.length !== 1 ? "s" : ""} posted
            </p>
          </div>
          <button
            onClick={() => navigate("/client/post-job")}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "#00F0FF", color: "#002022", fontWeight: 700, fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, border: "none", borderRadius: 8, cursor: "pointer", boxShadow: "0 0 20px rgba(0,240,255,0.3)", transition: "all 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 30px rgba(0,240,255,0.5)")}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 20px rgba(0,240,255,0.3)")}>
=======
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 32, fontWeight: 700, color: "#e1e2eb", marginBottom: 6 }}>
              My Projects
            </h1>
            <p style={{ color: "#8c90a0", fontSize: 14 }}>
              {loading ? "Loading..." : filter === "ALL"
                ? `${jobs.length} job${jobs.length !== 1 ? "s" : ""} total`
                : `${filtered.length} job${filtered.length !== 1 ? "s" : ""} ${filter.toLowerCase()}`}
            </p>
          </div>
          <button onClick={() => navigate("/client/post-job")}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "#00F0FF", color: "#002022", fontWeight: 700, fontFamily: "Hanken Grotesk, sans-serif", fontSize: 14, border: "none", borderRadius: 10, cursor: "pointer", boxShadow: "0 0 20px rgba(0,240,255,0.25)", transition: "all 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 30px rgba(0,240,255,0.45)")}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 20px rgba(0,240,255,0.25)")}>
>>>>>>> origin/develop
            <span className="material-symbols-outlined">add</span>
            Post New Job
          </button>
        </div>

<<<<<<< HEAD
        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: "8px 16px", borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer", transition: "all 0.2s", background: filter === f ? "#00F0FF" : "rgba(255,255,255,0.05)", color: filter === f ? "#002022" : "#8c90a0", border: filter === f ? "none" : "1px solid rgba(255,255,255,0.12)" }}>
              {f}
            </button>
          ))}
        </div>

        {/* Job list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 64, color: "#414754", display: "block", marginBottom: 16 }}>inbox</span>
            <p style={{ color: "#8c90a0", fontSize: 16, marginBottom: 24 }}>
              {filter === "ALL" ? "Chưa có job nào. Post job đầu tiên đi!" : `Không có job nào ở trạng thái ${filter}.`}
            </p>
            {filter === "ALL" && (
              <button onClick={() => navigate("/client/post-job")}
                style={{ padding: "12px 32px", background: "#00F0FF", color: "#002022", fontWeight: 700, fontFamily: "Hanken Grotesk, sans-serif", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 15 }}>
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
        )}
      </div>
=======
        {/* Status summary cards */}
        {!loading && !error && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 32 }}>
            {FILTERS.filter(f => f.key !== "ALL").map((f) => {
              const count = jobs.filter(j => j.status === f.key).length;
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
            const count = f.key === "ALL" ? jobs.length : jobs.filter(j => j.status === f.key).length;
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
                {filter === "ALL" ? "No jobs yet. Post your first job!" : `No ${filter.toLowerCase()} jobs.`}
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
                <JobCard key={job.jobPostingId || job.id} job={job} onDelete={handleDelete} />
              ))}
            </div>
          )
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
>>>>>>> origin/develop
    </ClientLayout>
  );
}