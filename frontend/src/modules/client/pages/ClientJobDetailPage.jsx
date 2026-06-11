// src/modules/client/pages/ClientJobDetailPage.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";

// ── MOCK DATA ─────────────────────────────────────────────────────────
const MOCK_JOB = {
  jobPostingId: 1,
  title: "Build an AI Chatbot for Customer Support",
  status: "OPEN",
  description: "I need an AI chatbot that can answer customer questions based on company FAQ and product documents. The chatbot should integrate with our existing CRM system.",
  aiGeneratedDescription: "Design and develop a conversational AI chatbot using NLP and machine learning algorithms to provide automated customer support. The system should handle FAQ queries, product information requests, and escalate complex issues to human agents.",
  budgetMin: 500,
  budgetMax: 2000,
  deadline: "2026-12-30T00:00:00Z",
  projectType: "Chatbot",
  complexity: "MEDIUM",
  expectedDeliverables: "- Fully functional chatbot with UI\n- API integration guide\n- Source code\n- Deployment instructions\n- 30-day support",
  isAiAssisted: true,
  createdAt: "2026-06-10T00:00:00Z",
  skills: [
    { skillId: 1, skillName: "Chatbot" },
    { skillId: 2, skillName: "NLP" },
    { skillId: 4, skillName: "Python" },
    { skillId: 3, skillName: "OpenAI API" },
  ],
};

const MOCK_PROPOSALS = [
  {
    proposalId: 1,
    expertName: "Dr. Aria Chen",
    expertTitle: "Senior NLP Engineer",
    expertAvatar: "https://i.pravatar.cc/100?img=5",
    level: "SENIOR",
    bidAmount: 1500,
    coverLetter: "I have 7 years of experience building conversational AI systems. I've successfully deployed 20+ chatbots for e-commerce and customer support. I can deliver a production-ready solution within your timeline.",
    estimatedDays: 30,
    submittedAt: "2026-06-11T08:00:00Z",
    status: "PENDING",
  },
  {
    proposalId: 2,
    expertName: "Marcus Vane",
    expertTitle: "AI Automation Engineer",
    expertAvatar: "https://i.pravatar.cc/100?img=12",
    level: "MID",
    bidAmount: 800,
    coverLetter: "I specialize in building AI chatbots using OpenAI API and LangChain. I've built similar solutions for small businesses and can integrate with your CRM efficiently.",
    estimatedDays: 21,
    submittedAt: "2026-06-11T10:30:00Z",
    status: "PENDING",
  },
];
// ─────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  DRAFT:     { label: "Draft",     color: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.25)" },
  OPEN:      { label: "Open",      color: "#00F0FF", bg: "rgba(0,240,255,0.08)",   border: "rgba(0,240,255,0.25)"   },
  ACTIVE:    { label: "Active",    color: "#22c55e", bg: "rgba(34,197,94,0.08)",   border: "rgba(34,197,94,0.25)"   },
  COMPLETED: { label: "Completed", color: "#3b82f6", bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.25)"  },
  CANCELLED: { label: "Cancelled", color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.25)"   },
  DISPUTED:  { label: "Disputed",  color: "#f97316", bg: "rgba(249,115,22,0.08)",  border: "rgba(249,115,22,0.25)"  },
};

const LEVEL_CONFIG = {
  JUNIOR: { label: "Junior", color: "#94a3b8" },
  MID:    { label: "Mid",    color: "#facc15" },
  SENIOR: { label: "Senior", color: "#00F0FF" },
  EXPERT: { label: "Expert", color: "#c0c1ff" },
};

const PROPOSAL_STATUS = {
  PENDING:  { label: "Pending",  color: "#facc15" },
  ACCEPTED: { label: "Accepted", color: "#22c55e" },
  REJECTED: { label: "Rejected", color: "#ef4444" },
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

export default function ClientJobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO (BE): thay mock bằng API thật
    // axiosInstance.get(`/jobs/${id}`)
    // axiosInstance.get(`/proposals?jobId=${id}`)
    setTimeout(() => {
      setJob(MOCK_JOB);
      setProposals(MOCK_PROPOSALS);
      setLoading(false);
    }, 600);
  }, [id]);

  if (loading) return (
    <ClientLayout>
      <div style={{ textAlign: "center", padding: "120px 0", color: "#8c90a0" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 16, animation: "spin 1s linear infinite", color: "#00F0FF" }}>autorenew</span>
        Loading job details...
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </ClientLayout>
  );

  if (!job) return (
    <ClientLayout>
      <div style={{ textAlign: "center", padding: "120px 0" }}>
        <p style={{ color: "#f87171" }}>Job not found.</p>
        <button onClick={() => navigate("/client/projects")}
          style={{ marginTop: 16, padding: "10px 24px", background: "#00F0FF", color: "#002022", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
          Back to Projects
        </button>
      </div>
    </ClientLayout>
  );

  const statusCfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.OPEN;
  const deadline = job.deadline ? new Date(job.deadline).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";
  const createdAt = job.createdAt ? new Date(job.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

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
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 26, fontWeight: 700, color: "#e1e2eb", margin: 0 }}>
                  {job.title}
                </h1>
                {job.isAiAssisted && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", background: "rgba(0,240,255,0.08)", border: "1px solid rgba(0,240,255,0.2)", borderRadius: 999, fontSize: 10, color: "#00F0FF", fontFamily: "JetBrains Mono, monospace", whiteSpace: "nowrap" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>auto_awesome</span>
                    AI Assisted
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", color: statusCfg.color, background: statusCfg.bg, border: `1px solid ${statusCfg.border}` }}>
                  {statusCfg.label}
                </span>
                <span style={{ fontSize: 13, color: "#8c90a0" }}>Posted {createdAt}</span>
                {job.projectType && <span style={{ fontSize: 13, color: "#c2c6d6" }}>{job.projectType}</span>}
              </div>
            </div>

            {/* Quick stats */}
            <div style={{ display: "flex", gap: 28 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 18, fontWeight: 700, color: "#00F0FF" }}>
                  ${job.budgetMin?.toLocaleString()}–${job.budgetMax?.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: "#8c90a0", marginTop: 2 }}>USD/month</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 18, fontWeight: 700, color: "#facc15" }}>
                  {proposals.length}
                </div>
                <div style={{ fontSize: 11, color: "#8c90a0", marginTop: 2 }}>Proposals</div>
              </div>
            </div>
          </div>

          {/* AI Recommendation button */}
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <button onClick={() => navigate(`/client/projects/${id}/recommendations`)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "rgba(192,193,255,0.08)", color: "#c0c1ff", border: "1px solid rgba(192,193,255,0.3)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(192,193,255,0.15)"; e.currentTarget.style.boxShadow = "0 0 14px rgba(192,193,255,0.2)"; e.currentTarget.style.borderColor = "#c0c1ff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(192,193,255,0.08)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "rgba(192,193,255,0.3)"; }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_awesome</span>
              View AI Recommendation
            </button>
          </div>
        </div>

        {/* Job Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Description */}
          <div style={cardStyle}>
            <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>Description</h3>
            <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.8, whiteSpace: "pre-line", margin: 0 }}>{job.description}</p>
          </div>

          {/* AI Generated Description */}
          {job.aiGeneratedDescription && (
            <div style={{ ...cardStyle, border: "1px solid rgba(0,240,255,0.15)", background: "rgba(0,240,255,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(0,240,255,0.1)" }}>
                <span className="material-symbols-outlined" style={{ color: "#00F0FF", fontSize: 18 }}>auto_awesome</span>
                <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#00F0FF", margin: 0 }}>AI Generated Description</h3>
              </div>
              <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.8, whiteSpace: "pre-line", margin: 0 }}>{job.aiGeneratedDescription}</p>
            </div>
          )}

          {/* Project Details */}
          <div style={cardStyle}>
            <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>Project Details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 20 }}>
              <div>
                <span style={labelStyle}>Budget</span>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 700, color: "#00F0FF", fontSize: 15 }}>
                  ${job.budgetMin?.toLocaleString()} — ${job.budgetMax?.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: "#8c90a0" }}>USD / month</div>
              </div>
              <div>
                <span style={labelStyle}>Deadline</span>
                <div style={{ color: "#e1e2eb", fontSize: 14, fontWeight: 600 }}>{deadline}</div>
              </div>
              <div>
                <span style={labelStyle}>Project Type</span>
                <div style={{ color: "#e1e2eb", fontSize: 14 }}>{job.projectType || "—"}</div>
              </div>
              <div>
                <span style={labelStyle}>Complexity</span>
                <div style={{ color: "#facc15", fontSize: 14, fontWeight: 600 }}>{job.complexity || "—"}</div>
              </div>
            </div>
          </div>

          {/* Expected Deliverables */}
          {job.expectedDeliverables && (
            <div style={cardStyle}>
              <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>Expected Deliverables</h3>
              <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.8, whiteSpace: "pre-line", margin: 0 }}>{job.expectedDeliverables}</p>
            </div>
          )}

          {/* Skills */}
          {job.skills?.length > 0 && (
            <div style={cardStyle}>
              <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>Required Skills</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {job.skills.map((s) => (
                  <span key={s.skillId} style={{ padding: "6px 14px", background: "rgba(0,240,255,0.08)", border: "1px solid rgba(0,240,255,0.2)", borderRadius: 999, fontSize: 12, color: "#00F0FF", fontFamily: "JetBrains Mono, monospace" }}>
                    {s.skillName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Proposals */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", margin: 0 }}>Proposals Received</h3>
              <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: "rgba(250,204,21,0.1)", color: "#facc15", border: "1px solid rgba(250,204,21,0.3)", fontFamily: "JetBrains Mono, monospace" }}>
                {proposals.length} received
              </span>
            </div>

            {proposals.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#272a30", display: "block", marginBottom: 12 }}>inbox</span>
                <p style={{ color: "#8c90a0", fontSize: 14 }}>No proposals yet. Experts will apply soon!</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {proposals.map((proposal) => {
                  const pStatus = PROPOSAL_STATUS[proposal.status] || PROPOSAL_STATUS.PENDING;
                  const level = LEVEL_CONFIG[proposal.level] || { label: proposal.level, color: "#8c90a0" };
                  const submittedDate = new Date(proposal.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={proposal.proposalId}
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 20, transition: "border-color 0.2s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(0,240,255,0.2)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                        <img src={proposal.expertAvatar} alt={proposal.expertName}
                          style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.1)", flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                                <h4 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontWeight: 700, fontSize: 15, color: "#e1e2eb", margin: 0 }}>{proposal.expertName}</h4>
                                <span style={{ padding: "2px 7px", borderRadius: 999, fontSize: 9, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", background: level.color + "20", color: level.color, border: `1px solid ${level.color}40` }}>{level.label}</span>
                              </div>
                              <p style={{ fontSize: 12, color: "#8c90a0", margin: 0 }}>{proposal.expertTitle}</p>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 17, fontWeight: 700, color: "#00F0FF" }}>${proposal.bidAmount?.toLocaleString()}</div>
                              <div style={{ fontSize: 11, color: "#8c90a0" }}>{proposal.estimatedDays} days</div>
                            </div>
                          </div>

                          <p style={{ fontSize: 13, color: "#c2c6d6", lineHeight: 1.6, margin: "0 0 12px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {proposal.coverLetter}
                          </p>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", color: pStatus.color, background: pStatus.color + "15", border: `1px solid ${pStatus.color}40` }}>{pStatus.label}</span>
                              <span style={{ fontSize: 12, color: "#8c90a0" }}>{submittedDate}</span>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              {/* View Full — cyan */}
                              <button style={{ padding: "7px 14px", background: "rgba(0,240,255,0.05)", color: "#00F0FF", border: "1px solid rgba(0,240,255,0.25)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,240,255,0.12)"; e.currentTarget.style.boxShadow = "0 0 10px rgba(0,240,255,0.2)"; e.currentTarget.style.borderColor = "#00F0FF"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,240,255,0.05)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "rgba(0,240,255,0.25)"; }}>
                                View Full
                              </button>
                              {/* Accept — green */}
                              <button style={{ padding: "7px 14px", background: "rgba(34,197,94,0.08)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(34,197,94,0.15)"; e.currentTarget.style.boxShadow = "0 0 10px rgba(34,197,94,0.2)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(34,197,94,0.08)"; e.currentTarget.style.boxShadow = "none"; }}>
                                Accept
                              </button>
                              {/* Decline — red */}
                              <button style={{ padding: "7px 14px", background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(248,113,113,0.15)")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(248,113,113,0.08)")}>
                                Decline
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </ClientLayout>
  );
}