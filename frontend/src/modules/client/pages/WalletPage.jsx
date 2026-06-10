// src/modules/client/pages/WalletPage.jsx
// Trang Wallet — Finance > Wallet
// TODO (BE): GET /api/wallet/balance, GET /api/wallet/transactions khi BE xong

import { useState } from "react";
import { Link } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";

// ── MOCK DATA — xóa khi BE xong ──────────────────────────────────────
const MOCK_BALANCE = {
  available: 45200.00,
  escrow: 12850.00,
  totalDeposited: 120400.00,
  totalSpent: 62350.00,
};

const MOCK_TRANSACTIONS = [
  { id: 1, type: "Payment", icon: "rocket_launch", iconBg: "rgba(23,114,235,0.2)", iconColor: "#adc6ff", project: "Neural Engine Optimization", date: "Oct 24, 2023", amount: -12400.00, status: "COMPLETED" },
  { id: 2, type: "Deposit", icon: "account_balance", iconBg: "rgba(0,240,255,0.2)", iconColor: "#00F0FF", project: "—", date: "Oct 22, 2023", amount: 50000.00, status: "COMPLETED" },
  { id: 3, type: "Escrow", icon: "lock", iconBg: "rgba(98,101,240,0.2)", iconColor: "#c0c1ff", project: "AI Agent Fleet Deployment", date: "Oct 20, 2023", amount: -5000.00, status: "PENDING" },
  { id: 4, type: "Payment", icon: "rocket_launch", iconBg: "rgba(23,114,235,0.2)", iconColor: "#adc6ff", project: "Quantum Dataset Labeling", date: "Oct 18, 2023", amount: -2150.00, status: "COMPLETED" },
];

const MOCK_CARDS = [
  { id: 1, last4: "8842", unmasked: "4532 7890 1234 8842", expires: "12/26", type: "VISA", primary: true },
  { id: 2, last4: "1099", unmasked: "5234 5678 9012 1099", expires: "08/25", type: "MC", primary: false },
];
// ─────────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = status === "COMPLETED"
    ? { bg: "rgba(74,222,128,0.1)", color: "#4ade80" }
    : { bg: "rgba(23,114,235,0.15)", color: "#adc6ff" };
  return (
    <span style={{ padding: "3px 8px", borderRadius: 4, background: cfg.bg, color: cfg.color, fontSize: 10, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase" }}>
      {status}
    </span>
  );
}

function CardItem({ card }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ padding: 16, background: card.primary ? "linear-gradient(135deg, #232A35, #1d2026)" : "rgba(35,42,53,0.4)", borderRadius: 12, border: `1px solid ${card.primary ? "rgba(0,240,255,0.3)" : "rgba(255,255,255,0.1)"}`, cursor: "pointer", transition: "border-color 0.2s" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(0,240,255,0.5)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = card.primary ? "rgba(0,240,255,0.3)" : "rgba(255,255,255,0.1)")}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <span className="material-symbols-outlined" style={{ color: card.primary ? "#00F0FF" : "#8c90a0" }}>contactless</span>
        {card.primary && <span style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", color: "#8c90a0", textTransform: "uppercase", letterSpacing: "0.1em" }}>PRIMARY</span>}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 16, letterSpacing: "0.15em", color: "#e1e2eb" }}>
          {visible ? card.unmasked : `•••• •••• •••• ${card.last4}`}
        </span>
        <button onClick={() => setVisible(!visible)} style={{ padding: 4, background: "none", border: "none", color: "#8c90a0", cursor: "pointer" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#00F0FF")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#8c90a0")}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{visible ? "visibility_off" : "visibility"}</span>
        </button>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p style={{ fontSize: 10, color: "#8c90a0", fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", marginBottom: 2 }}>Expires</p>
          <p style={{ fontSize: 13, color: "#e1e2eb" }}>{card.expires}</p>
        </div>
        <div style={{ padding: "4px 8px", background: "rgba(255,255,255,0.1)", borderRadius: 4 }}>
          <span style={{ fontWeight: 900, fontStyle: "italic", fontSize: 12, color: "#e1e2eb" }}>{card.type}</span>
        </div>
      </div>
    </div>
  );
}

export default function WalletPage() {
  // ── TODO (BE): Load wallet data ──────────────────────────────────
  // useEffect(() => {
  //   axiosInstance.get("/wallet/balance").then(res => setBalance(res.data));
  //   axiosInstance.get("/wallet/transactions").then(res => setTransactions(res.data));
  // }, []);
  // ─────────────────────────────────────────────────────────────────

  const metrics = [
    { label: "Available Balance", value: `$${MOCK_BALANCE.available.toLocaleString()}`, icon: "account_balance_wallet", iconColor: "#00F0FF", iconBg: "rgba(0,240,255,0.1)", badge: "LIVE", sub: "+12.5% this month", subColor: "#00F0FF", subIcon: "trending_up" },
    { label: "Escrow Balance", value: `$${MOCK_BALANCE.escrow.toLocaleString()}`, icon: "lock_clock", iconColor: "#c0c1ff", iconBg: "rgba(98,101,240,0.1)", sub: "Linked to 4 active projects" },
    { label: "Total Deposited", value: `$${MOCK_BALANCE.totalDeposited.toLocaleString()}`, icon: "input", iconColor: "#adc6ff", iconBg: "rgba(23,114,235,0.1)", sub: "Lifetime funding volume" },
    { label: "Total Spent", value: `$${MOCK_BALANCE.totalSpent.toLocaleString()}`, icon: "output", iconColor: "#ffb4ab", iconBg: "rgba(147,0,10,0.1)", sub: "Includes platform fees" },
  ];

  return (
    <ClientLayout>
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "48px 48px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h2 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 32, fontWeight: 700, color: "#e1e2eb", marginBottom: 6 }}>Financial Command Center</h2>
            <p style={{ color: "#8c90a0", fontSize: 15 }}>Manage your workforce capital and project escrow.</p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {/* TODO (BE): onClick gọi API deposit */}
            <button style={{ padding: "14px 28px", background: "linear-gradient(90deg, #1772eb, #00F0FF)", color: "#fff", fontWeight: 700, borderRadius: 12, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontFamily: "Hanken Grotesk, sans-serif", boxShadow: "0 0 20px rgba(0,240,255,0.2)" }}>
              <span className="material-symbols-outlined">add_card</span>
              Deposit Funds
            </button>
            {/* TODO (BE): onClick gọi API withdraw */}
            <button style={{ padding: "14px 28px", background: "transparent", color: "#00F0FF", fontWeight: 700, borderRadius: 12, border: "2px solid rgba(0,240,255,0.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontFamily: "Hanken Grotesk, sans-serif", transition: "background 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,240,255,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <span className="material-symbols-outlined">outbox</span>
              Withdraw Funds
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginBottom: 32 }}>
          {metrics.map((m) => (
            <div key={m.label} style={{ background: "rgba(29,32,38,0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 24, position: "relative", overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{ padding: 12, background: m.iconBg, borderRadius: 12, color: m.iconColor }}>
                  <span className="material-symbols-outlined">{m.icon}</span>
                </div>
                {m.badge && <span style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", color: "#00F0FF", background: "rgba(0,240,255,0.1)", padding: "4px 8px", borderRadius: 4 }}>{m.badge}</span>}
              </div>
              <p style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.12em", color: "#8c90a0", marginBottom: 6 }}>{m.label}</p>
              <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 26, fontWeight: 700, color: "#fff", marginBottom: 12 }}>{m.value}</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: m.subColor || "#8c90a0" }}>
                {m.subIcon && <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{m.subIcon}</span>}
                {m.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Lower Section */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>

          {/* Transactions */}
          <div style={{ background: "rgba(29,32,38,0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 18, fontWeight: 700, color: "#e1e2eb" }}>Recent Activity</h4>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(35,42,53,0.5)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    {["Type", "Project", "Date", "Amount", "Status"].map((h) => (
                      <th key={h} style={{ padding: "12px 24px", textAlign: "left", fontSize: 11, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_TRANSACTIONS.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", transition: "background 0.2s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: tx.iconBg, color: tx.iconColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{tx.icon}</span>
                          </div>
                          <span style={{ fontSize: 14, color: "#c2c6d6" }}>{tx.type}</span>
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px", fontSize: 14, color: "#e1e2eb" }}>{tx.project}</td>
                      <td style={{ padding: "16px 24px", fontSize: 14, color: "#8c90a0" }}>{tx.date}</td>
                      <td style={{ padding: "16px 24px", fontFamily: "JetBrains Mono, monospace", fontSize: 14, color: tx.amount > 0 ? "#00F0FF" : "#e1e2eb" }}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                      </td>
                      <td style={{ padding: "16px 24px" }}><StatusBadge status={tx.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#8c90a0" }}>Showing <span style={{ color: "#e1e2eb" }}>1-4</span> of <span style={{ color: "#e1e2eb" }}>24</span> transactions</span>
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 3].map((p) => (
                  <button key={p} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${p === 1 ? "rgba(0,240,255,0.5)" : "rgba(255,255,255,0.12)"}`, background: p === 1 ? "rgba(0,240,255,0.1)" : "transparent", color: p === 1 ? "#00F0FF" : "#8c90a0", fontSize: 12, fontFamily: "JetBrains Mono, monospace", cursor: "pointer" }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Payment Methods */}
            <div style={{ background: "rgba(29,32,38,0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h4 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 18, fontWeight: 700, color: "#e1e2eb" }}>Payment Methods</h4>
                <button style={{ padding: 8, background: "#232A35", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#e1e2eb", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#00F0FF")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#e1e2eb")}>
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {MOCK_CARDS.map((card) => <CardItem key={card.id} card={card} />)}
              </div>
            </div>

            {/* Synthetix Insight */}
            <div style={{ padding: 1, borderRadius: 16, background: "linear-gradient(90deg, #1772eb, #00F0FF, #1772eb)", backgroundSize: "200% 100%", animation: "shimmer 4s linear infinite" }}>
              <div style={{ background: "#1d2026", borderRadius: 15, padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#00F0FF", marginBottom: 12 }}>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>Synthetix Insight</span>
                </div>
                <p style={{ fontSize: 13, color: "#c2c6d6", lineHeight: 1.7 }}>
                  Based on your hiring velocity, we recommend depositing an additional{" "}
                  <span style={{ color: "#00F0FF", fontWeight: 700 }}>$5,000</span> to ensure continuous operation for the upcoming{" "}
                  <span style={{ color: "#e1e2eb", fontWeight: 600 }}>Q4 Infrastructure Project</span> scheduled for next week.
                </p>
                <button style={{ marginTop: 16, width: "100%", padding: "10px", background: "#232A35", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#e1e2eb", fontSize: 12, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer", transition: "background 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#32353b")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#232A35")}>
                  Accept Suggestion
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      <style>{`@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }`}</style>
    </ClientLayout>
  );
}