// src/modules/client/pages/PostJobPage.jsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";



const DEFAULT_FORM = {
  title: "", budgetMin: "", budgetMax: "",
  projectType: "", complexity: "",
  description: "", aiGeneratedDescription: "",
  expectedDeliverables: "", deadline: "",
  skills: [],
};

const JOB_RETURN_STATUSES = ["DRAFT", "OPEN", "CANCELLED"];

const COMPLEXITY_OPTIONS = [
  { value: "SIMPLE", label: "Simple" },
  { value: "MEDIUM", label: "Medium" },
  { value: "COMPLEX", label: "Complex" },
];

const DEFAULT_DEADLINE_DAYS = 30;

const getDefaultDeadlineIso = () =>
  new Date(
    Date.now() + DEFAULT_DEADLINE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();


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

const getTotalJobCredits = (profile) =>
  Number(profile?.freeJobPostCredits || 0) + Number(profile?.paidJobPostCredits || 0);

const getTotalAiCredits = (profile) =>
  Number(profile?.freeAiGenerationCredits || 0) + Number(profile?.paidAiGenerationCredits || 0);

const toNullableNumber = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
};

const buildPayload = (form) => ({
  title: form.title,
  description: form.description,
  aiGeneratedDescription: form.aiGeneratedDescription || null,
  budgetMin: toNullableNumber(form.budgetMin),
  budgetMax: toNullableNumber(form.budgetMax),
  deadline: form.deadline
    ? new Date(form.deadline).toISOString()
    : getDefaultDeadlineIso(),
  projectType: form.projectType,
  complexity: form.complexity || null,
  expectedDeliverables: form.expectedDeliverables || "",
  isAiAssisted: !!form.aiGeneratedDescription,
  skillIds: form.skills
    .map((s) => Number(s.id))
    .filter((id) => Number.isInteger(id) && id > 0),
});

  const validateJobForm = (form) => {
  const budgetMin = Number(form.budgetMin);
  const budgetMax = Number(form.budgetMax);

  if (!form.title.trim()) return "Job title is required.";
  if (form.budgetMin === "") return "Budget min is required.";
  if (form.budgetMax === "") return "Budget max is required.";
  if (Number.isNaN(budgetMin) || Number.isNaN(budgetMax)) return "Budget must be valid numbers.";
  if (budgetMin < 0 || budgetMax < 0) return "Budget cannot be negative.";
  if (budgetMin >= budgetMax) return "Budget min must be less than budget max.";
  if (!form.projectType.trim()) return "Project type is required.";
  if (!form.complexity.trim()) return "Complexity is required.";
  if (!form.deadline) return "Deadline is required.";
  if (!form.description.trim()) return "Description is required.";
  if (!form.expectedDeliverables.trim()) return "Expected deliverables is required.";
  if (!Array.isArray(form.skills) || form.skills.length === 0) return "Please select at least one skill.";

  return "";
};

export default function PostJobPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const editId = searchParams.get("editId");
  const rawReturnStatus = searchParams.get("returnStatus");

  const normalizedReturnStatus = String(rawReturnStatus || "").toUpperCase();

const returnStatus = JOB_RETURN_STATUSES.includes(normalizedReturnStatus)
  ? normalizedReturnStatus
  : "DRAFT";
  const isEditMode = !!editId;

  const [mode, setMode] = useState("manual"); // "manual" | "ai"
  const [form, setForm] = useState(DEFAULT_FORM);
  const [generating, setGenerating] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const [customSkill, setCustomSkill] = useState("");
  const [aiSuggestedSkills, setAiSuggestedSkills] = useState([]);
  const [irrelevantSkills, setIrrelevantSkills] = useState([]);
  const [clientProfile, setClientProfile] = useState(null);
  const [budgetNote, setBudgetNote] = useState("");
  const [budgetEstimated, setBudgetEstimated] = useState(false);

  const [skillOptions, setSkillOptions] = useState([]);

useEffect(() => {
  const controller = new AbortController();

  const loadSkills = async () => {
    try {
      const res = await axiosInstance.get("/skills", {
        params: { activeOnly: true },
        signal: controller.signal,
      });

      const rawSkills = res.data?.data ?? res.data ?? [];

      const skills = rawSkills
        .map((s) => ({
          id: Number(s.skillId ?? s.id),
          name: s.skillName ?? s.name,
        }))
        .filter((s) => Number.isInteger(s.id) && s.id > 0 && s.name);

      setSkillOptions(skills);
    } catch (err) {
      if (err?.code === "ERR_CANCELED") return;
      console.error("Load skills failed:", err);
      setSkillOptions([]);
    }
  };

  loadSkills();

  return () => controller.abort();
}, []);

  const totalJobCredits = getTotalJobCredits(clientProfile);
  const totalAiCredits = getTotalAiCredits(clientProfile);

  const isBusinessNotVerified =
    clientProfile?.clientType === "BUSINESS" &&
    clientProfile?.businessProfile?.verificationStatus !== "VERIFIED";

  const cannotUseAi = totalAiCredits <= 0 || isBusinessNotVerified;
  const cannotPublish = totalJobCredits <= 0 || isBusinessNotVerified;

  useEffect(() => {
    const controller = new AbortController();

    const loadClientProfile = async () => {
      try {
        const res = await axiosInstance.get("/client-profiles/me", {
          signal: controller.signal,
        });

        setClientProfile(res.data?.data ?? res.data);
      } catch (err) {
        if (err?.code === "ERR_CANCELED") return;
        console.error("Load client profile failed:", err);
      }
    };

    loadClientProfile();

    return () => controller.abort();
  }, []);

  useEffect(() => {
  if (!editId) return;

  const loadJobForEdit = async () => {
    try {
      const res = await axiosInstance.get(`/jobs/${editId}`);
      const job = res.data;

      setForm({
        title: job.title || "",
        budgetMin: job.budgetMin || "",
        budgetMax: job.budgetMax || "",
        projectType: job.projectType || "",
        complexity: job.complexity || "",
        description: job.description || "",
        aiGeneratedDescription: job.aiGeneratedDescription || "",
        expectedDeliverables: job.expectedDeliverables || "",
        deadline: job.deadline ? job.deadline.split("T")[0] : "",
        skills: (job.skills || [])
          .map((s) => ({
            id: Number(s.skillId ?? s.id),
            name: s.skillName ?? s.name,
          }))
          .filter((s) => Number.isInteger(s.id) && s.id > 0),
      });

      setMode(job.aiGeneratedDescription ? "ai" : "manual");
    } catch (err) {
      console.error("Load job edit failed:", err);
      setError("Unable to load job data for editing.");
    }
  };

  loadJobForEdit();
}, [editId]);

  const handleChange = (e) => {
  const { name, value } = e.target;

  if ((name === "budgetMin" || name === "budgetMax") && Number(value) < 0) {
    return;
  }

  setForm((prev) => ({ ...prev, [name]: value }));
  setError("");
  setDraftSaved(false);
};

  const removeSkill = (skill) => {
  setForm((prev) => ({
    ...prev,
    skills: prev.skills.filter(
      (s) =>
        Number(s.id) !== Number(skill.id) &&
        s.name.toLowerCase() !== skill.name.toLowerCase()
    ),
  }));

  setIrrelevantSkills((prev) =>
    prev.filter(
      (name) => name.toLowerCase() !== skill.name.toLowerCase()
    )
  );
};

const toggleSkill = (skill) => {
  const exists = form.skills.some(
    (s) =>
      Number(s.id) === Number(skill.id) ||
      s.name.toLowerCase() === skill.name.toLowerCase()
  );

  const isAiSuggested = aiSuggestedSkills.some(
    (s) =>
      Number(s.id) === Number(skill.id) ||
      s.name.toLowerCase() === skill.name.toLowerCase()
  );

  if (exists) {
    removeSkill(skill);
    return;
  }

  setForm((prev) => ({
    ...prev,
    skills: [...prev.skills, skill],
  }));

  if (mode === "ai" && aiSuggestedSkills.length > 0 && !isAiSuggested) {
    setIrrelevantSkills((prev) =>
      prev.includes(skill.name) ? prev : [...prev, skill.name]
    );
  }
};

  const switchMode = (newMode) => {
  setMode(newMode);
  setError("");
  setDraftSaved(false);
  setBudgetEstimated(false);
  setBudgetNote("");
};

  // POST /api/jobs/ai-assistant/analyze
  const handleGenerate = async () => {
    if (!form.description.trim()) {
      alert("Please enter a description before generating!");
      return;
    }

    if (cannotUseAi) {
      setError(
        isBusinessNotVerified
          ? "Business profile must be verified before using AI Job Assistant."
          : "You have used all AI generation credits. Please buy a job credit package."
      );
      return;
    }

    setGenerating(true);
    setError("");
    try {
      const res = await axiosInstance.post("/jobs/ai-assistant/analyze", {
        rawRequirement: form.description,
        budgetMin: toNullableNumber(form.budgetMin),
        budgetMax: toNullableNumber(form.budgetMax),
        deadline: form.deadline || getDefaultDeadlineIso(),
        projectTypeHint: form.projectType || "",
        complexityHint: "",
      });
      const data = res.data?.data ?? res.data;
      console.log(data);

      const normalizeComplexity = (value) => {
        const v = String(value || "").trim().toUpperCase();

        if (["SIMPLE", "EASY", "LOW"].includes(v)) return "SIMPLE";
        if (["MEDIUM", "MODERATE", "MID"].includes(v)) return "MEDIUM";
        if (["COMPLEX", "HARD", "HIGH"].includes(v)) return "COMPLEX";

        return "";
      };

      const aiComplexity = normalizeComplexity(
        data.suggestedComplexity ??
        data.complexity ??
        data.complexityLevel
      );

const suggestedSkills = (data.suggestedSkills || [])
      .map((s) => ({
        id: Number(s.skillId ?? s.SkillId ?? s.id),
        name: s.skillName ?? s.SkillName ?? s.name,
      }))
      .filter((s) => Number.isInteger(s.id) && s.id > 0);

    setAiSuggestedSkills(suggestedSkills);
    setIrrelevantSkills([]);
      const defaultDeadline = getDefaultDeadlineIso().split("T")[0];

      setForm((prev) => ({
        ...prev,
        title: data.suggestedTitle || prev.title,
        description: data.improvedDescription || prev.description,
        aiGeneratedDescription: data.aiGeneratedDescription || "",
        budgetMin: data.suggestedBudgetMin ?? prev.budgetMin,
        budgetMax: data.suggestedBudgetMax ?? prev.budgetMax,
        projectType: data.suggestedProjectType || prev.projectType,
        complexity: aiComplexity || prev.complexity || "",
        expectedDeliverables: data.expectedDeliverables || "",

        deadline:
          data.suggestedDeadline?.split?.("T")[0] ||
          prev.deadline ||
          defaultDeadline,

        skills: suggestedSkills,
      }));

      setBudgetEstimated(!!data.isBudgetEstimated);
      setBudgetNote(data.budgetSuggestionNote || "");

      setClientProfile((prev) =>
        prev
          ? {
              ...prev,
              freeAiGenerationCredits:
                data.remainingFreeAiGenerationCredits ?? prev.freeAiGenerationCredits,
              paidAiGenerationCredits:
                data.remainingPaidAiGenerationCredits ?? prev.paidAiGenerationCredits,
            }
          : prev
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to generate. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // POST /api/jobs/draft
  const handleSaveDraft = async () => {
  const validationMessage = validateJobForm(form);
  if (validationMessage) {
    setError(validationMessage);
    return;
  }

  setSavingDraft(true);
  setError("");

  try {
    if (isEditMode) {
      await axiosInstance.put(
        `/jobs/${editId}`,
        buildPayload(form)
      );
    } else {
      await axiosInstance.post(
        "/jobs/draft",
        buildPayload(form)
      );
    }

    setDraftSaved(true);
    navigate(`/client/jobs?status=${returnStatus}`, { replace: true });
  } catch (err) {
    setError(
      err?.response?.data?.message ||
      "Failed to save draft."
    );
  } finally {
    setSavingDraft(false);
  }
};

  // POST /api/jobs/submit
  const handleSubmit = async (e) => {
  e.preventDefault();

  setError("");

  const validationMessage = validateJobForm(form);
  if (validationMessage) {
    setError(validationMessage);
    return;
  }

  if (!isEditMode && cannotPublish) {
    setError(
      isBusinessNotVerified
        ? "Business profile must be verified before publishing jobs."
        : "You have no job posting credits left. Please buy a job credit package."
    );
    return;
  }

  setSubmitting(true);

  try {
    if (isEditMode) {
      await axiosInstance.put(
        `/jobs/${editId}`,
        buildPayload(form)
      );
    } else {
      await axiosInstance.post(
        "/jobs/submit",
        buildPayload(form)
      );
    }

    setForm(DEFAULT_FORM);

      if (isEditMode) {
        navigate(`/client/jobs?status=${returnStatus}`);
      } else {
        navigate("/client/jobs?status=OPEN");
      }
  } catch (err) {
    setError(
      err?.response?.data?.message ||
      "Failed to save job."
    );
  } finally {
    setSubmitting(false);
  }
};


  const addCustomSkill = () => {
    const s = customSkill.trim();
    if (!s) return;

    const exists = form.skills.find(
      (sk) => sk.name.toLowerCase() === s.toLowerCase()
    );

    if (!exists) {
      setForm((prev) => ({
        ...prev,
        skills: [...prev.skills, { id: -Date.now(), name: s }],
      }));

      const isAiSuggested = aiSuggestedSkills.some(
        (skill) => skill.name.toLowerCase() === s.toLowerCase()
      );

      if (mode === "ai" && aiSuggestedSkills.length > 0 && !isAiSuggested) {
        setIrrelevantSkills((prev) =>
          prev.includes(s) ? prev : [...prev, s]
        );
      }
    }

    setCustomSkill("");
  };

  return (
    <ClientLayout>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 32px" }}>

        {/* Header */}
          <div className="mb-7">
            <h1 className="mb-2 font-['Hanken_Grotesk'] text-[34px] font-extrabold text-[#e1e2eb]">
              Post an AI Job
            </h1>
            <p className="m-0 text-[15px] text-[#8c90a0]">
              Tạo job bằng Job Credit. Dùng AI Assistant sẽ trừ thêm AI Generation Credit.
            </p>
          </div>

          {/* Credit summary */}
          <div className="mb-6 grid grid-cols-[1fr_1fr_auto] gap-4">
            <div className="rounded-[18px] border border-white/10 bg-[#101319]/90 p-5">
              <p className="mb-2 font-mono text-xs uppercase text-[#8c90a0]">
                Job Credits
              </p>
              <h3 className="m-0 font-mono text-[28px] text-cyan-400">
                {totalJobCredits}
              </h3>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-[#101319]/90 p-5">
              <p className="mb-2 font-mono text-xs uppercase text-[#8c90a0]">
                AI Credits
              </p>
              <h3 className="m-0 font-mono text-[28px] text-cyan-400">
                {totalAiCredits}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => navigate("/client/job-credit-packages")}
              className="flex items-center gap-2 whitespace-nowrap rounded-[18px] bg-cyan-500 px-6 py-3 font-bold text-white shadow-lg shadow-cyan-500/30 transition hover:bg-cyan-400"
            >
              <span className="material-symbols-outlined text-[18px]">
                shopping_cart
              </span>
              Buy a package
            </button>
          </div>

          {isBusinessNotVerified && (
            <div className="mb-6 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-[13px] text-amber-400">
              Business profile must be VERIFIED before using AI Assistant or publishing jobs.
            </div>
          )}

          {/* Mode cards */}
          <div className="mb-7 grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => switchMode("manual")}
              className={`cursor-pointer rounded-[18px] p-[22px] text-left transition ${
                mode === "manual"
                  ? "border border-white/20 bg-white/[0.06]"
                  : "border border-white/10 bg-[#101319]/90"
              }`}
            >
              <span className="material-symbols-outlined text-[28px] text-[#c2c6d6]">
                edit_note
              </span>
              <h3 className="my-[10px] mb-1.5 text-lg font-extrabold text-[#e1e2eb]">
                Manual Post
              </h3>
              <p className="m-0 text-[13px] text-[#8c90a0]">
                Dùng 1 Job Credit khi publish. Save Draft không trừ credit.
              </p>
            </button>

            <button
              type="button"
              onClick={() => !cannotUseAi && switchMode("ai")}
              disabled={cannotUseAi}
              className={`rounded-[18px] p-[22px] text-left transition ${
                mode === "ai"
                  ? "border border-cyan-400/45 bg-gradient-to-b from-cyan-400/10 to-[#101319]/90"
                  : "border border-white/10 bg-[#101319]/90"
              } ${
                cannotUseAi
                  ? "cursor-not-allowed opacity-55"
                  : "cursor-pointer"
              }`}
            >
              <span className="material-symbols-outlined text-[28px] text-cyan-400">
                auto_awesome
              </span>
              <h3 className="my-[10px] mb-1.5 text-lg font-extrabold text-[#e1e2eb]">
                Generate with AI
              </h3>
              <p className="m-0 text-[13px] text-[#8c90a0]">
                Dùng AI Generation Credit khi generate và 1 Job Credit khi publish.
              </p>
            </button>
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
                          <input type="number" min="0" name="budgetMin" value={form.budgetMin} onChange={handleChange} required
                            placeholder="Min" style={{ ...inputStyle, paddingLeft: 28 }}
                            onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                        </div>
                        <span style={{ color: "#414754", fontSize: 20, textAlign: "center" }}>—</span>
                        <div style={{ position: "relative" }}>
                          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#00F0FF", fontWeight: 700 }}>$</span>
                          <input type="number" min="0" name="budgetMax" value={form.budgetMax} onChange={handleChange} required
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
                        {COMPLEXITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
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
                    {skillOptions.map((skill) => {
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
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                        {form.skills.map((skill) => (
                          <button
                            key={`${skill.id}-${skill.name}`}
                            type="button"
                            onClick={() => removeSkill(skill)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "6px 10px",
                              borderRadius: 999,
                              background: "rgba(0,240,255,0.08)",
                              border: "1px solid rgba(0,240,255,0.25)",
                              color: "#00F0FF",
                              fontSize: 12,
                              cursor: "pointer",
                            }}
                          >
                            {skill.name}
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                              close
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                  {mode === "ai" && irrelevantSkills.length > 0 && (
                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          color: "#fbbf24",
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                          warning
                        </span>
                        These skills were added outside AI suggestion: {irrelevantSkills.join(", ")}
                      </div>
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
                      <label style={labelStyle}>Budget Range (VND)</label>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center" }}>
                        <div style={{ position: "relative" }}>
                          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#00F0FF", fontWeight: 700 }}>
                            ₫
                          </span>
                          <input
                            type="number"
                            min="0"
                            name="budgetMin"
                            value={form.budgetMin}
                            onChange={handleChange}
                            placeholder="Min"
                            style={{ ...inputStyle, paddingLeft: 32 }}
                            onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                          />
                        </div>

                        <span style={{ color: "#414754", fontSize: 20, textAlign: "center" }}>
                          —
                        </span>

                        <div style={{ position: "relative" }}>
                          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#00F0FF", fontWeight: 700 }}>
                            ₫
                          </span>
                          <input
                            type="number"
                            min="0"
                            name="budgetMax"
                            value={form.budgetMax}
                            onChange={handleChange}
                            placeholder="Max"
                            style={{ ...inputStyle, paddingLeft: 32 }}
                            onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                          />
                        </div>
                      </div>

                      {budgetEstimated && budgetNote && (
                        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3">
                          <span className="material-symbols-outlined text-[18px] text-amber-400">
                            auto_awesome
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-amber-300">
                              AI Estimated Budget
                            </p>
                            <p className="text-xs text-amber-200">
                              {budgetNote}
                            </p>
                          </div>
                        </div>
                      )}
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
                        <button type="button" onClick={handleGenerate} disabled={generating || cannotUseAi}
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
                            {COMPLEXITY_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label style={labelStyle}>
                          Deadline <span style={{ color: "#f87171" }}>*</span>
                        </label>

                        <input
                          type="date"
                          name="deadline"
                          value={form.deadline}
                          onChange={handleChange}
                          min={new Date().toISOString().split("T")[0]}
                          style={{
                            ...inputStyle,
                            colorScheme: "dark",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                          onBlur={(e) =>
                            (e.target.style.borderColor = "rgba(255,255,255,0.12)")
                          }
                        />
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
                        {skillOptions.map((skill) => {
                          const selected = !!form.skills.find((s) => s.id === skill.id);

                          const isIrrelevant = irrelevantSkills.some(
                            (name) => name.toLowerCase() === skill.name.toLowerCase()
                          );

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

                                background: isIrrelevant
                                  ? "rgba(245,158,11,0.12)"
                                  : selected
                                  ? "rgba(0,240,255,0.12)"
                                  : "rgba(255,255,255,0.04)",

                                color: isIrrelevant
                                  ? "#fbbf24"
                                  : selected
                                  ? "#00F0FF"
                                  : "#8c90a0",

                                border: isIrrelevant
                                  ? "1px solid rgba(245,158,11,0.45)"
                                  : selected
                                  ? "1px solid rgba(0,240,255,0.4)"
                                  : "1px solid rgba(255,255,255,0.1)",

                                fontWeight: selected ? 700 : 400,
                              }}
                            >
                              {selected ? "✓ " : ""}
                              {skill.name}
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
                          <div className="mt-3 flex flex-wrap gap-2">
                            {form.skills.map((skill) => {
                              const isIrrelevant = irrelevantSkills.some(
                                (name) => name.toLowerCase() === skill.name.toLowerCase()
                              );

                              return (
                                <button
                                  key={`${skill.id}-${skill.name}`}
                                  type="button"
                                  onClick={() => removeSkill(skill)}
                                  className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                                    isIrrelevant
                                      ? "border-amber-400/40 bg-amber-400/10 text-amber-400 hover:bg-amber-400/20"
                                      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20"
                                  }`}
                                >
                                  {isIrrelevant && (
                                    <span className="material-symbols-outlined text-[14px]">
                                      warning
                                    </span>
                                  )}

                                  <span>{skill.name}</span>

                                  <span className="material-symbols-outlined text-[14px]">
                                    close
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                      {irrelevantSkills.length > 0 && (
                        <div
                          style={{
                            marginTop: 10,
                            padding: "8px 12px",
                            borderRadius: 8,
                            background: "rgba(245,158,11,0.08)",
                            border: "1px solid rgba(245,158,11,0.25)",
                            color: "#fbbf24",
                            fontSize: 12,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 16 }}
                          >
                            warning
                          </span>

                          <span>
                            Warning: These skills were not suggested by AI:
                            {" "}
                            <strong>{irrelevantSkills.join(", ")}</strong>
                          </span>
                        </div>
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
                <button
                  type="submit"
                  disabled={submitting || (!isEditMode && cannotPublish)}
                  style={{
                    padding: "12px 32px",
                    borderRadius: 8,
                    background: submitting || (!isEditMode && cannotPublish) ? "#1d2026" : "#00F0FF",
                    color: submitting || (!isEditMode && cannotPublish) ? "#8c90a0" : "#002022",
                    fontWeight: 700,
                    fontFamily: "Hanken Grotesk, sans-serif",
                    fontSize: 15,
                    border: "none",
                    cursor: submitting || (!isEditMode && cannotPublish) ? "not-allowed" : "pointer",
                    boxShadow: submitting || (!isEditMode && cannotPublish) ? "none" : "0 0 20px rgba(0,240,255,0.25)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {submitting && (
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      progress_activity
                    </span>
                  )}

                  {!isEditMode && totalJobCredits <= 0
                    ? "Buy Credits to Post"
                    : submitting
                    ? "Posting..."
                    : "Post Job"}
                </button>
              </div>
            </div>

          </div>
        </form>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </ClientLayout>
  );
}