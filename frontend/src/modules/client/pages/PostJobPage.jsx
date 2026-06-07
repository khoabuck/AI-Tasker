// src/modules/client/pages/PostJobPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";

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
    navigate("client/projects");
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
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
    </ClientLayout>
  );
}