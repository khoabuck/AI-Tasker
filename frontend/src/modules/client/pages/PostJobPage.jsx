// src/modules/client/pages/PostJobPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
<<<<<<< HEAD

const MATCHED_EXPERTS = [
  { icon: "person",     name: "AI Scientist #1",    role: "Specialist in RAG & LLMs",  match: "98%", skills: ["PyTorch", "LangChain"] },
  { icon: "psychology", name: "Senior ML Engineer", role: "Distributed Systems Expert", match: "95%", skills: ["Kubernetes", "TensorFlow"] },
  { icon: "code",       name: "NLP Architect",      role: "Transformers Specialist",    match: "92%", skills: ["BERT", "HuggingFace"] },
];

const DEFAULT_FORM = { title: "", category: "", budgetFrom: "", budgetTo: "", description: "" };

export default function PostJobPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [optimizing, setOptimizing] = useState(false);
  const [showExperts, setShowExperts] = useState(false);
  const [glowDesc, setGlowDesc] = useState(false);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleOptimize = () => {
    if (!form.description.trim()) { alert("Vui lòng nhập mô tả công việc trước khi tối ưu!"); return; }

    // ── TODO (BE): Thay mock bên dưới bằng API call ──────────────────────────────
    // import { aiApi } from "../../../api/ai.api";
    // const res = await aiApi.optimizeJobDescription({ description: form.description });
    // setForm(prev => ({ ...prev, description: res.data.optimizedText }));
    // setShowExperts(true);
    // ─────────────────────────────────────────────────────────────────────────────

    setOptimizing(true);
    setShowExperts(false);
    setTimeout(() => {
      setForm((prev) => ({ ...prev, description: `[ĐÃ TỐI ƯU BỞI AI]\n\nCHỨC DANH: Chuyên gia Phát triển AI\n\nMỤC TIÊU: Xây dựng hệ thống suy luận thế hệ mới...\n\nKỸ NĂNG YÊU CẦU:\n- Thành thạo Python, PyTorch/TensorFlow\n- Kinh nghiệm triển khai LLM (Fine-tuning Llama, GPT)\n- Kỹ năng tối ưu hóa Vector DB\n\nLỢI ÍCH: Môi trường làm việc High-tech, lương thưởng hấp dẫn...` }));
      setGlowDesc(true);
      setOptimizing(false);
      setShowExperts(true);
      setTimeout(() => setGlowDesc(false), 2000);
    }, 1500);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // ── TODO (BE): Thay localStorage bên dưới bằng API call ─────────────────────
    // import { jobApi } from "../../../api/job.api";
    // await jobApi.createJob({ title, category, budgetFrom, budgetTo, description });
    // navigate("/client/projects");
    // ─────────────────────────────────────────────────────────────────────────────

    // Lưu job vào localStorage tạm (xóa khi BE xong)
    const newJob = {
      id: Date.now(),                          // TODO (BE): id do server trả về
      title: form.title || "Untitled Job",
      category: form.category || "General",
      budgetFrom: form.budgetFrom,
      budgetTo: form.budgetTo,
      description: form.description,
      status: "PENDING",                       // TODO (BE): status do server quản lý
      createdAt: new Date().toISOString(),
    };
    const existing = JSON.parse(localStorage.getItem("client_jobs") || "[]");
    localStorage.setItem("client_jobs", JSON.stringify([newJob, ...existing]));

    // Reset form về mặc định
    setForm(DEFAULT_FORM);
    setShowExperts(false);

    // Chuyển sang trang list projects
    navigate("/client/projects");
  };

  const inputStyle = { background: "#1d2026", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "12px 16px", color: "#e1e2eb", width: "100%", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 15, transition: "border-color 0.2s" };
  const labelStyle = { display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#c2c6d6", marginBottom: 8 };

  return (
    <ClientLayout>
      <div style={{ maxWidth: 896, margin: "0 auto", padding: "48px 24px", position: "relative", zIndex: 10 }}>

        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 32, fontWeight: 700, color: "#e1e2eb", marginBottom: 8 }}>Post an AI Job</h1>
          <p style={{ color: "#c2c6d6" }}>Set your requirements for AI talent matching.</p>
        </div>

        <div style={{ background: "rgba(16,19,25,0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.6)", marginBottom: 48 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Job Title</label>
                  <input type="text" name="title" value={form.title} onChange={handleChange} placeholder="e.g. Senior Machine Learning Engineer" style={inputStyle} onFocus={(e) => (e.target.style.borderColor = "#00F0FF")} onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                </div>
                <div>
                  <label style={labelStyle}>AI Category</label>
                  <input type="text" name="category" value={form.category} onChange={handleChange} placeholder="e.g. LLM & Generative AI, Computer Vision..." style={inputStyle} onFocus={(e) => (e.target.style.borderColor = "#00F0FF")} onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Budget Range</label>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <input type="number" name="budgetFrom" value={form.budgetFrom} onChange={handleChange} placeholder="From" style={inputStyle} onFocus={(e) => (e.target.style.borderColor = "#00F0FF")} onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                  <span style={{ color: "#8c90a0", flexShrink: 0 }}>—</span>
                  <input type="number" name="budgetTo" value={form.budgetTo} onChange={handleChange} placeholder="To" style={inputStyle} onFocus={(e) => (e.target.style.borderColor = "#00F0FF")} onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                  <span style={{ color: "#c2c6d6", flexShrink: 0, fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>USD/Month</span>
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Job Description</label>
                  <button type="button" onClick={handleOptimize} disabled={optimizing}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "#232A35", color: "#00F0FF", border: "1px solid rgba(0,240,255,0.3)", borderRadius: 999, fontSize: 14, fontWeight: 500, cursor: optimizing ? "not-allowed" : "pointer", opacity: optimizing ? 0.7 : 1, fontFamily: "Inter, sans-serif" }}
                    onMouseEnter={(e) => !optimizing && (e.currentTarget.style.background = "rgba(0,240,255,0.1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#232A35")}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_awesome</span>
                    {optimizing ? "Optimizing..." : "Optimize with AI"}
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                  <textarea name="description" value={form.description} onChange={handleChange} disabled={optimizing}
                    placeholder="Enter detailed mission, skill requirements and work environment..." rows={8}
                    style={{ ...inputStyle, resize: "none", boxShadow: glowDesc ? "0 0 20px rgba(0,240,255,0.2)" : "none", opacity: optimizing ? 0.6 : 1 }}
                    onFocus={(e) => (e.target.style.borderColor = "#00F0FF")} onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                  <div style={{ position: "absolute", bottom: 16, right: 16, pointerEvents: "none", opacity: 0.2, fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#00F0FF" }}>Synthetix Engine Active</div>
                </div>
                <p style={{ fontSize: 12, color: "#8c90a0", fontStyle: "italic", marginTop: 6 }}>Use AI tools to restructure content to attract top experts.</p>
              </div>

              <div style={{ paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#8c90a0" }}>
                  <span className="material-symbols-outlined" style={{ color: "#00F0FF" }}>verified_user</span>
                  <span style={{ fontSize: 14 }}>Job postings will be moderated by the Synthetix Trust system.</span>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <button type="button" onClick={() => navigate("/client/dashboard")}
                    style={{ padding: "12px 32px", borderRadius: 8, border: "1px solid rgba(140,144,160,0.3)", background: "transparent", color: "#e1e2eb", cursor: "pointer", fontWeight: 500, fontFamily: "Inter, sans-serif", fontSize: 15 }}>
                    Cancel
                  </button>
                  <button type="submit"
                    style={{ padding: "12px 48px", borderRadius: 8, background: "#00F0FF", color: "#002022", fontWeight: 700, fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, border: "none", cursor: "pointer", boxShadow: "0 0 20px rgba(0,240,255,0.3)", transition: "all 0.2s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 30px rgba(0,240,255,0.5)")}
                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 20px rgba(0,240,255,0.3)")}>
                    Post Job
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {showExperts && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 28, fontWeight: 700, color: "#e1e2eb", marginBottom: 8 }}>AI-Powered Expert Recommendations</h2>
              <p style={{ color: "#c2c6d6" }}>Based on your job requirements, we recommend these top specialists.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
              {MATCHED_EXPERTS.map((expert) => (
                <div key={expert.name}
                  style={{ background: "rgba(16,19,25,0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 16, transition: "border-color 0.2s", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(0,240,255,0.5)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#272a30", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined" style={{ color: "#00F0FF" }}>{expert.icon}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", color: "#8c90a0", letterSpacing: "0.1em" }}>Match Score</div>
                      <div style={{ color: "#00F0FF", fontWeight: 700, fontSize: 18 }}>{expert.match}</div>
                    </div>
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 700, color: "#e1e2eb", marginBottom: 4 }}>{expert.name}</h3>
                    <p style={{ fontSize: 13, color: "#c2c6d6" }}>{expert.role}</p>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {expert.skills.map((skill) => (
                      <span key={skill} style={{ padding: "4px 8px", background: "rgba(0,240,255,0.1)", border: "1px solid rgba(0,240,255,0.2)", borderRadius: 4, fontSize: 10, color: "#00F0FF", fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", fontWeight: 700 }}>{skill}</span>
                    ))}
                  </div>
                  <button style={{ marginTop: 8, width: "100%", padding: "10px", background: "#232A35", color: "#e1e2eb", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#32353b")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#232A35")}>
                    Preview Profile
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }`}</style>
=======
import axiosInstance from "../../../api/axiosInstance";

const SKILL_OPTIONS = [
  { id: 1,  name: "Chatbot" },
  { id: 2,  name: "NLP" },
  { id: 3,  name: "OpenAI API" },
  { id: 4,  name: "Python" },
  { id: 5,  name: "Computer Vision" },
  { id: 6,  name: "OCR" },
  { id: 7,  name: "Data Analytics" },
  { id: 8,  name: "Automation" },
  { id: 9,  name: "Prompt Engineering" },
  { id: 10, name: "RAG" },
  { id: 11, name: "SQL" },
  { id: 12, name: "Power BI" },
  { id: 13, name: "ASP.NET Core" },
  { id: 14, name: "SignalR" },
];

const DEFAULT_FORM = {
  title: "", budgetMin: "", budgetMax: "",
  projectType: "", complexity: "",
  description: "", aiGeneratedDescription: "",
  expectedDeliverables: "", deadline: "",
  skills: [],
};

const inputStyle = {
  background: "#1d2026",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  padding: "12px 16px",
  color: "#e1e2eb",
  width: "100%",
  outline: "none",
  fontFamily: "Inter, sans-serif",
  fontSize: 15,
  transition: "border-color 0.2s",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "#c2c6d6",
  marginBottom: 8,
};

const buildPayload = (form) => ({
  title: form.title,
  description: form.description,
  aiGeneratedDescription: form.aiGeneratedDescription || null,
  budgetMin: Number(form.budgetMin),
  budgetMax: Number(form.budgetMax),
  deadline: form.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  projectType: form.projectType,
  complexity: form.complexity || null,
  expectedDeliverables: form.expectedDeliverables || "",
  isAiAssisted: !!form.aiGeneratedDescription,
  skillIds: form.skills.map((s) => s.id),
});

export default function PostJobPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("manual"); // "manual" | "ai"
  const [form, setForm] = useState(DEFAULT_FORM);
  const [generating, setGenerating] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
    setDraftSaved(false);
  };

  const toggleSkill = (skill) => {
    const exists = form.skills.find((s) => s.id === skill.id);
    setForm((prev) => ({
      ...prev,
      skills: exists
        ? prev.skills.filter((s) => s.id !== skill.id)
        : [...prev.skills, skill],
    }));
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setForm(DEFAULT_FORM);
    setError("");
    setDraftSaved(false);
  };

  // POST /api/jobs/ai-assistant/analyze
  const handleGenerate = async () => {
    if (!form.description.trim()) {
      alert("Please enter a description before generating!");
      return;
    }
    setGenerating(true);
    setError("");
    try {
      const res = await axiosInstance.post("/jobs/ai-assistant/analyze", {
        rawRequirement: form.description,
        budgetMin: Number(form.budgetMin) || 0,
        budgetMax: Number(form.budgetMax) || 0,
        deadline: form.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        projectTypeHint: form.projectType || "",
      });
      const data = res.data;
      setForm((prev) => ({
        ...prev,
        title: data.suggestedTitle || prev.title,
        description: data.improvedDescription || prev.description,
        aiGeneratedDescription: data.aiGeneratedDescription || "",
        projectType: data.suggestedProjectType || prev.projectType,
        complexity: data.suggestedComplexity || "",
        expectedDeliverables: data.expectedDeliverables || "",
        skills: (data.suggestedSkills || []).map(s => ({ id: s.skillId, name: s.skillName })),
      }));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to generate. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // POST /api/jobs/draft
  const handleSaveDraft = async () => {
    if (!form.title.trim()) {
      setError("Please enter a job title before saving draft.");
      return;
    }
    setSavingDraft(true);
    setError("");
    try {
      await axiosInstance.post("/jobs/draft", buildPayload(form));
      setDraftSaved(true);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save draft.");
    } finally {
      setSavingDraft(false);
    }
  };

  // POST /api/jobs/submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await axiosInstance.post("/jobs/submit", buildPayload(form));
      setForm(DEFAULT_FORM);
      navigate("/client/projects");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to post job.");
    } finally {
      setSubmitting(false);
    }
  };

  const [customSkill, setCustomSkill] = useState("");

  const addCustomSkill = () => {
  const s = customSkill.trim();
  if (!s) return;
  const exists = form.skills.find((sk) => sk.name.toLowerCase() === s.toLowerCase());
  if (!exists) {
    setForm((prev) => ({ ...prev, skills: [...prev.skills, { id: -(Date.now()), name: s }] }));
  }
  setCustomSkill("");
};

  return (
    <ClientLayout>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: 40, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 32, fontWeight: 700, color: "#e1e2eb", marginBottom: 8 }}>
              Post an AI Job
            </h1>
            <p style={{ color: "#8c90a0", fontSize: 15 }}>
              {mode === "manual"
                ? "Fill in all details manually to post your job."
                : "Describe your need and let AI build the perfect job post."}
            </p>
          </div>

          {/* Mode toggle buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={() => switchMode("manual")}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: mode === "manual" ? "rgba(255,255,255,0.08)" : "transparent", color: mode === "manual" ? "#e1e2eb" : "#8c90a0", border: `1px solid ${mode === "manual" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"}`, borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "all 0.2s" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit_note</span>
              Manual
            </button>
            <button type="button" onClick={() => switchMode("ai")}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: mode === "ai" ? "rgba(0,240,255,0.1)" : "transparent", color: mode === "ai" ? "#00F0FF" : "#8c90a0", border: `1px solid ${mode === "ai" ? "rgba(0,240,255,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "all 0.2s", boxShadow: mode === "ai" ? "0 0 12px rgba(0,240,255,0.15)" : "none" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_awesome</span>
              Generate with AI
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* ── MANUAL MODE ── */}
            {mode === "manual" && (
              <>
                {/* Card 1 — Basic Info */}
                <div style={{ background: "rgba(16,19,25,0.85)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                  <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 16, fontWeight: 700, color: "#e1e2eb", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    Basic Information
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                    {/* Title */}
                    <div>
                      <label style={labelStyle}>Job Title <span style={{ color: "#f87171" }}>*</span></label>
                      <input type="text" name="title" value={form.title} onChange={handleChange} required
                        placeholder="e.g. Build an AI chatbot for customer support"
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                    </div>

                    {/* Budget */}
                    <div>
                      <label style={labelStyle}>Budget Range (USD/Month) <span style={{ color: "#f87171" }}>*</span></label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center" }}>
                        <div style={{ position: "relative" }}>
                          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#00F0FF", fontWeight: 700 }}>$</span>
                          <input type="number" name="budgetMin" value={form.budgetMin} onChange={handleChange} required
                            placeholder="Min" style={{ ...inputStyle, paddingLeft: 28 }}
                            onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                        </div>
                        <span style={{ color: "#414754", fontSize: 20, textAlign: "center" }}>—</span>
                        <div style={{ position: "relative" }}>
                          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#00F0FF", fontWeight: 700 }}>$</span>
                          <input type="number" name="budgetMax" value={form.budgetMax} onChange={handleChange} required
                            placeholder="Max" style={{ ...inputStyle, paddingLeft: 28 }}
                            onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                        </div>
                      </div>
                    </div>

                    {/* Project Type */}
                    <div>
                      <label style={labelStyle}>Project Type</label>
                      <input type="text" name="projectType" value={form.projectType} onChange={handleChange}
                        placeholder="e.g. Chatbot, RAG, AI Automation..."
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                    </div>

                    {/* Complexity */}
                    <div>
                      <label style={labelStyle}>Complexity</label>
                      <select name="complexity" value={form.complexity} onChange={handleChange}
                        style={{ ...inputStyle, cursor: "pointer" }}
                        onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}>
                        <option value="">Select complexity...</option>
                        <option value="SIMPLE">Simple</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="COMPLEX">Complex</option>
                      </select>
                    </div>

                    {/* Deadline */}
                    <div>
                      <label style={labelStyle}>Deadline</label>
                      <input type="date" name="deadline" value={form.deadline} onChange={handleChange}
                        min={new Date().toISOString().split("T")[0]}
                        style={{ ...inputStyle, colorScheme: "dark" }}
                        onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                    </div>
                  </div>
                </div>

                {/* Card 2 — Description */}
                <div style={{ background: "rgba(16,19,25,0.85)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                  <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 16, fontWeight: 700, color: "#e1e2eb", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    Job Description
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div>
                      <label style={labelStyle}>Description <span style={{ color: "#f87171" }}>*</span></label>
                      <textarea name="description" value={form.description} onChange={handleChange} required
                        placeholder="Describe the role, responsibilities, and requirements..."
                        rows={6} style={{ ...inputStyle, resize: "vertical" }}
                        onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                    </div>

                    <div>
                      <label style={labelStyle}>Expected Deliverables</label>
                      <textarea name="expectedDeliverables" value={form.expectedDeliverables} onChange={handleChange}
                        placeholder="What do you expect to receive? e.g. Source code, documentation, demo..."
                        rows={4} style={{ ...inputStyle, resize: "vertical" }}
                        onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                    </div>
                  </div>
                </div>

                {/* Card 3 — Skills */}
                <div style={{ background: "rgba(16,19,25,0.85)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                  <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 16, fontWeight: 700, color: "#e1e2eb", marginBottom: 8, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    Required Skills
                  </h3>
                  <p style={{ fontSize: 13, color: "#8c90a0", marginBottom: 16 }}>Select all skills needed for this job.</p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                    {SKILL_OPTIONS.map((skill) => {
                      const selected = !!form.skills.find((s) => s.id === skill.id);
                      return (
                        <button key={skill.id} type="button" onClick={() => toggleSkill(skill)}
                          style={{ padding: "7px 16px", borderRadius: 999, fontSize: 12, fontFamily: "JetBrains Mono, monospace", cursor: "pointer", transition: "all 0.15s", background: selected ? "rgba(0,240,255,0.12)" : "rgba(255,255,255,0.04)", color: selected ? "#00F0FF" : "#8c90a0", border: selected ? "1px solid rgba(0,240,255,0.4)" : "1px solid rgba(255,255,255,0.1)", fontWeight: selected ? 700 : 400 }}>
                          {selected ? "✓ " : ""}{skill.name}
                        </button>
                      );
                    })}
                  </div>
                  
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <input
                        value={customSkill}
                        onChange={(e) => setCustomSkill(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSkill(); } }}
                        placeholder="Type a custom skill and press Enter..."
                        style={{ ...inputStyle, flex: 1, fontSize: 13, padding: "8px 14px" }}
                        onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                      <button type="button" onClick={addCustomSkill}
                        style={{ padding: "8px 16px", background: "#232A35", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#e1e2eb", cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#32353b")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#232A35")}>
                        Add
                      </button>
                    </div>

                  {form.skills.length > 0 && (
                    <p style={{ fontSize: 12, color: "#00F0FF", marginTop: 10 }}>
                      {form.skills.length} skill{form.skills.length > 1 ? "s" : ""} selected: {form.skills.map(s => s.name).join(", ")}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ── AI MODE ── */}
            {mode === "ai" && (
              <>
                {/* Card 1 — Basic fields for AI */}
                <div style={{ background: "rgba(16,19,25,0.85)", backdropFilter: "blur(20px)", border: "1px solid rgba(0,240,255,0.15)", borderRadius: 16, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <span className="material-symbols-outlined" style={{ color: "#00F0FF" }}>auto_awesome</span>
                    <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 16, fontWeight: 700, color: "#e1e2eb" }}>
                      Tell AI what you need
                    </h3>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                    {/* Title */}
                    <div>
                      <label style={labelStyle}>Job Title</label>
                      <input type="text" name="title" value={form.title} onChange={handleChange}
                        placeholder="e.g. Build an AI chatbot (optional, AI will suggest)"
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                    </div>

                    {/* Budget */}
                    <div>
                      <label style={labelStyle}>Budget Range (USD/Month)</label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center" }}>
                        <div style={{ position: "relative" }}>
                          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#00F0FF", fontWeight: 700 }}>$</span>
                          <input type="number" name="budgetMin" value={form.budgetMin} onChange={handleChange}
                            placeholder="Min" style={{ ...inputStyle, paddingLeft: 28 }}
                            onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                        </div>
                        <span style={{ color: "#414754", fontSize: 20, textAlign: "center" }}>—</span>
                        <div style={{ position: "relative" }}>
                          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#00F0FF", fontWeight: 700 }}>$</span>
                          <input type="number" name="budgetMax" value={form.budgetMax} onChange={handleChange}
                            placeholder="Max" style={{ ...inputStyle, paddingLeft: 28 }}
                            onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                        </div>
                      </div>
                    </div>

                    {/* Project Type */}
                    <div>
                      <label style={labelStyle}>Project Type Hint</label>
                      <input type="text" name="projectType" value={form.projectType} onChange={handleChange}
                        placeholder="e.g. Chatbot, RAG, Automation... (helps AI suggest better)"
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                    </div>

                    {/* Description + Generate button */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
                        <label style={{ ...labelStyle, marginBottom: 0 }}>Your Requirements <span style={{ color: "#f87171" }}>*</span></label>
                        <button type="button" onClick={handleGenerate} disabled={generating}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", background: generating ? "#1d2026" : "linear-gradient(135deg, rgba(23,114,235,0.2), rgba(0,240,255,0.15))", color: generating ? "#8c90a0" : "#00F0FF", border: "1px solid rgba(0,240,255,0.4)", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: generating ? "not-allowed" : "pointer", opacity: generating ? 0.6 : 1, boxShadow: generating ? "none" : "0 0 12px rgba(0,240,255,0.2)" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18, animation: generating ? "spin 1s linear infinite" : "none" }}>
                            {generating ? "autorenew" : "auto_awesome"}
                          </span>
                          {generating ? "Generating..." : "Generate with AI"}
                        </button>
                      </div>
                      <textarea name="description" value={form.description} onChange={handleChange} required
                        placeholder="Describe what you need in plain language. AI will create a professional job post for you..."
                        rows={5} style={{ ...inputStyle, resize: "vertical" }}
                        onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                      <p style={{ fontSize: 12, color: "#8c90a0", marginTop: 6 }}>
                        Describe your needs, then click <span style={{ color: "#00F0FF", fontWeight: 600 }}>Generate with AI</span> — AI will fill in all fields automatically.
                      </p>
                    </div>
                  </div>
                </div>

                {/* AI Results — show after generate */}
                {form.aiGeneratedDescription && (
                  <div style={{ background: "rgba(16,19,25,0.85)", backdropFilter: "blur(20px)", border: "1px solid rgba(0,240,255,0.2)", borderRadius: 16, padding: 32, boxShadow: "0 8px 32px rgba(0,240,255,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid rgba(0,240,255,0.1)" }}>
                      <span className="material-symbols-outlined" style={{ color: "#00F0FF", fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                      <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 16, fontWeight: 700, color: "#00F0FF" }}>
                        AI Generated — Review & Edit
                      </h3>
                      <span style={{ fontSize: 10, padding: "2px 8px", background: "rgba(0,240,255,0.08)", border: "1px solid rgba(0,240,255,0.2)", borderRadius: 999, color: "#00F0FF", fontFamily: "JetBrains Mono, monospace" }}>ALL FIELDS EDITABLE</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                      {/* Suggested Title */}
                      <div>
                        <label style={labelStyle}>Job Title <span style={{ color: "#f87171" }}>*</span></label>
                        <input type="text" name="title" value={form.title} onChange={handleChange} required
                          style={inputStyle}
                          onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                      </div>

                      {/* Improved Description */}
                      <div>
                        <label style={labelStyle}>Improved Description</label>
                        <textarea name="description" value={form.description} onChange={handleChange} rows={5}
                          style={{ ...inputStyle, resize: "vertical" }}
                          onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                      </div>

                      {/* AI Generated Description */}
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <label style={{ ...labelStyle, marginBottom: 0, color: "#00F0FF" }}>AI Generated Description</label>
                        </div>
                        <div style={{ position: "relative" }}>
                          <textarea name="aiGeneratedDescription" value={form.aiGeneratedDescription} onChange={handleChange} rows={10}
                            style={{ ...inputStyle, resize: "vertical", borderColor: "rgba(0,240,255,0.25)", background: "rgba(0,240,255,0.02)" }}
                            onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(0,240,255,0.25)")} />
                          <div style={{ position: "absolute", top: 10, right: 12, pointerEvents: "none" }}>
                            <span style={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", color: "#00F0FF", opacity: 0.35, textTransform: "uppercase", letterSpacing: "0.1em" }}>Synthetix AI</span>
                          </div>
                        </div>
                      </div>

                      {/* Project Type + Complexity */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div>
                          <label style={labelStyle}>Project Type</label>
                          <input type="text" name="projectType" value={form.projectType} onChange={handleChange}
                            style={inputStyle}
                            onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                        </div>
                        <div>
                          <label style={labelStyle}>Complexity</label>
                          <select name="complexity" value={form.complexity} onChange={handleChange}
                            style={{ ...inputStyle, cursor: "pointer" }}
                            onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}>
                            <option value="">Select...</option>
                            <option value="SIMPLE">Simple</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="COMPLEX">Complex</option>
                          </select>
                        </div>
                      </div>

                      {/* Expected Deliverables */}
                      <div>
                        <label style={labelStyle}>Expected Deliverables</label>
                        <textarea name="expectedDeliverables" value={form.expectedDeliverables} onChange={handleChange} rows={4}
                          style={{ ...inputStyle, resize: "vertical" }}
                          onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                      </div>

                      {/* Suggested Skills */}
                      <div>
                      <label style={labelStyle}>Suggested Skills</label>
                      <p style={{ fontSize: 12, color: "#8c90a0", marginBottom: 12 }}>AI suggested these — you can add or remove.</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                        {SKILL_OPTIONS.map((skill) => {
                          const selected = !!form.skills.find((s) => s.id === skill.id);
                          return (
                            <button key={skill.id} type="button" onClick={() => toggleSkill(skill)}
                              style={{ padding: "7px 16px", borderRadius: 999, fontSize: 12, fontFamily: "JetBrains Mono, monospace", cursor: "pointer", transition: "all 0.15s", background: selected ? "rgba(0,240,255,0.12)" : "rgba(255,255,255,0.04)", color: selected ? "#00F0FF" : "#8c90a0", border: selected ? "1px solid rgba(0,240,255,0.4)" : "1px solid rgba(255,255,255,0.1)", fontWeight: selected ? 700 : 400 }}>
                              {selected ? "✓ " : ""}{skill.name}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom skill input */}
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          value={customSkill}
                          onChange={(e) => setCustomSkill(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSkill(); } }}
                          placeholder="Type a custom skill and press Enter..."
                          style={{ ...inputStyle, flex: 1, fontSize: 13, padding: "8px 14px" }}
                          onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                        <button type="button" onClick={addCustomSkill}
                          style={{ padding: "8px 16px", background: "#232A35", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#e1e2eb", cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#32353b")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "#232A35")}>
                          Add
                        </button>
                      </div>

                      {form.skills.length > 0 && (
                        <p style={{ fontSize: 12, color: "#00F0FF", marginTop: 10 }}>
                          {form.skills.length} skill{form.skills.length > 1 ? "s" : ""} selected: {form.skills.map(s => s.name).join(", ")}
                        </p>
                      )}
                    </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Draft saved */}
            {draftSaved && (
              <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 10, padding: "12px 16px", color: "#4ade80", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
                Draft saved! You can continue editing or post the job.
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", color: "#f87171", fontSize: 14 }}>
                {error}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", paddingTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#8c90a0", fontSize: 13 }}>
                <span className="material-symbols-outlined" style={{ color: "#00F0FF", fontSize: 18 }}>verified_user</span>
                All job posts are reviewed by the Synthetix Trust system.
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" onClick={() => navigate("/client/dashboard")}
                  style={{ padding: "12px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#c2c6d6", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 14 }}>
                  Cancel
                </button>
                <button type="button" onClick={handleSaveDraft} disabled={savingDraft}
                  style={{ padding: "12px 20px", borderRadius: 8, border: "1px solid rgba(173,198,255,0.3)", background: "rgba(173,198,255,0.05)", color: "#adc6ff", cursor: savingDraft ? "not-allowed" : "pointer", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, opacity: savingDraft ? 0.6 : 1, display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
                  {savingDraft ? "Saving..." : "Save Draft"}
                </button>
                <button type="submit" disabled={submitting}
                  style={{ padding: "12px 32px", borderRadius: 8, background: submitting ? "#1d2026" : "#00F0FF", color: submitting ? "#8c90a0" : "#002022", fontWeight: 700, fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, border: "none", cursor: submitting ? "not-allowed" : "pointer", boxShadow: submitting ? "none" : "0 0 20px rgba(0,240,255,0.25)", display: "flex", alignItems: "center", gap: 8 }}>
                  {submitting && <span className="material-symbols-outlined" style={{ fontSize: 18 }}>progress_activity</span>}
                  {submitting ? "Posting..." : "Post Job"}
                </button>
              </div>
            </div>

          </div>
        </form>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
>>>>>>> origin/develop
    </ClientLayout>
  );
}