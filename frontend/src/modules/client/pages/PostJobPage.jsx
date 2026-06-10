// src/modules/client/pages/PostJobPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";

// Skills từ DB
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

const MATCHED_EXPERTS = [
  { icon: "person",     name: "AI Scientist #1",    role: "Specialist in RAG & LLMs",  match: "98%", skills: ["NLP", "RAG"] },
  { icon: "psychology", name: "Senior ML Engineer", role: "Distributed Systems Expert", match: "95%", skills: ["Python", "Automation"] },
  { icon: "code",       name: "NLP Architect",      role: "Transformers Specialist",    match: "92%", skills: ["NLP", "OpenAI API"] },
];

const DEFAULT_FORM = {
  title: "", budgetMin: "", budgetMax: "",
  projectType: "",
  description: "", aiGeneratedDescription: "", skills: [],
};

const inputStyle = {
  background: "#1d2026", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8,
  padding: "12px 16px", color: "#e1e2eb", width: "100%", outline: "none",
  fontFamily: "Inter, sans-serif", fontSize: 15, transition: "border-color 0.2s",
  boxSizing: "border-box",
};
const labelStyle = {
  display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 11,
  textTransform: "uppercase", letterSpacing: "0.1em", color: "#c2c6d6", marginBottom: 8,
};

// Build payload chung cho cả draft và submit
const buildPayload = (form) => ({
  title: form.title,
  description: form.description,
  aiGeneratedDescription: form.aiGeneratedDescription,
  budgetMin: Number(form.budgetMin),
  budgetMax: Number(form.budgetMax),
  deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  projectType: form.projectType,          // TODO: thêm field nếu cần
  complexity: form.complexity,           // TODO: thêm field nếu cần
  expectedDeliverables: form.expectedDeliverables, // TODO: thêm field nếu cần
  isAiAssisted: !!form.aiGeneratedDescription,
  skillIds: form.skills.map((s) => s.id), // array of skillId numbers
});

export default function PostJobPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [optimizing, setOptimizing] = useState(false);
  const [showExperts, setShowExperts] = useState(false);
  const [glowDesc, setGlowDesc] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSubmitError("");
    setDraftSaved(false);
  };

  const toggleSkill = (skill) => {
    const exists = form.skills.find((s) => s.id === skill.id);
    if (exists) {
      setForm((prev) => ({ ...prev, skills: prev.skills.filter((s) => s.id !== skill.id) }));
    } else {
      setForm((prev) => ({ ...prev, skills: [...prev.skills, skill] }));
    }
    setDraftSaved(false);
  };

  const handleOptimize = () => {
    if (!form.description.trim()) {
      alert("Please enter a job description before optimizing!");
      return;
    }
    // ── TODO (BE): Thay mock bằng API call ───────────────────────────────────
    // const res = await aiOptimizeApi({ description: form.description });
    // setForm(prev => ({ ...prev, aiGeneratedDescription: res.data.optimizedText }));
    // ─────────────────────────────────────────────────────────────────────────
    setOptimizing(true);
    setShowExperts(false);
    setTimeout(() => {
      const optimized = `[AI OPTIMIZED]

POSITION: ${form.title || "AI Development Expert"}

OBJECTIVE: Build next-generation AI inference systems with cutting-edge LLM technology.

REQUIRED SKILLS:
${form.skills.length > 0 ? form.skills.map(s => `- ${s.name}`).join("\n") : "- Python\n- NLP"}
- Strong software engineering practices

DELIVERABLES:
- Production-ready AI pipeline
- Documented codebase and API
- Performance benchmarks

COMPENSATION: $${form.budgetMin || "TBD"} — $${form.budgetMax || "TBD"} USD`;

      setForm((prev) => ({ ...prev, aiGeneratedDescription: optimized }));
      setGlowDesc(true);
      setOptimizing(false);
      setShowExperts(true);
      setTimeout(() => setGlowDesc(false), 2000);
    }, 1500);
  };

  // POST /api/jobs/draft — lưu nháp
  const handleSaveDraft = async () => {
    if (!form.title.trim()) {
      setSubmitError("Please enter a job title before saving draft.");
      return;
    }
    setSavingDraft(true);
    setSubmitError("");
    try {
      await axiosInstance.post("/jobs/draft", buildPayload(form));
      setDraftSaved(true);
    } catch (err) {
      setSubmitError(err?.response?.data?.message || "Failed to save draft. Please try again.");
    } finally {
      setSavingDraft(false);
    }
  };

  // POST /api/jobs/submit — submit chính thức
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    try {
      await axiosInstance.post("/jobs/submit", buildPayload(form));
      setForm(DEFAULT_FORM);
      setShowExperts(false);
      navigate("/client/projects");
    } catch (err) {
      setSubmitError(err?.response?.data?.message || "Failed to post job. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ClientLayout>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>

        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 32, fontWeight: 700, color: "#e1e2eb", marginBottom: 8 }}>Post an AI Job</h1>
          <p style={{ color: "#8c90a0", fontSize: 15 }}>Set your requirements to find the perfect AI expert.</p>
        </div>

        <div style={{ background: "rgba(16,19,25,0.85)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 40, boxShadow: "0 8px 32px rgba(0,0,0,0.6)", marginBottom: 40 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

              {/* Job Title */}
              <div>
                <label style={labelStyle}>Job Title</label>
                <input type="text" name="title" value={form.title} onChange={handleChange} required
                  placeholder="e.g. Senior Machine Learning Engineer" style={inputStyle}
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
                <label style={labelStyle}>Project Type</label>
                <input type="text" name="projectType" value={form.projectType} onChange={handleChange}
                  placeholder="e.g. Web App, Mobile, API, Data Pipeline..."
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
              </div>


              {/* Complexity */}
              <div>
                <label style={labelStyle}>Complexity</label>

                <select
                  name="complexity"
                  value={form.complexity}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="">Select complexity</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              {/* Skills */}
              <div>
                <label style={labelStyle}>Required Skills</label>
                <p style={{ fontSize: 12, color: "#8c90a0", marginBottom: 12 }}>Click to select skills for this job.</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {SKILL_OPTIONS.map((skill) => {
                    const selected = !!form.skills.find((s) => s.id === skill.id);
                    return (
                      <button key={skill.id} type="button" onClick={() => toggleSkill(skill)}
                        style={{ padding: "7px 14px", borderRadius: 999, fontSize: 12, fontFamily: "JetBrains Mono, monospace", cursor: "pointer", transition: "all 0.2s", background: selected ? "rgba(0,240,255,0.12)" : "rgba(255,255,255,0.04)", color: selected ? "#00F0FF" : "#8c90a0", border: selected ? "1px solid rgba(0,240,255,0.4)" : "1px solid rgba(255,255,255,0.1)", fontWeight: selected ? 700 : 400 }}>
                        {selected ? "✓ " : "+ "}{skill.name}
                      </button>
                    );
                  })}
                </div>
                {form.skills.length > 0 && (
                  <p style={{ fontSize: 12, color: "#00F0FF", marginTop: 10 }}>
                    {form.skills.length} skill{form.skills.length > 1 ? "s" : ""} selected: {form.skills.map(s => s.name).join(", ")}
                  </p>
                )}
              </div>

              {/* Expected Deliverables */}
              <div>
                <label style={labelStyle}>Expected Deliverables</label>
                <textarea
                  name="expectedDeliverables"
                  value={form.expectedDeliverables}
                  onChange={handleChange}
                  rows={4}
                  placeholder="e.g. Source code, API documentation, deployment guide..."
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>

              {/* Description */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Job Description</label>
                  <button type="button" onClick={handleOptimize} disabled={optimizing}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "rgba(0,240,255,0.05)", color: "#00F0FF", border: "1px solid rgba(0,240,255,0.3)", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: optimizing ? "not-allowed" : "pointer", opacity: optimizing ? 0.6 : 1 }}
                    onMouseEnter={(e) => !optimizing && (e.currentTarget.style.background = "rgba(0,240,255,0.12)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,240,255,0.05)")}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_awesome</span>
                    {optimizing ? "Optimizing..." : "Optimize with AI"}
                  </button>
                </div>
                <textarea name="description" value={form.description} onChange={handleChange}
                  disabled={optimizing} placeholder="Describe the role, responsibilities, and what you're looking for..." rows={6}
                  style={{ ...inputStyle, resize: "vertical", opacity: optimizing ? 0.5 : 1 }}
                  onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
              </div>

              {/* AI Generated Description */}
              {form.aiGeneratedDescription && (
                <div>
                  <label style={{ ...labelStyle, color: "#00F0FF" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: "middle", marginRight: 6 }}>auto_awesome</span>
                    AI Generated Description
                  </label>
                  <div style={{ position: "relative" }}>
                    <textarea name="aiGeneratedDescription" value={form.aiGeneratedDescription} onChange={handleChange} rows={10}
                      style={{ ...inputStyle, resize: "vertical", borderColor: glowDesc ? "rgba(0,240,255,0.5)" : "rgba(0,240,255,0.2)", boxShadow: glowDesc ? "0 0 20px rgba(0,240,255,0.15)" : "none", background: "rgba(0,240,255,0.03)", transition: "all 0.3s" }}
                      onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(0,240,255,0.2)")} />
                    <div style={{ position: "absolute", top: 12, right: 12, pointerEvents: "none" }}>
                      <span style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", color: "#00F0FF", opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.1em" }}>Synthetix AI</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: "#8c90a0", marginTop: 6, fontStyle: "italic" }}>You can edit the AI-generated description above before posting.</p>
                </div>
              )}

              {/* Draft saved notice */}
              {draftSaved && (
                <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 8, padding: "12px 16px", color: "#4ade80", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
                  Draft saved successfully!
                </div>
              )}

              {/* Error */}
              {submitError && (
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "12px 16px", color: "#f87171", fontSize: 14 }}>
                  {submitError}
                </div>
              )}

              {/* Footer */}
              <div style={{ paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#8c90a0", fontSize: 13 }}>
                  <span className="material-symbols-outlined" style={{ color: "#00F0FF", fontSize: 20 }}>verified_user</span>
                  Job postings are moderated by the Synthetix Trust system.
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  {/* Cancel */}
                  <button type="button" onClick={() => navigate("/client/dashboard")}
                    style={{ padding: "12px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#c2c6d6", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 14 }}>
                    Cancel
                  </button>

                  {/* Save Draft — POST /api/jobs/draft */}
                  <button type="button" onClick={handleSaveDraft} disabled={savingDraft}
                    style={{ padding: "12px 20px", borderRadius: 8, border: "1px solid rgba(173,198,255,0.3)", background: "rgba(173,198,255,0.05)", color: "#adc6ff", cursor: savingDraft ? "not-allowed" : "pointer", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, opacity: savingDraft ? 0.6 : 1, display: "flex", alignItems: "center", gap: 8 }}>
                    {savingDraft && <span className="material-symbols-outlined" style={{ fontSize: 16 }}>progress_activity</span>}
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
                    {savingDraft ? "Saving..." : "Save Draft"}
                  </button>

                  {/* Submit — POST /api/jobs/submit */}
                  <button type="submit" disabled={submitting}
                    style={{ padding: "12px 32px", borderRadius: 8, background: submitting ? "#1d2026" : "#00F0FF", color: submitting ? "#8c90a0" : "#002022", fontWeight: 700, fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, border: "none", cursor: submitting ? "not-allowed" : "pointer", boxShadow: submitting ? "none" : "0 0 20px rgba(0,240,255,0.3)", display: "flex", alignItems: "center", gap: 8 }}>
                    {submitting && <span className="material-symbols-outlined" style={{ fontSize: 18 }}>progress_activity</span>}
                    {submitting ? "Posting..." : "Post Job"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Expert Recommendations */}
        {showExperts && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span className="material-symbols-outlined" style={{ color: "#00F0FF" }}>auto_awesome</span>
                <h2 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 24, fontWeight: 700, color: "#e1e2eb" }}>AI-Matched Experts</h2>
              </div>
              <p style={{ color: "#8c90a0", fontSize: 14 }}>Top specialists matched to your job requirements.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {MATCHED_EXPERTS.map((expert) => (
                <div key={expert.name}
                  style={{ background: "rgba(16,19,25,0.85)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: 24, display: "flex", flexDirection: "column", gap: 14, cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,240,255,0.4)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.transform = "translateY(0)"; }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(0,240,255,0.08)", border: "1px solid rgba(0,240,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined" style={{ color: "#00F0FF" }}>{expert.icon}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", color: "#8c90a0", textTransform: "uppercase" }}>Match</div>
                      <div style={{ color: "#00F0FF", fontWeight: 700, fontSize: 20 }}>{expert.match}</div>
                    </div>
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 700, color: "#e1e2eb", fontSize: 15, marginBottom: 4 }}>{expert.name}</h3>
                    <p style={{ fontSize: 12, color: "#8c90a0" }}>{expert.role}</p>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {expert.skills.map((skill) => (
                      <span key={skill} style={{ padding: "3px 8px", background: "rgba(0,240,255,0.08)", border: "1px solid rgba(0,240,255,0.15)", borderRadius: 4, fontSize: 10, color: "#00F0FF", fontFamily: "JetBrains Mono, monospace" }}>{skill}</span>
                    ))}
                  </div>
                  <button style={{ width: "100%", padding: "9px", background: "#1d2026", color: "#e1e2eb", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#272a30")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#1d2026")}>
                    View Profile
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </ClientLayout>
  );
}