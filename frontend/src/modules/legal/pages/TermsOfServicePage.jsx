// src/modules/legal/pages/TermsOfServicePage.jsx
// Static page — no API calls. Suggested route: /terms-of-service (public, no auth required)

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import authService from "../../../services/auth.service";

const SECTIONS = [
  { id: "acceptance", num: "01", label: "Acceptance of Terms" },
  { id: "scope", num: "02", label: "Who This Applies To" },
  { id: "accounts", num: "03", label: "User Accounts" },
  { id: "fees", num: "04", label: "Platform Fees" },
  { id: "proposals", num: "05", label: "Jobs & Proposals" },
  { id: "contracts", num: "06", label: "Electronic Contracts" },
  { id: "payments", num: "07", label: "Payments" },
  { id: "client-duties", num: "08", label: "Client Responsibilities" },
  { id: "expert-duties", num: "09", label: "AI Expert Responsibilities" },
  { id: "delivery", num: "10", label: "Deliverables" },
  { id: "ip", num: "11", label: "Intellectual Property" },
  { id: "reviews", num: "12", label: "Reviews & Ratings" },
  { id: "cancellation", num: "13", label: "Contract Cancellation" },
  { id: "off-platform", num: "14", label: "Off-Platform Dealing" },
  { id: "prohibited", num: "15", label: "Prohibited Conduct" },
  { id: "suspension", num: "16", label: "Account Suspension" },
  { id: "liability", num: "17", label: "Limitation of Liability" },
  { id: "disputes", num: "18", label: "Dispute Resolution" },
  { id: "changes", num: "19", label: "Changes to These Terms" },
  { id: "final", num: "20", label: "Final Decisions" },
];

const FEES = [
  { role: "Individual Client", rate: "5%", color: "#00F0FF" },
  { role: "Business Client", rate: "10%", color: "#5EEAD4" },
  { role: "AI Expert", rate: "15%", color: "#A7F3EB" },
];

const PROHIBITED = [
  "Submitting fraudulent information",
  "Impersonating another identity",
  "Spamming other users",
  "Harassing other users",
  "Posting unlawful content",
  "Distributing malware or harmful software",
  "Plagiarism or copyright infringement",
  "Submitting falsified evidence",
  "Filing dishonest complaints",
];

const SUSPENSION_TRIGGERS = [
  "Fraud",
  "Violation of these Terms",
  "Violation of applicable law",
  "Harm to the platform or other users",
  "Exploiting the system for unfair gain",
];

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
      <span className="tos-mono" style={{ fontSize: 12, color: "#00F0FF", letterSpacing: "0.1em" }}>§ {num}</span>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
    </div>
  );
}

function BulletList({ items }) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item) => (
        <li key={item} style={{ display: "flex", gap: 12, fontSize: 15.5, lineHeight: 1.7, color: "#C2C8D2" }}>
          <span style={{ color: "#00F0FF", flexShrink: 0, marginTop: 2 }}>—</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// Obligation Matrix — paired columns for "rights vs duties" style clauses
function ObligationMatrix({ left, right }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
      {[left, right].map((col, i) => (
        <div key={col.title} style={{ background: "#11161D", padding: 22, borderLeft: i === 1 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: col.color }}>{col.icon}</span>
            <p className="tos-mono" style={{ fontSize: 11.5, letterSpacing: "0.08em", color: col.color, margin: 0, textTransform: "uppercase" }}>{col.title}</p>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
            {col.items.map((item) => (
              <li key={item} style={{ display: "flex", gap: 10, fontSize: 14, lineHeight: 1.65, color: "#C2C8D2" }}>
                <span style={{ color: col.color, flexShrink: 0 }}>·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function TermsOfServicePage() {
  const navigate = useNavigate();
  const sectionIds = SECTIONS.map((s) => s.id);
  const activeId = useScrollSpy(sectionIds);

  // "Back to home" must respect the signed-in user's role — a Client or AI
  // Expert who is already authenticated has their own dashboard as "home,"
  // not the public landing page.
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
        .tos-mono { font-family: 'JetBrains Mono', monospace; }
        .tos-display { font-family: 'Space Grotesk', sans-serif; }
        .tos-toc-link { transition: color 0.2s ease, border-color 0.2s ease; }
        .tos-toc-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.12) transparent;
        }
        .tos-toc-scroll::-webkit-scrollbar { width: 4px; }
        .tos-toc-scroll::-webkit-scrollbar-track { background: transparent; }
        .tos-toc-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.12);
          border-radius: 4px;
        }
        .tos-toc-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.22);
        }
        @media (max-width: 900px) {
          .tos-sidebar { display: none !important; }
          .tos-main { margin-left: 0 !important; }
        }
        @media (max-width: 720px) {
          .tos-matrix { grid-template-columns: 1fr !important; }
          .tos-matrix > div:last-child { border-left: none !important; border-top: 1px solid rgba(255,255,255,0.08) !important; }
          .tos-feegrid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Top bar */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(13,17,23,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px", height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link to={homeHref} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <span className="tos-display" style={{ fontSize: 20, fontWeight: 700, color: "#E6E9EF" }}>
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
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              arrow_back
            </span>
            Back
          </button>
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "72px 32px 48px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <span className="tos-mono" style={{ fontSize: 11, letterSpacing: "0.16em", color: "#00F0FF", textTransform: "uppercase", padding: "5px 12px", border: "1px solid rgba(255,107,74,0.3)", borderRadius: 999, background: "rgba(255,107,74,0.06)" }}>
            Binding from the moment you use the platform
          </span>
        </div>
        <h1 className="tos-display" style={{ fontSize: "clamp(34px, 5vw, 56px)", fontWeight: 700, lineHeight: 1.08, margin: "0 0 20px", letterSpacing: "-0.01em" }}>
          Terms of<br />
          <span style={{ color: "#00F0FF" }}>Service</span>
        </h1>
        <p style={{ fontSize: 17, color: "#8B95A1", maxWidth: 640, lineHeight: 1.7, margin: 0 }}>
          These Terms govern every Individual Client, Business Client, AI Expert,
          and Administrator using AI Tasker — from posting a job to the final
          handover of a completed project.
        </p>
      </section>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px", display: "flex", gap: 64 }}>

        {/* Sticky table of contents */}
        <aside className="tos-sidebar" style={{ width: 248, flexShrink: 0, paddingTop: 56 }}>
          <div className="tos-toc-scroll" style={{ position: "sticky", top: 96, maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>
            <p className="tos-mono" style={{ fontSize: 11, letterSpacing: "0.14em", color: "#5b6470", textTransform: "uppercase", marginBottom: 16 }}>
              Contents
            </p>
            <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {SECTIONS.map((s) => {
                const active = activeId === s.id;
                return (
                  <button key={s.id} onClick={() => scrollTo(s.id)}
                    className="tos-toc-link"
                    style={{
                      display: "flex", alignItems: "baseline", gap: 10, textAlign: "left",
                      padding: "7px 0", background: "none", border: "none", cursor: "pointer",
                      borderLeft: `2px solid ${active ? "#00F0FF" : "transparent"}`, paddingLeft: 14,
                    }}>
                    <span className="tos-mono" style={{ fontSize: 11, color: active ? "#00F0FF" : "#4a5260", flexShrink: 0 }}>{s.num}</span>
                    <span style={{ fontSize: 13, color: active ? "#E6E9EF" : "#8B95A1", fontWeight: active ? 600 : 400 }}>{s.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="tos-main" style={{ flex: 1, minWidth: 0, paddingBottom: 100, maxWidth: 760 }}>

          {/* 01 — Acceptance */}
          <section id="acceptance" style={{ paddingTop: 56, paddingBottom: 44, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="01" />
            <h2 className="tos-display" style={{ fontSize: 27, fontWeight: 700, margin: "0 0 16px" }}>Acceptance of Terms</h2>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: "0 0 14px" }}>
              By creating an account or using the AI Tasker platform, you agree to
              comply with all terms, policies, and rules published within the system.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: 0 }}>
              If you do not agree with any part of these Terms, you must not
              continue using the platform.
            </p>
          </section>

          {/* 02 — Scope */}
          <section id="scope" style={{ paddingTop: 44, paddingBottom: 44, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="02" />
            <h2 className="tos-display" style={{ fontSize: 27, fontWeight: 700, margin: "0 0 16px" }}>Who This Applies To</h2>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: "0 0 20px" }}>
              These Terms apply to every user of AI Tasker, including:
            </p>
            <div className="tos-feegrid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {[
                { label: "Individual Client", icon: "person" },
                { label: "Business Client", icon: "domain" },
                { label: "AI Expert", icon: "psychology" },
                { label: "System Administrator", icon: "admin_panel_settings" },
              ].map((role) => (
                <div key={role.label} style={{ background: "#11161D", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "16px 14px", textAlign: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: "#00F0FF", display: "block", marginBottom: 8 }}>{role.icon}</span>
                  <span style={{ fontSize: 12.5, color: "#C2C8D2", fontWeight: 500 }}>{role.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 03 — Accounts */}
          <section id="accounts" style={{ paddingTop: 44, paddingBottom: 44, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="03" />
            <h2 className="tos-display" style={{ fontSize: 27, fontWeight: 700, margin: "0 0 16px" }}>User Accounts</h2>
            <p style={{ fontSize: 15, color: "#8B95A1", margin: "0 0 16px" }}>Every user is responsible for:</p>
            <BulletList items={[
              "Providing accurate and truthful information.",
              "Keeping their account and password secure.",
              "All activity that occurs under their registered account.",
            ]} />
            <div style={{ marginTop: 20, display: "flex", gap: 14, padding: 18, background: "rgba(255,107,74,0.04)", border: "1px solid rgba(255,107,74,0.18)", borderRadius: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#00F0FF", flexShrink: 0, marginTop: 1 }}>fact_check</span>
              <p style={{ fontSize: 14.5, lineHeight: 1.75, color: "#C2C8D2", margin: 0 }}>
                AI Tasker reserves the right to request identity verification or
                business verification whenever necessary.
              </p>
            </div>
          </section>

          {/* 04 — Fees */}
          <section id="fees" style={{ paddingTop: 44, paddingBottom: 44, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="04" />
            <h2 className="tos-display" style={{ fontSize: 27, fontWeight: 700, margin: "0 0 16px" }}>Platform Fees</h2>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: "0 0 24px" }}>
              AI Tasker charges a service fee on transactions completed through the
              platform, calculated as a percentage of each transaction:
            </p>

            <div className="tos-feegrid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
              {FEES.map((f) => (
                <div key={f.role} style={{ background: "#11161D", border: `1px solid ${f.color}33`, borderRadius: 14, padding: "26px 20px", textAlign: "center" }}>
                  <div className="tos-display" style={{ fontSize: 40, fontWeight: 700, color: f.color, lineHeight: 1, marginBottom: 10 }}>{f.rate}</div>
                  <p className="tos-mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: "#8B95A1", textTransform: "uppercase", margin: 0 }}>{f.role}</p>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 14.5, lineHeight: 1.8, color: "#8B95A1", margin: 0 }}>
              AI Tasker reserves the right to adjust fee rates in the future and
              will announce any change publicly before it takes effect.
            </p>
          </section>

          {/* 05 — Jobs & Proposals */}
          <section id="proposals" style={{ paddingTop: 44, paddingBottom: 44, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="05" />
            <h2 className="tos-display" style={{ fontSize: 27, fontWeight: 700, margin: "0 0 20px" }}>Jobs & Proposals</h2>

            <div className="tos-matrix">
              <ObligationMatrix
                left={{ title: "Client may", icon: "post_add", color: "#00F0FF", items: ["Post a job", "Receive proposals from AI Experts", "Choose the right AI Expert"] }}
                right={{ title: "AI Expert may", icon: "search", color: "#5EEAD4", items: ["Browse open jobs", "Submit a proposal", "Communicate with the Client through the in-platform messaging system"] }}
              />
            </div>

            <p style={{ fontSize: 14.5, lineHeight: 1.8, color: "#8B95A1", marginTop: 20 }}>
              Every proposal submitted must accurately reflect the scope of work,
              timeline, and proposed cost.
            </p>
          </section>

          {/* 06 — Contracts */}
          <section id="contracts" style={{ paddingTop: 44, paddingBottom: 44, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="06" />
            <h2 className="tos-display" style={{ fontSize: 27, fontWeight: 700, margin: "0 0 16px" }}>Electronic Contracts</h2>
            <p style={{ fontSize: 15, color: "#8B95A1", margin: "0 0 14px" }}>A contract only becomes effective once:</p>
            <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "#11161D", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "14px 16px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#00F0FF" }}>check_circle</span>
                <span style={{ fontSize: 14, color: "#C2C8D2" }}>The Client confirms the contract</span>
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "#11161D", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "14px 16px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#00F0FF" }}>check_circle</span>
                <span style={{ fontSize: 14, color: "#C2C8D2" }}>The AI Expert confirms the contract</span>
              </div>
            </div>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: "0 0 14px" }}>
              Once both parties confirm, the system automatically creates a Project.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: 0 }}>
              The terms recorded in the contract serve as the official basis for
              evaluating the delivered work.
            </p>
          </section>

          {/* 07 — Payments */}
          <section id="payments" style={{ paddingTop: 44, paddingBottom: 44, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="07" />
            <h2 className="tos-display" style={{ fontSize: 27, fontWeight: 700, margin: "0 0 16px" }}>Payments</h2>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: "0 0 20px" }}>
              All payments related to a project must be processed through AI Tasker.
              Users must not:
            </p>
            <BulletList items={[
              "Transfer money outside the platform.",
              "Provide payment information intended to avoid platform fees.",
              "Arrange a separate deal outside AI Tasker.",
            ]} />
            <div style={{ marginTop: 20, display: "flex", gap: 14, padding: 18, background: "rgba(255,107,74,0.04)", border: "1px solid rgba(255,107,74,0.18)", borderRadius: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#00F0FF", flexShrink: 0, marginTop: 1 }}>warning</span>
              <p style={{ fontSize: 14.5, lineHeight: 1.75, color: "#C2C8D2", margin: 0 }}>
                AI Tasker reserves the right to take action against any violation
                of this policy.
              </p>
            </div>
          </section>

          {/* 08 / 09 — Client & Expert duties side by side */}
          <section id="client-duties" style={{ paddingTop: 44, paddingBottom: 44, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="08" />
            <h2 className="tos-display" style={{ fontSize: 27, fontWeight: 700, margin: "0 0 20px" }}>Client Responsibilities</h2>
            <BulletList items={[
              "Clearly describe the project requirements.",
              "Provide the information the AI Expert needs to carry out the work.",
              "Pay on time.",
              "Respond reasonably during project execution.",
              "Never request work that violates the law.",
            ]} />
          </section>

          <section id="expert-duties" style={{ paddingTop: 0, paddingBottom: 44, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="09" />
            <h2 className="tos-display" style={{ fontSize: 27, fontWeight: 700, margin: "0 0 20px" }}>AI Expert Responsibilities</h2>
            <BulletList items={[
              "Perform the work exactly as committed.",
              "Deliver the product on time.",
              "Ensure quality matches the agreed scope.",
              "Never misrepresent skills, experience, or certifications.",
              "Never copy or use a third party's intellectual property without authorization.",
            ]} />
          </section>

          {/* 10 — Delivery */}
          <section id="delivery" style={{ paddingTop: 44, paddingBottom: 44, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="10" />
            <h2 className="tos-display" style={{ fontSize: 27, fontWeight: 700, margin: "0 0 16px" }}>Deliverables</h2>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: "0 0 20px" }}>
              The AI Expert must hand over everything committed to in the Proposal
              and Contract, including but not limited to:
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 22 }}>
              {["Source code", "User documentation", "Deployment documentation", "System accounts (if applicable)", "Related product files"].map((item) => (
                <span key={item} className="tos-mono" style={{ fontSize: 12.5, color: "#5EEAD4", background: "rgba(255,107,74,0.08)", border: "1px solid rgba(255,107,74,0.25)", borderRadius: 8, padding: "8px 14px" }}>
                  {item}
                </span>
              ))}
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#8B95A1", margin: 0 }}>
              Delivery is considered complete once the Client confirms it, or once
              an Administrator determines that the delivery obligation has been
              fully met.
            </p>
          </section>

          {/* 11 — IP */}
          <section id="ip" style={{ paddingTop: 44, paddingBottom: 44, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="11" />
            <h2 className="tos-display" style={{ fontSize: 27, fontWeight: 700, margin: "0 0 16px" }}>Intellectual Property</h2>
            <p style={{ fontSize: 15, color: "#8B95A1", margin: "0 0 16px" }}>Once the Client completes their payment obligation:</p>
            <div className="tos-matrix">
              <ObligationMatrix
                left={{ title: "Client owns", icon: "inventory_2", color: "#00F0FF", items: ["The delivered products under the contract"] }}
                right={{ title: "Expert retains", icon: "construction", color: "#5EEAD4", items: ["Tools, frameworks, libraries, design templates, or any IP that existed before the project"] }}
              />
            </div>
            <p style={{ fontSize: 14.5, lineHeight: 1.8, color: "#8B95A1", marginTop: 20 }}>
              Neither party may use or distribute the other party's intellectual
              property without permission.
            </p>
          </section>

          {/* 12 — Reviews */}
          <section id="reviews" style={{ paddingTop: 44, paddingBottom: 44, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="12" />
            <h2 className="tos-display" style={{ fontSize: 27, fontWeight: 700, margin: "0 0 16px" }}>Reviews & Ratings</h2>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: "0 0 14px" }}>
              Once a Project is completed, the Client rates the AI Expert and the
              AI Expert rates the Client.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: "0 0 14px" }}>
              Reviews must be honest, objective, and free of insults, falsehoods,
              or content intended to harm another person's reputation.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: 0 }}>
              AI Tasker reserves the right to edit or remove any review that
              violates this standard.
            </p>
          </section>

          {/* 13 — Cancellation */}
          <section id="cancellation" style={{ paddingTop: 44, paddingBottom: 44, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="13" />
            <h2 className="tos-display" style={{ fontSize: 27, fontWeight: 700, margin: "0 0 16px" }}>Contract Cancellation</h2>
            <p style={{ fontSize: 15, color: "#8B95A1", margin: "0 0 16px" }}>If either party requests to cancel a contract, AI Tasker will:</p>
            <BulletList items={[
              "Review the current state of project execution.",
              "May issue a full or partial refund.",
              "May take action against the party at fault.",
            ]} />
            <p style={{ fontSize: 14.5, lineHeight: 1.8, color: "#8B95A1", marginTop: 18 }}>
              Cancelling a contract does not void any obligation that arose before
              the cancellation took effect.
            </p>
          </section>

          {/* 14 — Off-platform */}
          <section id="off-platform" style={{ paddingTop: 44, paddingBottom: 44, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="14" />
            <h2 className="tos-display" style={{ fontSize: 27, fontWeight: 700, margin: "0 0 16px" }}>Off-Platform Dealing</h2>
            <p style={{ fontSize: 15, color: "#8B95A1", margin: "0 0 16px" }}>Clients and AI Experts must not use AI Tasker to:</p>
            <BulletList items={[
              "Exchange contact information for the purpose of dealing outside the platform.",
              "Avoid platform service fees.",
              "Move a project to another platform after connecting through AI Tasker.",
            ]} />
            <div style={{ marginTop: 20, display: "flex", gap: 14, padding: 18, background: "rgba(255,107,74,0.04)", border: "1px solid rgba(255,107,74,0.18)", borderRadius: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#00F0FF", flexShrink: 0, marginTop: 1 }}>gpp_bad</span>
              <p style={{ fontSize: 14.5, lineHeight: 1.75, color: "#C2C8D2", margin: 0 }}>
                AI Tasker may issue a warning, temporarily suspend, or permanently
                ban any account found in violation.
              </p>
            </div>
          </section>

          {/* 15 — Prohibited conduct */}
          <section id="prohibited" style={{ paddingTop: 44, paddingBottom: 44, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="15" />
            <h2 className="tos-display" style={{ fontSize: 27, fontWeight: 700, margin: "0 0 20px" }}>Prohibited Conduct</h2>
            <p style={{ fontSize: 15, color: "#8B95A1", margin: "0 0 20px" }}>Users must not engage in any of the following:</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
              {PROHIBITED.map((item, i) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", background: "#11161D", borderTop: i >= 2 ? "1px solid rgba(255,255,255,0.05)" : "none", borderLeft: i % 2 === 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#00F0FF", flexShrink: 0 }}>block</span>
                  <span style={{ fontSize: 13.5, color: "#C2C8D2" }}>{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 16 — Suspension */}
          <section id="suspension" style={{ paddingTop: 44, paddingBottom: 44, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="16" />
            <h2 className="tos-display" style={{ fontSize: 27, fontWeight: 700, margin: "0 0 16px" }}>Account Suspension</h2>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: "0 0 20px" }}>
              AI Tasker reserves the right to suspend or terminate an account upon
              discovering:
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {SUSPENSION_TRIGGERS.map((item) => (
                <span key={item} className="tos-mono" style={{ fontSize: 12.5, color: "#00F0FF", background: "rgba(255,107,74,0.08)", border: "1px solid rgba(255,107,74,0.25)", borderRadius: 8, padding: "8px 14px" }}>
                  {item}
                </span>
              ))}
            </div>
          </section>

          {/* 17 — Liability */}
          <section id="liability" style={{ paddingTop: 44, paddingBottom: 44, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="17" />
            <h2 className="tos-display" style={{ fontSize: 27, fontWeight: 700, margin: "0 0 16px" }}>Limitation of Liability</h2>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: "0 0 14px" }}>
              AI Tasker is an intermediary platform that connects Clients and AI
              Experts. AI Tasker is not liable for:
            </p>
            <BulletList items={[
              "Damage arising outside the scope of data recorded on the system.",
              "Private arrangements made outside the platform.",
              "Content or documents that users provide on their own.",
            ]} />
          </section>

          {/* 18 — Disputes */}
          <section id="disputes" style={{ paddingTop: 44, paddingBottom: 44, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="18" />
            <h2 className="tos-display" style={{ fontSize: 27, fontWeight: 700, margin: "0 0 16px" }}>Dispute Resolution</h2>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: "0 0 14px" }}>
              Any dispute that arises will be handled under AI Tasker's Dispute
              Resolution Policy.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: 0 }}>
              Users are responsible for providing sufficient evidence when requested.
            </p>
          </section>

          {/* 19 — Changes */}
          <section id="changes" style={{ paddingTop: 44, paddingBottom: 44, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Eyebrow num="19" />
            <h2 className="tos-display" style={{ fontSize: 27, fontWeight: 700, margin: "0 0 16px" }}>Changes to These Terms</h2>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: "0 0 14px" }}>
              AI Tasker reserves the right to amend, update, or add to these Terms
              of Service at any time.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: 0 }}>
              Changes take effect from the moment they are published on the system.
            </p>
          </section>

          {/* 20 — Final */}
          <section id="final" style={{ paddingTop: 44, paddingBottom: 8 }}>
            <Eyebrow num="20" />
            <h2 className="tos-display" style={{ fontSize: 27, fontWeight: 700, margin: "0 0 16px" }}>Final Decisions</h2>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "#C2C8D2", margin: 0 }}>
              In any dispute, violation, or issue related to platform operations,
              the decision made by AI Tasker's Administrators — after a full review
              of the available information and evidence — shall be final.
            </p>

          </section>

        </main>
      </div>
    </div>
  );
}