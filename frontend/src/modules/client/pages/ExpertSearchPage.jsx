// src/modules/client/pages/ExpertSearchPage.jsx
import { useState, useEffect } from "react";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";

const SENIORITY_OPTIONS = [
  { label: "Fresher", value: "fresher" },
  { label: "Junior", value: "junior" },
  { label: "Mid", value: "mid" },
  { label: "Senior", value: "senior" },
  { label: "Lead", value: "lead" },
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
  // Support cả mock data lẫn API data
  const name = expert.fullName || expert.name;
  const role = expert.professionalTitle || expert.role;
  const skills = expert.expertSkills
    ? expert.expertSkills.map(s => s.skillName)
    : (expert.skills || []);
  const bio = expert.bio;
  const badge = expert.badge || (expert.level ? expert.level : null);
  const badgeColor = expert.badgeColor || "#00F0FF";
  const rating = expert.rating || (expert.profileScore ? expert.profileScore / 20 : null);
  const highlight = expert.highlight || null;
  const isTertiary = badge === "TOP PICK";

  return (
    <div style={{ background: isTertiary ? "#101319" : "rgba(29,32,38,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 24, position: "relative", overflow: "hidden", transition: "border-color 0.3s" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = isTertiary ? "rgba(192,193,255,0.5)" : "rgba(0,240,255,0.5)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}>
      {badge && (
        <div style={{ position: "absolute", top: 0, right: 0, padding: "4px 12px", background: `${badgeColor}18`, borderLeft: `1px solid ${badgeColor}33`, borderBottom: `1px solid ${badgeColor}33`, borderRadius: "0 0 0 12px" }}>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: badgeColor, fontWeight: 700 }}>{badge}</span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
        <img
          src={expert.avatarUrl || `https://i.pravatar.cc/100?u=${expert.expertProfileId || expert.id}`}
          alt={name}
          style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(0,240,255,0.2)", flexShrink: 0 }} />
        <div>
          <h4 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 18, fontWeight: 600, color: "#e1e2eb" }}>{name}</h4>
          <p style={{ fontSize: 11, color: "#00F0FF", fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>{role}</p>
          {rating && <StarRating rating={rating} />}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {skills.map((skill) => (
          <span key={skill} style={{ padding: "4px 8px", background: isTertiary ? "rgba(98,101,240,0.1)" : "rgba(39,42,48,0.8)", borderRadius: 4, fontSize: 10, fontFamily: "JetBrains Mono, monospace", color: isTertiary ? "#c0c1ff" : "#c2c6d6", border: `1px solid ${isTertiary ? "rgba(192,193,255,0.3)" : "rgba(255,255,255,0.12)"}` }}>{skill}</span>
        ))}
      </div>
      {bio && <p style={{ fontSize: 14, color: "#8c90a0", lineHeight: 1.6, marginBottom: 24, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{bio}</p>}
      {highlight && (
        <div style={{ padding: 12, background: "rgba(11,14,20,0.5)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontStyle: "italic", color: "#c2c6d6", lineHeight: 1.6 }}>"{highlight}"</p>
        </div>
      )}
      <div style={{ display: "flex", gap: 12 }}>
        <button style={{ flex: 1, padding: "8px", fontSize: 12, fontWeight: 700, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, background: "transparent", color: "#e1e2eb", cursor: "pointer" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(54,57,64,0.5)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>View Profile</button>
        <button style={{ flex: 1, padding: "8px", fontSize: 12, fontWeight: 700, background: "#00F0FF", color: "#101319", borderRadius: 8, border: "none", cursor: "pointer", boxShadow: "0 0 15px rgba(0,240,255,0.3)" }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}>Connect</button>
      </div>
    </div>
  );
}

export default function ExpertSearchPage() {
  const [query, setQuery] = useState("");
  const [seniority, setSeniority] = useState("");
  const [searching, setSearching] = useState(false);
  const [experts, setExperts] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");

  const toggleSeniority = (val) => { setSeniority((prev) => (prev === val ? "" : val)); };
  const isBudgetInvalid = minBudget && maxBudget && Number(minBudget) > Number(maxBudget);

  // Load luôn khi vào trang
  useEffect(() => {
    handleSearch();
  }, []);

  const handleSearch = async () => {
    if (isBudgetInvalid) {
      alert("Budget Min must be less than Budget Max");
      return;
    }
    setSearching(true);
    try {
      const res = await axiosInstance.get("/experts", {
        params: {
          keyword: query.trim() || undefined,
          availableOnly: true,
          page: 1,
          pageSize: 100,
        },
      });

      const data = res.data;
      const items = Array.isArray(data) ? data : (data?.items || data?.data || []);

      const filteredItems = seniority
        ? items.filter((expert) => {
            const level = String(expert.level || "").toLowerCase();
            return level === seniority.toLowerCase();
          })
        : items;

      setExperts(filteredItems);
            setHasSearched(true);
          } catch (err) {
            setExperts([]);
      setHasSearched(true);
    } finally {
      setSearching(false);
    }
  };

  const handleReset = () => {
    setQuery("");
    setSeniority("");
    setMinBudget("");
    setMaxBudget("");
    setExperts([]);
    setHasSearched(false);
    // Load lại all experts
    setTimeout(() => handleSearch(), 0);
  };

  return (
    <ClientLayout>
      <div style={{ paddingTop: 48, paddingBottom: 48, paddingLeft: 24, paddingRight: 24, minHeight: "100vh" }}>

        {/* Header */}
        <div style={{ maxWidth: 900, margin: "0 auto 32px", textAlign: "center" }}>
          <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 32, fontWeight: 700, color: "#e1e2eb", marginBottom: 8 }}>
            Expert <span style={{ color: "#00F0FF" }}>Search</span>
          </h1>
          <p style={{ color: "#8c90a0", fontSize: 15 }}>Tìm kiếm Expert theo tên, kỹ năng hoặc từ khóa</p>
        </div>

        {/* Search Bar */}
        <section style={{ maxWidth: 900, margin: "0 auto 48px" }}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: -4, background: "linear-gradient(90deg, #00F0FF, #1772eb, #6265f0)", borderRadius: 20, filter: "blur(8px)", opacity: 0.25, zIndex: 0 }} />
            <div style={{ position: "relative", background: "rgba(29,32,38,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 24, display: "flex", gap: 16, alignItems: "center", zIndex: 1 }}>
              <div style={{ flex: 1, position: "relative" }}>
                <span className="material-symbols-outlined" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#8c90a0", fontSize: 22 }}>search</span>
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search experts by name, skill, or keyword..."
                  style={{ width: "100%", background: "#0b0e14", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "16px 16px 16px 52px", color: "#e1e2eb", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 15, boxSizing: "border-box" }}
                  onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
              </div>
              <button onClick={handleSearch} disabled={searching}
                style={{ padding: "16px 32px", background: "#00F0FF", color: "#101319", fontWeight: 700, borderRadius: 12, border: "none", cursor: searching ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 0 15px rgba(0,240,255,0.3)", fontSize: 15, fontFamily: "Hanken Grotesk, sans-serif", whiteSpace: "nowrap", opacity: searching ? 0.8 : 1 }}>
                {searching ? <><span className="material-symbols-outlined" style={{ animation: "spin 1s linear infinite" }}>autorenew</span> Searching...</> : "Search"}
              </button>
            </div>
          </div>
        </section>

        <div style={{ display: "flex", gap: 24, maxWidth: 1400, margin: "0 auto" }}>

          {/* Sidebar Filters */}
          <aside style={{ width: 272, flexShrink: 0 }}>
            <div style={{ background: "rgba(29,32,38,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 24, position: "sticky", top: 80 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#00F0FF", textTransform: "uppercase", letterSpacing: "0.1em" }}>Filters</span>
                <button onClick={handleReset} style={{ fontSize: 12, color: "#8c90a0", background: "none", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#e1e2eb")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#8c90a0")}>Reset All</button>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: "#8c90a0", marginBottom: 12 }}>Seniority</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {SENIORITY_OPTIONS.map((s) => {
                    const isSelected = seniority === s.value;

                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => toggleSeniority(s.value)}
                        className={`rounded-md px-2 py-2 text-xs transition-all ${
                          isSelected
                            ? "border border-cyan-400 bg-cyan-400/10 text-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.35)]"
                            : "border border-white/10 bg-[#272a30] text-[#c2c6d6] hover:border-cyan-400/50 hover:text-cyan-400"
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-6">
                <label className="mb-3 block font-mono text-[10px] uppercase tracking-[0.15em] text-gray-400">Project Budget</label>
                <div className="mb-3">
                  <label className="mb-1 block text-xs text-gray-400">Budget Min ($)</label>
                  <input type="number" min="0" value={minBudget}
                    onChange={(e) => { const v = e.target.value; if (v === "" || Number(v) >= 0) setMinBudget(v); }}
                    placeholder="e.g. 500"
                    className={`w-full rounded-lg bg-[#0b0e14] px-3 py-2 text-sm text-white outline-none ${isBudgetInvalid ? "border border-red-500" : "border border-white/10 focus:border-cyan-400"}`} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Budget Max ($)</label>
                  <input type="number" min="0" value={maxBudget}
                    onChange={(e) => { const v = e.target.value; if (v === "" || Number(v) >= 0) setMaxBudget(v); }}
                    placeholder="e.g. 2000"
                    className={`w-full rounded-lg bg-[#0b0e14] px-3 py-2 text-sm text-white outline-none ${isBudgetInvalid ? "border border-red-500" : "border border-white/10 focus:border-cyan-400"}`} />
                </div>
              </div>

              <div>
                <button type="button" onClick={handleSearch} disabled={searching}
                  className="mt-4 w-full rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-bold text-[#101319] shadow-[0_0_15px_rgba(0,240,255,0.3)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70">
                  {searching ? "Applying..." : "Apply"}
                </button>
              </div>
            </div>
          </aside>

          {/* Results */}
          <div style={{ flex: 1 }}>
            {searching && (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 64, display: "block", marginBottom: 16, color: "#00F0FF", animation: "spin 1s linear infinite" }}>autorenew</span>
                <p style={{ color: "#00F0FF", fontSize: 16, fontFamily: "JetBrains Mono, monospace" }}>Searching...</p>
              </div>
            )}
            {hasSearched && !searching && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#8c90a0" }}>
                    Showing <span style={{ color: "#00F0FF" }}>{experts.length}</span> experts found
                  </p>
                </div>
                {experts.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px 0", color: "#8c90a0" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 56, display: "block", marginBottom: 12, color: "#232A35" }}>search_off</span>
                    <p style={{ fontSize: 15 }}>Không tìm thấy Expert phù hợp</p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
                    {experts.map((expert) => (
                      <ExpertCard key={expert.expertProfileId || expert.id} expert={expert} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </ClientLayout>
  );
}