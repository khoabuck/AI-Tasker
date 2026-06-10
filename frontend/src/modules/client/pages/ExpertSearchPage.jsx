// src/modules/client/pages/ExpertSearchPage.jsx
// Tìm Expert thủ công — search theo tên/skill + filter
// TODO (BE): GET /api/experts?keyword=&seniority=&availability= khi BE xong

import { useState } from "react";
import ClientLayout from "../../../components/layout/ClientLayout";

const MOCK_EXPERTS = [
  { id: 1, name: "Dr. Aris Thorne", role: "Senior ML Architect", badge: "98% MATCH", badgeColor: "#00F0FF", rating: 4.5, skills: ["LLM", "Healthcare AI", "PyTorch"], bio: "Ex-DeepMind specialist focused on generative models for precision medicine.", highlight: null },
  { id: 2, name: "Marcus Vane", role: "NLP Lead Scientist", badge: "TOP PICK", badgeColor: "#c0c1ff", rating: 5, skills: ["Transformers", "BERT", "Semantics"], bio: null, highlight: "Marcus has successfully deployed 14 healthcare LLM projects in the last 24 months." },
  { id: 3, name: "Elena Kostic", role: "Generative AI Specialist", badge: "92% MATCH", badgeColor: "#00F0FF", rating: 4, skills: ["Stable Diffusion", "GANs", "AWS SageMaker"], bio: "Pioneering work in multimodal content generation and infrastructure optimization.", highlight: null },
];

const SENIORITY_OPTIONS = ["Fresher", "Junior", "Senior", "Lead", "Director"];
const AVAILABILITY_OPTIONS = ["Immediately", "In 2 Weeks", "In 1 Month"];

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
      </div>
    </div>
  );
}

export default function ExpertSearchPage() {
  const [query, setQuery] = useState("");
  const [seniority, setSeniority] = useState([]);
  const [availability, setAvailability] = useState("");
  const [searching, setSearching] = useState(false);
  const [experts, setExperts] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const toggleSeniority = (val) => setSeniority((prev) => prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]);

  const handleSearch = () => {
    setSearching(true);
    // ── TODO (BE): swap mock bằng API ──────────────────────────────────
    // const res = await axiosInstance.get("/experts", { params: { keyword: query, seniority: seniority.join(","), availability } });
    // setExperts(res.data);
    // ───────────────────────────────────────────────────────────────────
    setTimeout(() => {
      const filtered = MOCK_EXPERTS.filter((e) =>
        !query.trim() || e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.role.toLowerCase().includes(query.toLowerCase()) ||
        e.skills.some((s) => s.toLowerCase().includes(query.toLowerCase()))
      );
      setExperts(filtered); setHasSearched(true); setSearching(false);
    }, 1000);
  };

  const handleReset = () => { setQuery(""); setSeniority([]); setAvailability(""); setExperts([]); setHasSearched(false); };

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

        {/* Search Bar — Manual */}
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
          <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ color: "#8c90a0", fontSize: 11, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>Recent:</span>
            {["React Developer", "Data Scientist", "UX Designer"].map((tag) => (
              <button key={tag} onClick={() => setQuery(tag)}
                style={{ background: "#272a30", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, padding: "4px 12px", fontSize: 12, color: "#c2c6d6", cursor: "pointer", fontFamily: "Inter, sans-serif" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#00F0FF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#c2c6d6")}>{tag}</button>
            ))}
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
                  {SENIORITY_OPTIONS.map((s) => (
                    <button key={s} onClick={() => toggleSeniority(s)}
                      style={{ padding: "8px", borderRadius: 6, border: `1px solid ${seniority.includes(s) ? "#00F0FF" : "rgba(255,255,255,0.12)"}`, background: "#272a30", fontSize: 12, color: seniority.includes(s) ? "#00F0FF" : "#c2c6d6", cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "all 0.2s" }}>{s}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: "#8c90a0", marginBottom: 12 }}>Hourly Rate ($)</label>
                <input type="range" min={50} max={500} style={{ width: "100%", accentColor: "#00F0FF" }} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "#8c90a0", fontFamily: "JetBrains Mono, monospace" }}>
                  <span>$50</span><span>$500+</span>
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: "#8c90a0", marginBottom: 12 }}>Availability</label>
                <select value={availability} onChange={(e) => setAvailability(e.target.value)}
                  style={{ width: "100%", background: "#0b0e14", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 12px", color: "#e1e2eb", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 14 }}>
                  <option value="">Any</option>
                  {AVAILABILITY_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
          </aside>

          {/* Results */}
          <div style={{ flex: 1 }}>
            {!hasSearched && !searching && (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#8c90a0" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 72, display: "block", marginBottom: 16, color: "#232A35" }}>person_search</span>
                <p style={{ fontSize: 16, marginBottom: 8 }}>Tìm kiếm Expert phù hợp</p>
                <p style={{ fontSize: 14, color: "#414754" }}>Nhập tên, kỹ năng hoặc từ khóa rồi bấm <span style={{ color: "#00F0FF" }}>Search</span></p>
              </div>
            )}
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
                    {experts.map((expert) => <ExpertCard key={expert.id} expert={expert} />)}
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