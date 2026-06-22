// src/modules/legal/pages/DisputePolicyPage.jsx
// Static page — no API calls. Suggested route: /dispute-policy (public, no auth required)

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import authService from "../../../services/auth.service";

const SECTIONS = [
  { id: "purpose", num: "01", label: "Purpose" },
  { id: "initiation", num: "02", label: "Filing a Dispute" },
  { id: "evidence", num: "03", label: "Evidence Required" },
  { id: "priority", num: "04", label: "Evidence Priority" },
  { id: "investigation", num: "05", label: "Investigation" },
  { id: "holds", num: "06", label: "Payment Holds" },
  { id: "outcomes", num: "07", label: "Possible Outcomes" },
  { id: "false-claims", num: "08", label: "False Claims" },
  { id: "final", num: "09", label: "Final Decision" },
  { id: "liability", num: "10", label: "Limitation of Liability" },
];

const PLATFORM_EVIDENCE = [
  { icon: "chat", label: "Messages" },
  { icon: "description", label: "Proposal" },
  { icon: "contract_edit", label: "Contract" },
  { icon: "deployed_code", label: "Project Deliverables" },
  { icon: "image", label: "Images" },
  { icon: "videocam", label: "Video" },
  { icon: "code", label: "Technical Documentation" },
  { icon: "data_object", label: "Source Code" },
  { icon: "receipt_long", label: "Payment Records" },
  { icon: "history", label: "Work Logs" },
];

const OFF_PLATFORM = ["Zalo", "Facebook Messenger", "Telegram", "Discord", "Email", "Other third-party platforms"];

const INVESTIGATION_POWERS = [
  { icon: "database", label: "Review system data" },
  { icon: "forum", label: "Inspect message history" },
  { icon: "contract_edit", label: "Inspect the contract" },
  { icon: "description", label: "Inspect the proposal" },
  { icon: "inventory_2", label: "Inspect delivered work" },
  { icon: "playlist_add", label: "Request additional evidence" },
];

const OUTCOMES = [
  { level: 1, icon: "payments", label: "Full payment released to the AI Expert", tone: "low" },
  { level: 2, icon: "currency_exchange", label: "Full refund to the Client", tone: "low" },
  { level: 3, icon: "percent", label: "Partial refund", tone: "mid" },
  { level: 4, icon: "build", label: "Required completion of the deliverable", tone: "mid" },
  { level: 5, icon: "warning", label: "Formal warning on the account", tone: "high" },
  { level: 6, icon: "lock_clock", label: "Temporary account suspension", tone: "high" },
  { level: 7, icon: "gpp_bad", label: "Permanent account ban", tone: "critical" },
];

const TONE_COLOR = {
  low: "#00F0FF",
  mid: "#facc15",
  high: "#fb923c",
  critical: "#f87171",
};

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

function Eyebrow({ num }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <span className="dp-mono" style={{ fontSize: 12, color: "#00F0FF", letterSpacing: "0.1em" }}>§ {num}</span>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
    </div>
  );
}

export default function DisputePolicyPage() {
  const sectionIds = SECTIONS.map((s) => s.id);
  const activeId = useScrollSpy(sectionIds);

  const currentUser = authService.getCurrentUser();
  const homeHref = currentUser?.role === "CLIENT" ? "/client/dashboard"
    : currentUser?.role === "EXPERT" ? "/expert/dashboard"
    : currentUser?.role === "ADMIN" ? "/admin/dashboard"
    : "/";

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={{ background: "#0D1117", color: "#E6E9EF", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        .dp-mono { font-family: 'JetBrains Mono', monospace; }
        .dp-display { font-family: 'Space Grotesk', sans-serif; }
        .dp-toc-link { transition: color 0.2s ease, border-color 0.2s ease; }
        .dp-toc-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.12) transparent; }
        .dp-toc-scroll::-webkit-scrollbar { width: 4px; }
        .dp-toc-scroll::-webkit-scrollbar-track { background: transparent; }
        .dp-toc-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
        .dp-toc-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.22); }
        .dp-evidence-card { transition: transform 0.15s ease, border-color 0.15s ease; }
        .dp-evidence-card:hover { transform: translateY(-2px); border-color: rgba(0,240,255,0.35) !important; }
        @media (max-width: 900px) {
          .dp-sidebar { display: none !important; }
          .dp-main { margin-left: 0 !important; }
        }
        @media (max-width: 720px) {
          .dp-evidence-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .dp-investigation-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Top bar */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(13,17,23,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px", height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link to={homeHref} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <span className="dp-display" style={{ fontSize: 20, fontWeight: 700, color: "#E6E9EF" }}>
              <span style={{ color: "#00F0FF" }}>AI</span> Tasker
            </span>
          </Link>
          <Link to={homeHref} style={{ display: "flex", alignItems: "center", gap: 6, color: "#8B95A1", fontSize: 13, textDecoration: "none" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
            Back to home
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "72px 32px 48px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <span className="dp-mono" style={{ fontSize: 11, letterSpacing: "0.16em", color: "#00F0FF", textTransform: "uppercase", padding: "5px 12px", border: "1px solid rgba(0,240,255,0.3)", borderRadius: 999, background: "rgba(0,240,255,0.06)" }}>
            Evidence is reviewed on the platform record
          </span>
        </div>
        <h1 className="dp-display" style={{ fontSize: "clamp(34px, 5vw, 56px)", fontWeight: 700, lineHeight: 1.08, margin: "0 0 20px", letterSpacing: "-0.01em" }}>
          Dispute Resolution<br />
          <span style={{ color: "#00F0FF" }}>Policy</span>
        </h1>
        <p style={{ fontSize: 17, color: "#8B95A1", maxWidth: 640, lineHeight: 1.7, margin: 0 }}>
          This policy defines how AI Tasker investigates and resolves disagreements
          between a Client and an AI Expert — what counts as evidence, how it's
          weighed, and what happens once a decision is made.
        </p>
      </section>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px", display: "flex", gap: 64 }}>

        {/* Sticky table of contents */}
        <aside className="dp-sidebar" style={{ width: 248, flexShrink: 0, paddingTop: 56 }}>
          <div className="dp-toc-scroll" style={{ position: "sticky", top: 96, maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>
            <p className="dp-mono" style={{ fontSize: 11, letterSpacing: "0.14em", color: "#5b6470", textTransform: "uppercase", marginBottom: 16 }}>
              Contents
            </p>
            <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {SECTIONS.map((s) => {
                const active = activeId === s.id;
                return (
                  <button key={s.id} onClick={() => scrollTo(s.id)}
                    className="dp-toc-link"
                    style={{
                      display: "flex", alignItems: "baseline", gap: 10, textAlign: "left",
                      padding: "9px 0", background: "none", border: "none", cursor: "pointer",
                      borderLeft: `2px solid ${active ? "#00F0FF" : "transparent"}`, paddingLeft: 14,
                    }}>
                    <span className="dp-mono" style={{ fontSize: 11, color: active ? "#00F0FF" : "#4a5260", flexShrink: 0 }}>{s.num}</span>
                    <span style={{ fontSize: 13, color: active ? "#E6E9EF" : "#8B95A1", fontWeight: active ? 600 : 400 }}>{s.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="dp-main" style={{ flex: 1, minWidth: 0, paddingBottom: 100, maxWidth: 760 }}>

          {/* 01 — Purpose */}
          <section id="purpose" style={{ paddingTop: 56, paddingBottom: 48, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="01" />
            <h2 className="dp-display" style={{ fontSize: 28, fontWeight: 700, margin: "0 0 16px" }}>Purpose</h2>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: 0 }}>
              This policy sets out the process for handling disputes between a
              Client and an AI Expert — giving both parties a clear, consistent
              path to a resolution when something goes wrong on a project.
            </p>
          </section>

          {/* 02 — Filing a Dispute */}
          <section id="initiation" style={{ paddingTop: 48, paddingBottom: 48, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="02" />
            <h2 className="dp-display" style={{ fontSize: 28, fontWeight: 700, margin: "0 0 16px" }}>Filing a Dispute</h2>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: 0 }}>
              Either the Client or the AI Expert may open a dispute when they
              believe the other party has failed to meet its obligations under
              the contract.
            </p>
          </section>

          {/* 03 — Evidence Required + 04 — Priority, combined as one visual hierarchy */}
          <section id="evidence" style={{ paddingTop: 48, paddingBottom: 32, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="03" />
            <h2 className="dp-display" style={{ fontSize: 28, fontWeight: 700, margin: "0 0 16px" }}>Evidence Required</h2>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: "0 0 28px" }}>
              Both parties must submit complete supporting evidence. The
              following types are accepted:
            </p>

            <div className="dp-evidence-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
              {PLATFORM_EVIDENCE.map((item) => (
                <div key={item.label} className="dp-evidence-card"
                  style={{ background: "#11161D", border: "1px solid rgba(0,240,255,0.18)", borderRadius: 10, padding: "16px 10px", textAlign: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: "#00F0FF", display: "block", marginBottom: 8 }}>{item.icon}</span>
                  <span style={{ fontSize: 11.5, color: "#C2C8D2", fontWeight: 500, lineHeight: 1.3 }}>{item.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section id="priority" style={{ paddingTop: 0, paddingBottom: 48, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="04" />
            <h2 className="dp-display" style={{ fontSize: 28, fontWeight: 700, margin: "0 0 16px" }}>Evidence Priority</h2>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: "0 0 24px" }}>
              Evidence recorded on AI Tasker is given priority over evidence
              from outside the platform — because it's verifiable, timestamped,
              and tied directly to the project record.
            </p>

            {/* Visual hierarchy: platform record (elevated) vs off-platform channels (dimmed, below) */}
            <div style={{ border: "1px solid rgba(0,240,255,0.3)", borderRadius: 14, padding: 20, background: "rgba(0,240,255,0.04)", marginBottom: -1, position: "relative", zIndex: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#00F0FF" }}>verified</span>
                <span className="dp-mono" style={{ fontSize: 11, letterSpacing: "0.1em", color: "#00F0FF", textTransform: "uppercase" }}>Higher priority — AI Tasker platform record</span>
              </div>
              <p style={{ fontSize: 13.5, color: "#8B95A1", margin: "6px 0 0" }}>Messages, contracts, proposals, and deliverables stored on the system</p>
            </div>

            <div style={{ display: "flex", justifyContent: "center", padding: "2px 0" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#4a5260" }}>arrow_downward</span>
            </div>

            <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 20, background: "rgba(255,255,255,0.015)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#5b6470" }}>history_toggle_off</span>
                <span className="dp-mono" style={{ fontSize: 11, letterSpacing: "0.1em", color: "#5b6470", textTransform: "uppercase" }}>Lower priority — off-platform channels</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {OFF_PLATFORM.map((item) => (
                  <span key={item} className="dp-mono" style={{ fontSize: 12, color: "#5b6470", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, padding: "6px 12px" }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* 05 — Investigation */}
          <section id="investigation" style={{ paddingTop: 48, paddingBottom: 48, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="05" />
            <h2 className="dp-display" style={{ fontSize: 28, fontWeight: 700, margin: "0 0 16px" }}>Investigation</h2>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: "0 0 24px" }}>
              An Administrator is authorized to:
            </p>
            <div className="dp-investigation-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {INVESTIGATION_POWERS.map((p) => (
                <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 12, background: "#11161D", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "14px 16px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 19, color: "#00F0FF", flexShrink: 0 }}>{p.icon}</span>
                  <span style={{ fontSize: 14, color: "#C2C8D2" }}>{p.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 06 — Payment Holds */}
          <section id="holds" style={{ paddingTop: 48, paddingBottom: 48, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="06" />
            <h2 className="dp-display" style={{ fontSize: 28, fontWeight: 700, margin: "0 0 16px" }}>Payment Holds</h2>
            <div style={{ display: "flex", gap: 16, padding: 20, background: "rgba(250,204,21,0.04)", border: "1px solid rgba(250,204,21,0.2)", borderRadius: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: "#facc15", flexShrink: 0 }}>lock_clock</span>
              <p style={{ fontSize: 15.5, lineHeight: 1.8, color: "#C2C8D2", margin: 0 }}>
                While a dispute is open, AI Tasker may place the related payment
                on hold until a final decision has been reached.
              </p>
            </div>
          </section>

          {/* 07 — Outcomes (escalating severity ladder) */}
          <section id="outcomes" style={{ paddingTop: 48, paddingBottom: 48, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="07" />
            <h2 className="dp-display" style={{ fontSize: 28, fontWeight: 700, margin: "0 0 16px" }}>Possible Outcomes</h2>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: "0 0 28px" }}>
              After reviewing the evidence, AI Tasker may apply one or more of
              the following outcomes — ranging from a routine resolution to
              account-level action:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {OUTCOMES.map((o, i) => {
                const color = TONE_COLOR[o.tone];
                return (
                  <div key={o.level} style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 4px", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <span className="dp-mono" style={{ fontSize: 11, color: "#4a5260", width: 16, flexShrink: 0 }}>{o.level}</span>
                    <div style={{ width: 4, height: 28, borderRadius: 2, background: color, flexShrink: 0, opacity: 0.85 }} />
                    <span className="material-symbols-outlined" style={{ fontSize: 19, color, flexShrink: 0 }}>{o.icon}</span>
                    <span style={{ fontSize: 14.5, color: "#C2C8D2" }}>{o.label}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 08 — False Claims */}
          <section id="false-claims" style={{ paddingTop: 48, paddingBottom: 48, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="08" />
            <h2 className="dp-display" style={{ fontSize: 28, fontWeight: 700, margin: "0 0 16px" }}>False Claims</h2>
            <div style={{ display: "flex", gap: 16, padding: 20, background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: "#f87171", flexShrink: 0 }}>gpp_bad</span>
              <p style={{ fontSize: 15.5, lineHeight: 1.8, color: "#C2C8D2", margin: 0 }}>
                A user who knowingly submits falsified evidence or makes a
                dishonest statement may face a <strong style={{ color: "#f87171" }}>permanent account ban</strong>.
              </p>
            </div>
          </section>

          {/* 09 — Final Decision */}
          <section id="final" style={{ paddingTop: 48, paddingBottom: 48, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="09" />
            <h2 className="dp-display" style={{ fontSize: 28, fontWeight: 700, margin: "0 0 16px" }}>Final Decision</h2>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: 0 }}>
              After reviewing all available data and evidence, the decision made
              by an AI Tasker Administrator is final and binding on all parties
              involved.
            </p>
          </section>

          {/* 10 — Liability */}
          <section id="liability" style={{ paddingTop: 48, paddingBottom: 8 }}>
            <Eyebrow num="10" />
            <h2 className="dp-display" style={{ fontSize: 28, fontWeight: 700, margin: "0 0 16px" }}>Limitation of Liability</h2>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: "0 0 14px" }}>
              AI Tasker acts as an intermediary platform connecting Clients and
              AI Experts.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: 0 }}>
              AI Tasker is not liable for damage arising outside the scope of
              the data, contracts, and activity recorded on the system.
            </p>

            <div style={{ marginTop: 40, padding: 24, background: "#11161D", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div>
                <p className="dp-mono" style={{ fontSize: 11, color: "#5b6470", letterSpacing: "0.1em", margin: "0 0 4px" }}>NEED TO FILE A DISPUTE?</p>
                <p style={{ fontSize: 14.5, color: "#C2C8D2", margin: 0 }}>Open a dispute from your project page once you've gathered your evidence.</p>
              </div>
              <Link to={homeHref} style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 20px", background: "#00F0FF", color: "#002022", borderRadius: 9, fontSize: 13.5, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
                Back to home
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
              </Link>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}