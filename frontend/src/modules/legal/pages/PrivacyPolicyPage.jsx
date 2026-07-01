// src/modules/legal/pages/PrivacyPolicyPage.jsx
// Static page — no API calls. Suggested route: /privacy-policy (public, no auth required)

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import authService from "../../../services/auth.service";

const SECTIONS = [
  { id: "purpose", num: "01", label: "Purpose" },
  { id: "data-collected", num: "02", label: "Information We Collect" },
  { id: "usage", num: "03", label: "How We Use It" },
  { id: "security", num: "04", label: "Data Security" },
  { id: "retention", num: "05", label: "Data Retention" },
  { id: "sharing", num: "06", label: "Data Sharing" },
  { id: "updates", num: "07", label: "Policy Updates" },
];

const DATA_GROUPS = [
  {
    key: "individual",
    role: "CLIENT — INDIVIDUAL",
    icon: "person",
    color: "#00F0FF",
    items: ["Phone number", "Address"],
  },
  {
    key: "business",
    role: "CLIENT — BUSINESS",
    icon: "domain",
    color: "#5EEAD4",
    items: ["Company name", "Tax code", "Company address", "Business email", "Authorized representative"],
  },
  {
    key: "expert",
    role: "AI EXPERT",
    icon: "psychology",
    color: "#FFB454",
    items: ["Professional profile", "Work experience", "Skills", "Certificates", "Portfolio"],
  },
  {
    key: "activity",
    role: "ACTIVITY DATA",
    icon: "data_object",
    color: "#A78BFA",
    items: ["Job postings", "Proposals", "Contracts", "Projects", "Messages exchanged", "Uploaded documents", "Payment history", "Transaction history"],
  },
];

const PURPOSES = [
  { icon: "verified_user", title: "Account verification", desc: "Confirm real users and limit fraudulent accounts on the platform." },
  { icon: "diversity_3", title: "Connecting Clients and AI Experts", desc: "Match each Client's needs with the right AI Expert's capabilities." },
  { icon: "draw", title: "Generating electronic contracts", desc: "Create and store legally binding project contracts between both parties." },
  { icon: "payments", title: "Processing payments", desc: "Operate wallets, escrow, deposits, withdrawals, and accurate transaction reconciliation." },
  { icon: "gavel", title: "Resolving disputes", desc: "Provide the evidentiary basis when a claim arises between a Client and an AI Expert." },
  { icon: "shield", title: "Preventing fraud", desc: "Detect abnormal behavior and protect the user community." },
  { icon: "trending_up", title: "Improving service quality", desc: "Refine features based on how the platform is actually used." },
];

const RETAINED_ITEMS = ["Messages", "Proposals", "Contracts", "Projects", "Project documents", "Transaction history"];

function useScrollSpy(ids) {
  const [activeId, setActiveId] = useState(ids[0]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: "-15% 0px -70% 0px" }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);
  return activeId;
}

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();
  const sectionIds = SECTIONS.map((s) => s.id);
  const activeId = useScrollSpy(sectionIds);
  const topRef = useRef(null);

  // This page is viewed both by signed-out visitors (e.g. before registering)
  // and by signed-in users (revisiting the policy from inside the app).
  // "Back to home" must respect the current role — a signed-in user's "home"
  // is their own dashboard, not the public landing page.
  const currentUser = authService.getCurrentUser();
  const homeHref = currentUser?.role === "CLIENT" ? "/client/dashboard"
    : currentUser?.role === "EXPERT" ? "/expert/dashboard"
    : currentUser?.role === "ADMIN" ? "/admin/dashboard"
    : "/";

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={{ background: "#0D1117", color: "#E6E9EF", minHeight: "100vh", fontFamily: "Inter, sans-serif" }} ref={topRef}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        .pp-mono { font-family: 'JetBrains Mono', monospace; }
        .pp-display { font-family: 'Space Grotesk', sans-serif; }
        .pp-ledger-row {
          transition: background 0.15s ease, padding-left 0.15s ease;
        }
        .pp-ledger-row:hover {
          background: rgba(255,255,255,0.02);
          padding-left: 4px;
        }
        .pp-toc-link {
          transition: color 0.2s ease, border-color 0.2s ease;
        }
        .pp-toc-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.12) transparent; }
        .pp-toc-scroll::-webkit-scrollbar { width: 4px; }
        .pp-toc-scroll::-webkit-scrollbar-track { background: transparent; }
        .pp-toc-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
        .pp-toc-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.22); }
        @media (max-width: 900px) {
          .pp-sidebar { display: none !important; }
          .pp-main { margin-left: 0 !important; }
        }
      `}</style>

      {/* Top bar */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(13,17,23,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px", height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link to={homeHref} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <span className="pp-display" style={{ fontSize: 20, fontWeight: 700, color: "#E6E9EF" }}>
              <span style={{ color: "#00F0FF" }}>AI</span> Tasker
            </span>
          </Link>
          <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "#8B95A1",
            fontSize: 13,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 16 }}
          >
            arrow_back
          </span>
          Back
        </button>
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "72px 32px 48px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <span className="pp-mono" style={{ fontSize: 11, letterSpacing: "0.16em", color: "#00F0FF", textTransform: "uppercase", padding: "5px 12px", border: "1px solid rgba(0,240,255,0.3)", borderRadius: 999, background: "rgba(0,240,255,0.06)" }}>
            Effective from the moment you use the platform
          </span>
        </div>
        <h1 className="pp-display" style={{ fontSize: "clamp(34px, 5vw, 56px)", fontWeight: 700, lineHeight: 1.08, margin: "0 0 20px", letterSpacing: "-0.01em" }}>
          Privacy<br />
          <span style={{ color: "#00F0FF" }}>Policy</span>
        </h1>
        <p style={{ fontSize: 17, color: "#8B95A1", maxWidth: 640, lineHeight: 1.7, margin: 0 }}>
          AI Tasker is committed to protecting the privacy and data of every
          user — Individual Clients, Business Clients, and AI Experts —
          throughout their time on the platform connecting and running AI projects.
        </p>
      </section>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px", display: "flex", gap: 64 }}>

        {/* Sticky table of contents */}
        <aside className="pp-sidebar" style={{ width: 240, flexShrink: 0, paddingTop: 56 }}>
          <div className="pp-toc-scroll" style={{ position: "sticky", top: 96, maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>
            <p className="pp-mono" style={{ fontSize: 11, letterSpacing: "0.14em", color: "#5b6470", textTransform: "uppercase", marginBottom: 16 }}>
              Contents
            </p>
            <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {SECTIONS.map((s) => {
                const active = activeId === s.id;
                return (
                  <button key={s.id} onClick={() => scrollTo(s.id)}
                    className="pp-toc-link"
                    style={{
                      display: "flex", alignItems: "baseline", gap: 10, textAlign: "left",
                      padding: "9px 0", background: "none", border: "none", cursor: "pointer",
                      borderLeft: `2px solid ${active ? "#00F0FF" : "transparent"}`, paddingLeft: 14,
                    }}>
                    <span className="pp-mono" style={{ fontSize: 11, color: active ? "#00F0FF" : "#4a5260", flexShrink: 0 }}>{s.num}</span>
                    <span style={{ fontSize: 13.5, color: active ? "#E6E9EF" : "#8B95A1", fontWeight: active ? 600 : 400 }}>{s.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="pp-main" style={{ flex: 1, minWidth: 0, paddingBottom: 100, maxWidth: 760 }}>

          {/* 01 — Purpose */}
          <section id="purpose" style={{ paddingTop: 56, paddingBottom: 48, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <SectionEyebrow num="01" />
            <h2 className="pp-display" style={{ fontSize: 28, fontWeight: 700, margin: "0 0 16px" }}>Purpose</h2>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: 0 }}>
              AI Tasker is committed to protecting the privacy and data of every
              user on the platform. This policy explains what information is
              collected, why we need it, and how AI Tasker protects that data
              throughout the lifecycle of a project — from posting a job to
              the completion of a contract.
            </p>
          </section>

          {/* 02 — Information collected (Data Ledger) */}
          <section id="data-collected" style={{ paddingTop: 48, paddingBottom: 48, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <SectionEyebrow num="02" />
            <h2 className="pp-display" style={{ fontSize: 28, fontWeight: 700, margin: "0 0 16px" }}>Information We Collect</h2>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: "0 0 32px" }}>
              The data we collect depends on your role on the platform. Below
              is the complete list of every category AI Tasker records,
              presented as a transparent ledger — nothing is collected outside
              of what's listed here.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden" }}>
              {DATA_GROUPS.map((group, gi) => (
                <div key={group.key} style={{ background: "#11161D" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderTop: gi > 0 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: group.color }}>{group.icon}</span>
                    <span className="pp-mono" style={{ fontSize: 11.5, letterSpacing: "0.1em", color: group.color, fontWeight: 500 }}>{group.role}</span>
                  </div>
                  {group.items.map((item, i) => (
                    <div key={item} className="pp-ledger-row"
                      style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 20px 11px 48px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <span className="pp-mono" style={{ fontSize: 11, color: "#4a5260", width: 18, flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                      <span style={{ fontSize: 14.5, color: "#C2C8D2" }}>{item}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {/* 03 — How we use it */}
          <section id="usage" style={{ paddingTop: 48, paddingBottom: 48, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <SectionEyebrow num="03" />
            <h2 className="pp-display" style={{ fontSize: 28, fontWeight: 700, margin: "0 0 16px" }}>How We Use It</h2>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: "0 0 28px" }}>
              The information collected is used only for the following
              platform operations:
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
              {PURPOSES.map((p) => (
                <div key={p.title} style={{ background: "#11161D", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 18 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: "#00F0FF", marginBottom: 10, display: "block" }}>{p.icon}</span>
                  <p style={{ fontSize: 14.5, fontWeight: 600, color: "#E6E9EF", margin: "0 0 6px" }}>{p.title}</p>
                  <p style={{ fontSize: 13, color: "#8B95A1", lineHeight: 1.6, margin: 0 }}>{p.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 04 — Data Security */}
          <section id="security" style={{ paddingTop: 48, paddingBottom: 48, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <SectionEyebrow num="04" />
            <h2 className="pp-display" style={{ fontSize: 28, fontWeight: 700, margin: "0 0 16px" }}>Data Security</h2>
            <div style={{ display: "flex", gap: 16, padding: 20, background: "rgba(0,240,255,0.04)", border: "1px solid rgba(0,240,255,0.18)", borderRadius: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 26, color: "#00F0FF", flexShrink: 0 }}>encrypted</span>
              <p style={{ fontSize: 15.5, lineHeight: 1.8, color: "#C2C8D2", margin: 0 }}>
                AI Tasker applies appropriate technical measures to protect
                data from unauthorized access, loss, or leaks — including
                role-based access control, encryption of sensitive data in
                transit, and monitoring for unusual activity across the system.
              </p>
            </div>
          </section>

          {/* 05 — Data Retention */}
          <section id="retention" style={{ paddingTop: 48, paddingBottom: 48, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <SectionEyebrow num="05" />
            <h2 className="pp-display" style={{ fontSize: 28, fontWeight: 700, margin: "0 0 16px" }}>Data Retention</h2>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: "0 0 24px" }}>
              AI Tasker reserves the right to retain the following data to
              support audits, security, and dispute resolution when needed:
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {RETAINED_ITEMS.map((item) => (
                <span key={item} className="pp-mono"
                  style={{ fontSize: 12.5, color: "#A78BFA", background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 8, padding: "8px 14px" }}>
                  {item}
                </span>
              ))}
            </div>
          </section>

          {/* 06 — Data Sharing */}
          <section id="sharing" style={{ paddingTop: 48, paddingBottom: 48, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <SectionEyebrow num="06" />
            <h2 className="pp-display" style={{ fontSize: 28, fontWeight: 700, margin: "0 0 16px" }}>Data Sharing</h2>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: "#5EEAD4", flexShrink: 0, marginTop: 2 }}>block</span>
              <p style={{ fontSize: 16, lineHeight: 1.8, color: "#E6E9EF", fontWeight: 600, margin: 0 }}>
                AI Tasker does not sell user data to third parties.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: 18, background: "rgba(255,180,84,0.04)", border: "1px solid rgba(255,180,84,0.2)", borderRadius: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#FFB454", flexShrink: 0, marginTop: 1 }}>info</span>
              <p style={{ fontSize: 14.5, lineHeight: 1.8, color: "#C2C8D2", margin: 0 }}>
                Information is only disclosed when requested by a competent
                government authority, or when necessary to support the
                platform's operations (for example, payment processing
                through a payment gateway partner).
              </p>
            </div>
          </section>

          {/* 07 — Policy Updates */}
          <section id="updates" style={{ paddingTop: 48, paddingBottom: 8 }}>
            <SectionEyebrow num="07" />
            <h2 className="pp-display" style={{ fontSize: 28, fontWeight: 700, margin: "0 0 16px" }}>Policy Updates</h2>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: 0 }}>
              AI Tasker reserves the right to amend this policy at any time to
              reflect changes in the product or applicable law. Continuing to
              use the platform after a policy update means you accept the
              latest version.
            </p>

          </section>

        </main>
      </div>
    </div>
  );
}

function SectionEyebrow({ num }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <span className="pp-mono" style={{ fontSize: 12, color: "#00F0FF", letterSpacing: "0.1em" }}>§ {num}</span>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
    </div>
  );
}