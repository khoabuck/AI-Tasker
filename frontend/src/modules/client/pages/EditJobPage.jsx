// src/modules/client/pages/EditJobPage.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";



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

const cardStyle = {
  background: "rgba(16,19,25,0.85)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 16,
  padding: 32,
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
};

const buildPayload = (form) => ({
  title: form.title,
  description: form.description,
  aiGeneratedDescription: form.aiGeneratedDescription || null,
  budgetMin: Number(form.budgetMin),
  budgetMax: Number(form.budgetMax),
  deadline: form.deadline
    ? new Date(form.deadline).toISOString()
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  projectType: form.projectType,
  complexity: form.complexity || null,
  expectedDeliverables: form.expectedDeliverables || "",
  isAiAssisted: !!form.aiGeneratedDescription,
  skillIds: form.skills.filter((s) => s.id > 0).map((s) => s.id),
});

export default function EditJobPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [originalStatus, setOriginalStatus] = useState("");
  const [customSkill, setCustomSkill] = useState("");
  const [skillOptions, setSkillOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Fetch job data để prefill ──────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFetchError("");

    axiosInstance.get(`/jobs/${id}`, { signal: controller.signal })
      .then((res) => {
        const job = res.data;
        setOriginalStatus(job.status);

        // Map deadline: ISO string → "YYYY-MM-DD" cho input[type=date]
        const deadlineDate = job.deadline
          ? new Date(job.deadline).toISOString().split("T")[0]
          : "";

        // Map skills: BE trả về [{ skillId, skillName }] hoặc [{ id, name }]
        const mappedSkills = (job.skills || []).map((s) => ({
          id: s.skillId ?? s.id,
          name: s.skillName ?? s.name,
        }));

        setForm({
          title:                 job.title                 || "",
          budgetMin:             job.budgetMin             ?? "",
          budgetMax:             job.budgetMax             ?? "",
          projectType:           job.projectType           || "",
          complexity:            job.complexity            || "",
          description:           job.description           || "",
          aiGeneratedDescription: job.aiGeneratedDescription || "",
          expectedDeliverables:  job.expectedDeliverables  || "",
          deadline:              deadlineDate,
          skills:                mappedSkills,
        });
      })
      .catch((err) => {
        if (err?.code === "ERR_CANCELED") return;
        const msg =
          err?.response?.status === 404 ? "Job not found." :
          err?.response?.status === 403 ? "You do not have permission to edit this job." :
          "Unable to load data. Please try again.";
        setFetchError(msg);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [id]);

  useEffect(() => {
  const controller = new AbortController();

  axiosInstance
    .get("/skills", {
      params: { activeOnly: true },
      signal: controller.signal,
    })
    .then((res) => {
      const raw = res.data?.data ?? res.data;
      const items = Array.isArray(raw) ? raw : raw?.items ?? [];

      setSkillOptions(
        items.map((s) => ({
          id: s.skillId,
          name: s.skillName,
          category: s.category,
        }))
      );
    })
    .catch((err) => {
      if (err?.code !== "ERR_CANCELED") {
        console.error("Load skills failed:", err);
      }
    });

  return () => controller.abort();
}, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSaveError("");
    setSaveSuccess(false);
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

  const addCustomSkill = () => {
    const s = customSkill.trim();
    if (!s) return;
    const exists = form.skills.find((sk) => sk.name.toLowerCase() === s.toLowerCase());
    if (!exists) {
      setForm((prev) => ({
        ...prev,
        skills: [...prev.skills, { id: -(Date.now()), name: s }],
      }));
    }
    setCustomSkill("");
  };

  // ── PUT /api/jobs/{id} — lưu thay đổi ─────────────────────────────
  const handleSave = async () => {
    if (!form.title.trim()) {
      setSaveError("Job title cannot be empty.");
      return;
    }
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      await axiosInstance.put(`/jobs/${id}`, buildPayload(form));
      navigate("/client/projects");
    } catch (err) {
      setSaveError(err?.response?.data?.message || "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── PUT /api/jobs/{id}/submit — submit draft lên OPEN ──────────────
  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setSaveError("Job title cannot be empty.");
      return;
    }
    if (!confirm("Save changes and submit this job?")) return;
    setSubmitting(true);
    setSaveError("");
    try {
      // Save changes first, then submit
      await axiosInstance.put(`/jobs/${id}`, buildPayload(form));
      await axiosInstance.put(`/jobs/${id}/submit`);
      navigate("/client/projects");
    } catch (err) {
      setSaveError(err?.response?.data?.message || "Submit failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────
  if (loading || !form) return (
  <ClientLayout>
    <div style={{ textAlign: "center", padding: "120px 0", color: "#8c90a0" }}>
      <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 16, animation: "spin 1s linear infinite", color: "#facc15" }}>autorenew</span>
      Loading job data...
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  </ClientLayout>
);

  // ── Fetch error ────────────────────────────────────────────────────
  if (fetchError) return (
    <ClientLayout>
      <div style={{ textAlign: "center", padding: "120px 24px" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#f87171", display: "block", marginBottom: 12 }}>error_outline</span>
        <p style={{ color: "#f87171", fontSize: 15, marginBottom: 20 }}>{fetchError}</p>
        <button onClick={() => navigate("/client/projects")}
          style={{ padding: "10px 24px", background: "#00F0FF", color: "#002022", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
          Back to Projects
        </button>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </ClientLayout>
  );

  const isDraft = originalStatus === "DRAFT";

  return (
    <ClientLayout>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <button
            onClick={() => navigate("/client/projects")}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#8c90a0", cursor: "pointer", fontSize: 14, marginBottom: 20, padding: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#e1e2eb")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#8c90a0")}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            Back to Projects
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span className="material-symbols-outlined" style={{ color: "#00F0FF", fontSize: 28 }}>edit</span>
            <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 30, fontWeight: 700, color: "#e1e2eb", margin: 0 }}>
              Edit Job
            </h1>
            {/* Status badge */}
            <span style={{
              padding: "3px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700,
              fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase",
              color: isDraft ? "#94a3b8" : "#00F0FF",
              background: isDraft ? "rgba(148,163,184,0.08)" : "rgba(0,240,255,0.08)",
              border: isDraft ? "1px solid rgba(148,163,184,0.25)" : "1px solid rgba(0,240,255,0.25)",
            }}>
              {originalStatus}
            </span>
          </div>
          <p style={{ color: "#8c90a0", fontSize: 14, margin: 0 }}>
            Chỉnh sửa thông tin job — mọi thay đổi sẽ được lưu khi bấm <span style={{ color: "#00F0FF" }}>Save Changes</span>.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Card 1 — Basic Info */}
          <div style={cardStyle}>
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
          <div style={cardStyle}>
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

              {/* AI Generated Description — chỉ hiện nếu có */}
              {form.aiGeneratedDescription && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#00F0FF" }}>auto_awesome</span>
                    <label style={{ ...labelStyle, marginBottom: 0, color: "#00F0FF" }}>AI Generated Description</label>
                  </div>
                  <div style={{ position: "relative" }}>
                    <textarea name="aiGeneratedDescription" value={form.aiGeneratedDescription} onChange={handleChange} rows={8}
                      style={{ ...inputStyle, resize: "vertical", borderColor: "rgba(0,240,255,0.25)", background: "rgba(0,240,255,0.02)" }}
                      onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(0,240,255,0.25)")} />
                    <div style={{ position: "absolute", top: 10, right: 12, pointerEvents: "none" }}>
                      <span style={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", color: "#00F0FF", opacity: 0.35, textTransform: "uppercase", letterSpacing: "0.1em" }}>Synthetix AI</span>
                    </div>
                  </div>
                </div>
              )}

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
          <div style={cardStyle}>
            <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 16, fontWeight: 700, color: "#e1e2eb", marginBottom: 8, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              Required Skills
            </h3>
            <p style={{ fontSize: 13, color: "#8c90a0", marginBottom: 16 }}>Toggle để thêm hoặc bỏ skill.</p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {skillOptions.map((skill) => {
                const selected = !!form.skills.find((s) => s.id === skill.id);
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    style={{
                      padding: "7px 16px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontFamily: "JetBrains Mono, monospace",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      background: selected ? "rgba(0,240,255,0.12)" : "rgba(255,255,255,0.04)",
                      color: selected ? "#00F0FF" : "#8c90a0",
                      border: selected ? "1px solid rgba(0,240,255,0.4)" : "1px solid rgba(255,255,255,0.1)",
                      fontWeight: selected ? 700 : 400,
                    }}
                  >
                    {selected ? "✓ " : ""}
                    {skill.name}
                  </button>
                );
              })}
            </div>

            {/* Custom skill */}
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

            {/* Custom skills đã thêm (id âm) */}
            {form.skills.filter((s) => s.id < 0).length > 0 && (
              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {form.skills.filter((s) => s.id < 0).map((s) => (
                  <span key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "rgba(0,240,255,0.08)", border: "1px solid rgba(0,240,255,0.25)", borderRadius: 999, fontSize: 11, color: "#00F0FF", fontFamily: "JetBrains Mono, monospace" }}>
                    {s.name}
                    <button type="button" onClick={() => setForm((prev) => ({ ...prev, skills: prev.skills.filter((sk) => sk.id !== s.id) }))}
                      style={{ background: "none", border: "none", color: "#00F0FF", cursor: "pointer", padding: 0, fontSize: 13, lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
            )}

            {form.skills.length > 0 && (
              <p style={{ fontSize: 12, color: "#00F0FF", marginTop: 10 }}>
                {form.skills.length} skill{form.skills.length > 1 ? "s" : ""} selected: {form.skills.map((s) => s.name).join(", ")}
              </p>
            )}
          </div>

          {/* Save success */}
          {saveSuccess && (
            <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 10, padding: "12px 16px", color: "#4ade80", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
              Lưu thành công! Job đã được cập nhật.
            </div>
          )}

          {/* Error */}
          {saveError && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", color: "#f87171", fontSize: 14 }}>
              {saveError}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap", paddingTop: 8 }}>

            {/* Cancel — về lại projects */}
            <button type="button" onClick={() => navigate("/client/projects")}
              style={{ padding: "12px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#c2c6d6", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 14 }}>
              Cancel
            </button>

            {/* Save Changes — PUT /api/jobs/{id} */}
            <button type="button" onClick={handleSave} disabled={saving || submitting}
              style={{ padding: "12px 24px", borderRadius: 8, border: "1px solid rgba(0,240,255,0.4)", background: "rgba(0,240,255,0.08)", color: "#00F0FF", cursor: saving ? "not-allowed" : "pointer", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, opacity: saving ? 0.6 : 1, display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s" }}
              onMouseEnter={(e) => { if (!saving && !submitting) e.currentTarget.style.background = "rgba(0,240,255,0.15)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,240,255,0.08)"; }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                {saving ? "hourglass_empty" : "save"}
              </span>
              {saving ? "Saving..." : "Save Changes"}
            </button>

            {/* Submit — chỉ hiện khi job đang là DRAFT */}
            {isDraft && (
              <button type="button" onClick={handleSubmit} disabled={saving || submitting}
                style={{ padding: "12px 28px", borderRadius: 8, background: submitting ? "#1d2026" : "#00F0FF", color: submitting ? "#8c90a0" : "#002022", fontWeight: 700, fontFamily: "Hanken Grotesk, sans-serif", fontSize: 14, border: "none", cursor: submitting ? "not-allowed" : "pointer", boxShadow: submitting ? "none" : "0 0 20px rgba(0,240,255,0.25)", display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  {submitting ? "hourglass_empty" : "publish"}
                </span>
                {submitting ? "Submitting..." : "Save & Submit"}
              </button>
            )}
          </div>

        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </ClientLayout>
  );
}