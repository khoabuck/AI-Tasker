// src/modules/client/pages/AIMatchingPage.jsx
<<<<<<< HEAD
// Tìm Expert bằng AI — gõ prompt mô tả dự án
// TODO (BE): POST /ai/match-experts { query } khi BE xong

import { useState } from "react";
import ClientLayout from "../../../components/layout/ClientLayout";

const MOCK_EXPERTS = [
  { id: 1, name: "Dr. Aris Thorne", role: "Senior ML Architect", badge: "98% MATCH", badgeColor: "#00F0FF", rating: 4.5, skills: ["LLM", "Healthcare AI", "PyTorch"], bio: "Ex-DeepMind specialist focused on generative models for precision medicine.", highlight: null },
  { id: 2, name: "Marcus Vane", role: "NLP Lead Scientist", badge: "TOP PICK", badgeColor: "#c0c1ff", rating: 5, skills: ["Transformers", "BERT", "Semantics"], bio: null, highlight: "Marcus has successfully deployed 14 healthcare LLM projects in the last 24 months." },
  { id: 3, name: "Elena Kostic", role: "Generative AI Specialist", badge: "92% MATCH", badgeColor: "#00F0FF", rating: 4, skills: ["Stable Diffusion", "GANs", "AWS SageMaker"], bio: "Pioneering work in multimodal content generation and infrastructure optimization.", highlight: null },
  { id: 4, name: "Julian Rossi", role: "Bioinformatics Expert", badge: "89% MATCH", badgeColor: "#00F0FF", rating: 4, skills: ["Genomics", "Python", "Cloud Computing"], bio: "Specializing in sequence alignment algorithms and large-scale genetic data processing.", highlight: null },
];

function StarRating({ rating }) {
  return (
    <div style={{ display: "flex", gap: 2, marginTop: 8 }}>
      {[1,2,3,4,5].map((i) => (
        <span key={i} className="material-symbols-outlined" style={{ fontSize: 16, color: "#00F0FF", fontVariationSettings: "'FILL' 1" }}>
          {i <= Math.floor(rating) ? "star" : i - 0.5 <= rating ? "star_half" : "star_outline"}
        </span>
      ))}
    </div>
  );
}

function ExpertCard({ expert }) {
  const isTertiary = expert.badge === "TOP PICK";
  return (
    <div style={{ background: isTertiary ? "#101319" : "rgba(29,32,38,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 24, position: "relative", overflow: "hidden", transition: "border-color 0.3s" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = isTertiary ? "rgba(192,193,255,0.5)" : "rgba(0,240,255,0.5)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}>
      <div style={{ position: "absolute", top: 0, right: 0, padding: "4px 12px", background: `${expert.badgeColor}18`, borderLeft: `1px solid ${expert.badgeColor}33`, borderBottom: `1px solid ${expert.badgeColor}33`, borderRadius: "0 0 0 12px" }}>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: expert.badgeColor, fontWeight: 700 }}>{expert.badge}</span>
      </div>
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 18, fontWeight: 600, color: "#e1e2eb" }}>{expert.name}</h4>
        <p style={{ fontSize: 11, color: "#00F0FF", fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>{expert.role}</p>
        <StarRating rating={expert.rating} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {expert.skills.map((skill) => (
          <span key={skill} style={{ padding: "4px 8px", background: isTertiary ? "rgba(98,101,240,0.1)" : "rgba(39,42,48,0.8)", borderRadius: 4, fontSize: 10, fontFamily: "JetBrains Mono, monospace", color: isTertiary ? "#c0c1ff" : "#c2c6d6", border: `1px solid ${isTertiary ? "rgba(192,193,255,0.3)" : "rgba(255,255,255,0.12)"}` }}>{skill}</span>
        ))}
      </div>
      {expert.bio && <p style={{ fontSize: 14, color: "#8c90a0", lineHeight: 1.6, marginBottom: 24, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{expert.bio}</p>}
      {expert.highlight && (
        <div style={{ padding: 12, background: "rgba(11,14,20,0.5)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontStyle: "italic", color: "#c2c6d6", lineHeight: 1.6 }}>"{expert.highlight}"</p>
        </div>
      )}
      <div style={{ display: "flex", gap: 12 }}>
        <button style={{ flex: 1, padding: "8px", fontSize: 12, fontWeight: 700, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, background: "transparent", color: "#e1e2eb", cursor: "pointer" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(54,57,64,0.5)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>View Profile</button>
        <button style={{ flex: 1, padding: "8px", fontSize: 12, fontWeight: 700, background: "#00F0FF", color: "#101319", borderRadius: 8, border: "none", cursor: "pointer", boxShadow: "0 0 15px rgba(0,240,255,0.3)" }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}>Connect</button>
=======
import { useState } from "react";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";

const LEVEL_CONFIG = {
  JUNIOR:  { label: "Junior",  color: "#94a3b8" },
  MID:     { label: "Mid",     color: "#facc15" },
  SENIOR:  { label: "Senior",  color: "#00F0FF" },
  EXPERT:  { label: "Expert",  color: "#c0c1ff" },
};

function ExpertCard({ expert }) {
  const level = LEVEL_CONFIG[expert.level] || { label: expert.level, color: "#8c90a0" };
  const matchScore = expert.matchScore ? Math.round(expert.matchScore) : null;

  return (
    <div style={{ background: "rgba(16,19,25,0.85)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 16, transition: "all 0.2s", position: "relative", overflow: "hidden" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,240,255,0.4)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.transform = "translateY(0)"; }}>

      {/* Match score badge */}
      {matchScore && (
        <div style={{ position: "absolute", top: 0, right: 0, padding: "4px 12px", background: "rgba(0,240,255,0.1)", borderLeft: "1px solid rgba(0,240,255,0.3)", borderBottom: "1px solid rgba(0,240,255,0.3)", borderRadius: "0 16px 0 12px" }}>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#00F0FF", fontWeight: 700 }}>{matchScore}% MATCH</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <img src={expert.avatarUrl || `https://i.pravatar.cc/100?u=${expert.expertProfileId}`}
          alt={expert.fullName}
          style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(0,240,255,0.2)", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontWeight: 700, fontSize: 16, color: "#e1e2eb", margin: 0 }}>
              {expert.fullName}
            </h3>
            <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 9, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", background: level.color + "20", color: level.color, border: `1px solid ${level.color}40` }}>
              {level.label}
            </span>
          </div>
          <p style={{ fontSize: 12, color: "#00F0FF", fontFamily: "JetBrains Mono, monospace", margin: 0 }}>
            {expert.professionalTitle}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#8c90a0" }}>
              {expert.yearsOfExperience} yr{expert.yearsOfExperience !== 1 ? "s" : ""} exp
            </span>
            {expert.availableForWork && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#22c55e" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                Available
              </span>
            )}
            {expert.profileScore && (
              <span style={{ fontSize: 11, color: "#8c90a0" }}>
                Score: <span style={{ color: "#facc15" }}>{expert.profileScore}</span>/100
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bio */}
      {expert.bio && (
        <p style={{ fontSize: 13, color: "#c2c6d6", lineHeight: 1.6, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {expert.bio}
        </p>
      )}

      {/* Match reason */}
      {expert.matchReason && (
        <div style={{ background: "rgba(0,240,255,0.04)", border: "1px solid rgba(0,240,255,0.12)", borderRadius: 8, padding: "10px 12px" }}>
          <p style={{ fontSize: 12, color: "#c2c6d6", margin: 0, lineHeight: 1.5 }}>
            <span style={{ color: "#00F0FF", fontWeight: 600 }}>AI: </span>
            {expert.matchReason}
          </p>
        </div>
      )}

      {/* Skills */}
      {(expert.matchedSkills || expert.expertSkills) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {(expert.matchedSkills || expert.expertSkills || []).slice(0, 6).map((s) => (
            <span key={s.skillId} style={{ padding: "3px 10px", background: expert.matchedSkills ? "rgba(0,240,255,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${expert.matchedSkills ? "rgba(0,240,255,0.2)" : "rgba(255,255,255,0.1)"}`, borderRadius: 999, fontSize: 11, color: expert.matchedSkills ? "#00F0FF" : "#8c90a0", fontFamily: "JetBrains Mono, monospace" }}>
              {s.skillName}
            </span>
          ))}
        </div>
      )}

      {/* Budget */}
      {(expert.expectedProjectBudgetMin || expert.expectedProjectBudgetMax) && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#c2c6d6" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 15, color: "#00F0FF" }}>payments</span>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
            ${expert.expectedProjectBudgetMin?.toLocaleString()} — ${expert.expectedProjectBudgetMax?.toLocaleString()}
            <span style={{ fontWeight: 400, color: "#8c90a0", fontSize: 11 }}> USD/mo</span>
          </span>
        </div>
      )}

      {/* Risk note */}
      {expert.riskNote && (
        <p style={{ fontSize: 11, color: "#facc15", margin: 0, display: "flex", alignItems: "center", gap: 4 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>warning</span>
          {expert.riskNote}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
        <button
          style={{ flex: 1, padding: "9px", background: "#1d2026", color: "#e1e2eb", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "all 0.2s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#272a30"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#1d2026"; }}>
          View Profile
        </button>
        <button
          style={{ flex: 1, padding: "9px", background: "#00F0FF", color: "#002022", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Hanken Grotesk, sans-serif", boxShadow: "0 0 12px rgba(0,240,255,0.25)", transition: "all 0.2s" }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 20px rgba(0,240,255,0.45)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 12px rgba(0,240,255,0.25)"; }}>
          Connect
        </button>
>>>>>>> origin/develop
      </div>
    </div>
  );
}

export default function AIMatchingPage() {
<<<<<<< HEAD
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [experts, setExperts] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSynthesize = () => {
    if (!query.trim()) return;
    setSearching(true);
    // ── TODO (BE): swap mock bằng API ──────────────────────────────────
    // const res = await axiosInstance.post("/ai/match-experts", { query });
    // setExperts(res.data);
    // ───────────────────────────────────────────────────────────────────
    setTimeout(() => { setExperts(MOCK_EXPERTS); setHasSearched(true); setSearching(false); }, 1500);
  };

  return (
    <ClientLayout>
      <div style={{ paddingTop: 48, paddingBottom: 48, paddingLeft: 24, paddingRight: 24 }}>

        {/* Header */}
        <div style={{ maxWidth: 900, margin: "0 auto 32px", textAlign: "center" }}>
          <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 32, fontWeight: 700, color: "#e1e2eb", marginBottom: 8 }}>
            AI <span style={{ color: "#00F0FF" }}>Matching</span>
          </h1>
          <p style={{ color: "#8c90a0", fontSize: 15 }}>Mô tả dự án của bạn — AI sẽ tìm Expert phù hợp nhất</p>
        </div>

        {/* Search Bar — AI Prompt */}
        <section style={{ maxWidth: 900, margin: "0 auto 48px" }}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: -4, background: "linear-gradient(90deg, #00F0FF, #1772eb, #6265f0)", borderRadius: 20, filter: "blur(8px)", opacity: 0.25, zIndex: 0 }} />
            <div style={{ position: "relative", background: "rgba(29,32,38,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 24, display: "flex", gap: 16, alignItems: "center", zIndex: 1 }}>
              <div style={{ flex: 1, position: "relative" }}>
                <span className="material-symbols-outlined" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#00F0FF", fontSize: 22 }}>psychology</span>
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSynthesize()}
                  placeholder="I need an expert in Large Language Models for healthcare..."
                  style={{ width: "100%", background: "#0b0e14", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "16px 16px 16px 52px", color: "#e1e2eb", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 15, boxSizing: "border-box" }}
                  onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
              </div>
              <button onClick={handleSynthesize} disabled={searching || !query.trim()}
                style={{ padding: "16px 32px", background: "#00F0FF", color: "#101319", fontWeight: 700, borderRadius: 12, border: "none", cursor: searching || !query.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 0 15px rgba(0,240,255,0.3)", fontSize: 15, fontFamily: "Hanken Grotesk, sans-serif", whiteSpace: "nowrap", opacity: searching || !query.trim() ? 0.7 : 1 }}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", animation: searching ? "spin 1s linear infinite" : "none" }}>{searching ? "autorenew" : "bolt"}</span>
                {searching ? "Synthesizing..." : "Synthesize"}
              </button>
            </div>
          </div>
          {/* Example prompts */}
          <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ color: "#8c90a0", fontSize: 11, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>Thử:</span>
            {["LLM for healthcare data", "Computer vision for retail", "NLP chatbot for banking"].map((ex) => (
              <button key={ex} onClick={() => setQuery(ex)}
                style={{ background: "#272a30", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, padding: "4px 12px", fontSize: 12, color: "#c2c6d6", cursor: "pointer", fontFamily: "Inter, sans-serif" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#00F0FF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#c2c6d6")}>{ex}</button>
            ))}
          </div>
        </section>

        {/* Empty state */}
        {!hasSearched && !searching && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#8c90a0" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 72, display: "block", marginBottom: 16, color: "#232A35" }}>psychology</span>
            <p style={{ fontSize: 16, marginBottom: 8 }}>Mô tả dự án của bạn</p>
            <p style={{ fontSize: 14, color: "#414754" }}>AI sẽ phân tích và tìm Expert phù hợp nhất</p>
=======
      const [query, setQuery] = useState("");
      const [searching, setSearching] = useState(false);
      const [experts, setExperts] = useState([]);
      const [total, setTotal] = useState(0);
      const [hasSearched, setHasSearched] = useState(false);
      const [error, setError] = useState("");

      const handleSearch = async (searchText) => {
      const keyword = (searchText ?? query).trim();

    if (!keyword) return;

    setQuery(keyword);

    setRecentPrompts((prev) => {
      const updated = [keyword, ...prev.filter((item) => item !== keyword)];
      return updated.slice(0, 4);
    });

    setSearching(true);
    setError("");
    setHasSearched(false);

    try {
      const res = await axiosInstance.get("/experts", {
        params: { keyword: keyword, availableOnly: true, page: 1, pageSize: 12, },
      });

      const data = res.data;
      const items = Array.isArray(data) ? data : data?.items || data?.data || [];

      setExperts(items);
      setTotal(data?.totalItems || items.length);
      setHasSearched(true);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to search experts. Please try again."
      );
    } finally {
      setSearching(false);
    }
  };

  const [recentPrompts, setRecentPrompts] = useState([]);

  return (
    <ClientLayout>
      <div style={{ paddingTop: 48, paddingBottom: 64, paddingLeft: 24, paddingRight: 24 }}>

        {/* Header */}
        <div style={{ maxWidth: 860, margin: "0 auto 40px", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
            <span className="material-symbols-outlined" style={{ color: "#00F0FF", fontSize: 32, fontVariationSettings: "'FILL' 1" }}>psychology</span>
            <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 36, fontWeight: 700, color: "#e1e2eb", margin: 0 }}>
              AI Expert <span style={{ color: "#00F0FF" }}>Matching</span>
            </h1>
          </div>
          <p style={{ color: "#8c90a0", fontSize: 15, margin: 0 }}>
            Describe your project — AI will find the most suitable experts for you
          </p>
        </div>

        {/* Search bar */}
        <div style={{ maxWidth: 860, margin: "0 auto 48px" }}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: -3, background: "linear-gradient(90deg, #00F0FF, #1772eb, #6265f0)", borderRadius: 20, filter: "blur(10px)", opacity: 0.2, zIndex: 0 }} />
            <div style={{ position: "relative", background: "rgba(16,19,25,0.9)", backdropFilter: "blur(20px)", border: "1px solid rgba(0,240,255,0.2)", borderRadius: 16, padding: 20, display: "flex", gap: 14, alignItems: "center", zIndex: 1 }}>
              <div style={{ flex: 1, position: "relative" }}>
                <span className="material-symbols-outlined" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#00F0FF", fontSize: 20 }}>search</span>
                <input
                  type="text" value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="e.g. I need an NLP expert for chatbot development..."
                  style={{ width: "100%", background: "#1d2026", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "14px 14px 14px 46px", color: "#e1e2eb", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 15, boxSizing: "border-box", transition: "border-color 0.2s" }}
                  onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")} />
              </div>
              <button onClick={() => handleSearch()} disabled={searching || !query.trim()}
                style={{ padding: "14px 28px", background: searching || !query.trim() ? "#1d2026" : "#00F0FF", color: searching || !query.trim() ? "#8c90a0" : "#002022", fontWeight: 700, borderRadius: 10, border: "none", cursor: searching || !query.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: searching || !query.trim() ? "none" : "0 0 16px rgba(0,240,255,0.3)", fontSize: 14, fontFamily: "Hanken Grotesk, sans-serif", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, animation: searching ? "spin 1s linear infinite" : "none" }}>
                  {searching ? "autorenew" : "bolt"}
                </span>
                {searching ? "Searching..." : "Find Experts"}
              </button>
            </div>
          </div>

          {/* Example prompts */}
          <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ color: "#8c90a0", fontSize: 11, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>Try:</span>
            {recentPrompts.map((prompt) => {
              const shortPrompt =
                prompt.length > 32
                  ? `${prompt.slice(0, 32)}...`
                  : prompt;

              return (
                <button
                  key={prompt}
                  onClick={() => handleSearch(prompt)}
                  title={prompt}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-[#c2c6d6] transition hover:border-cyan-400/30 hover:text-cyan-400"
                >
                  {shortPrompt}
                </button>
              );
            })}
          </div>
        </div>

        {/* Empty state */}
        {!hasSearched && !searching && !error && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#8c90a0" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 80, display: "block", marginBottom: 16, color: "#1d2026" }}>group_search</span>
            <p style={{ fontSize: 16, marginBottom: 8, color: "#414754" }}>Describe your project above</p>
            <p style={{ fontSize: 14, color: "#2d3038" }}>AI will analyze and find the most suitable experts</p>
>>>>>>> origin/develop
          </div>
        )}

        {/* Loading */}
        {searching && (
<<<<<<< HEAD
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 64, display: "block", marginBottom: 16, color: "#00F0FF", animation: "spin 1s linear infinite" }}>autorenew</span>
            <p style={{ color: "#00F0FF", fontSize: 16, fontFamily: "JetBrains Mono, monospace" }}>AI đang phân tích và tìm kiếm...</p>
=======
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 56, display: "block", marginBottom: 16, color: "#00F0FF", animation: "spin 1s linear infinite" }}>autorenew</span>
            <p style={{ color: "#00F0FF", fontSize: 15, fontFamily: "JetBrains Mono, monospace" }}>Analyzing and finding experts...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ maxWidth: 860, margin: "0 auto", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "14px 18px", color: "#f87171", fontSize: 14 }}>
            {error}
>>>>>>> origin/develop
          </div>
        )}

        {/* Results */}
        {hasSearched && !searching && (
<<<<<<< HEAD
          <div style={{ maxWidth: 1400, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#8c90a0" }}>
                Showing <span style={{ color: "#00F0FF" }}>{experts.length}</span> synthesized matches
              </p>
              <button style={{ fontSize: 12, color: "#e1e2eb", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "Inter, sans-serif" }}>
                Highest Match Score <span className="material-symbols-outlined" style={{ fontSize: 16 }}>expand_more</span>
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
              {experts.map((expert) => <ExpertCard key={expert.id} expert={expert} />)}
            </div>
=======
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <p style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 18, fontWeight: 700, color: "#e1e2eb", marginBottom: 4 }}>
                  {experts.length > 0 ? "Matching Experts Found" : "No Experts Found"}
                </p>
                <p style={{ fontSize: 13, color: "#8c90a0" }}>
                  {experts.length > 0
                    ? `Showing ${experts.length} of ${total} experts matching "${query}"`
                    : `No experts found for "${query}". Try a different keyword.`}
                </p>
              </div>
              {experts.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#8c90a0" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#00F0FF" }}>auto_awesome</span>
                  AI-ranked by relevance
                </div>
              )}
            </div>

            {experts.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
                {experts.map((expert) => (
                  <ExpertCard key={expert.expertProfileId} expert={expert} />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 56, color: "#272a30", display: "block", marginBottom: 16 }}>person_search</span>
                <p style={{ color: "#8c90a0", fontSize: 15 }}>Try different keywords like "chatbot", "NLP", "Python"...</p>
              </div>
            )}
>>>>>>> origin/develop
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </ClientLayout>
  );
}