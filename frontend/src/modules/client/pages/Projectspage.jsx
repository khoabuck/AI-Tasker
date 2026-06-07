// src/modules/client/pages/ProjectsPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";

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
      {cfg.label}
    </span>
  );
}

function JobCard({ job, onDelete }) {
  const navigate = useNavigate();
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
        </div>
        <StatusBadge status={job.status} />
      </div>

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
  const filtered = filter === "ALL" ? jobs : jobs.filter((j) => j.status === filter);

  return (
    <ClientLayout>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>

        {/* Header */}
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
            <span className="material-symbols-outlined">add</span>
            Post New Job
          </button>
        </div>

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
    </ClientLayout>
  );
}