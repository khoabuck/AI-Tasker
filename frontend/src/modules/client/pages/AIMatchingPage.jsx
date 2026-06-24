// src/modules/client/pages/AIMatchingPage.jsx
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
      </div>
    </div>
  );
}

export default function AIMatchingPage() {
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
          </div>
        )}

        {/* Loading */}
        {searching && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 56, display: "block", marginBottom: 16, color: "#00F0FF", animation: "spin 1s linear infinite" }}>autorenew</span>
            <p style={{ color: "#00F0FF", fontSize: 15, fontFamily: "JetBrains Mono, monospace" }}>Analyzing and finding experts...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ maxWidth: 860, margin: "0 auto", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "14px 18px", color: "#f87171", fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* Results */}
        {hasSearched && !searching && (
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
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </ClientLayout>
  );
}