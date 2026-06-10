// src/modules/client/pages/TransactionsPage.jsx
// Trang Transactions — Finance > Transactions

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
// TODO (BE): import axiosInstance from "../../../api/axiosInstance";

// ── MOCK DATA — xóa khi BE xong ──────────────────────────────────────
const MOCK_TRANSACTIONS = [
  { id: 1, date: "24/10/23", type: "Escrow", icon: "lock_clock", iconBg: "rgba(23,114,235,0.1)", iconColor: "#adc6ff", project: "Neural Interface V2", amount: -12400, status: "Pending" },
  { id: 2, date: "23/10/23", type: "Deposit", icon: "account_balance_wallet", iconBg: "rgba(52,211,153,0.1)", iconColor: "#34d399", project: "System Vault Transfer", amount: 50000, status: "Completed" },
  { id: 3, date: "22/10/23", type: "Payment", icon: "send", iconBg: "rgba(173,198,255,0.1)", iconColor: "#adc6ff", project: "Contractor Milestone #3", amount: -8500, status: "Completed" },
  { id: 4, date: "21/10/23", type: "Refund", icon: "undo", iconBg: "rgba(248,113,113,0.1)", iconColor: "#f87171", project: "Failed API Request", amount: 1200, status: "Failed" },
  { id: 5, date: "20/10/23", type: "Payment", icon: "send", iconBg: "rgba(173,198,255,0.1)", iconColor: "#adc6ff", project: "Cyber-Sec Audit", amount: -3200, status: "Completed" },
  { id: 6, date: "19/10/23", type: "Escrow", icon: "lock_clock", iconBg: "rgba(23,114,235,0.1)", iconColor: "#adc6ff", project: "Quantum Processing Unit", amount: -5000, status: "Pending" },
  { id: 7, date: "18/10/23", type: "Deposit", icon: "account_balance_wallet", iconBg: "rgba(52,211,153,0.1)", iconColor: "#34d399", project: "Monthly Retainer", amount: 15000, status: "Completed" },
];
// ─────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  Completed: { bg: "rgba(52,211,153,0.1)", color: "#34d399", border: "rgba(52,211,153,0.2)" },
  Pending:   { bg: "rgba(250,204,21,0.1)", color: "#facc15", border: "rgba(250,204,21,0.2)" },
  Failed:    { bg: "rgba(248,113,113,0.1)", color: "#f87171", border: "rgba(248,113,113,0.2)" },
};

export default function TransactionsPage() {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [page, setPage] = useState(1);

  // ── TODO (BE): Load transactions ─────────────────────────────────
  // useEffect(() => {
  //   axiosInstance.get("/wallet/transactions", {
  //     params: { type: filterType, status: filterStatus, page }
  //   }).then(res => setTransactions(res.data));
  // }, [filterType, filterStatus, page]);
  // ─────────────────────────────────────────────────────────────────

  const filtered = MOCK_TRANSACTIONS.filter((tx) =>
    (filterType === "All" || tx.type === filterType) &&
    (filterStatus === "All" || tx.status === filterStatus)
  );

  const handleExport = () => {
    // TODO (BE): GET /wallet/transactions/export → download file
    alert("Export coming soon!");
  };

  return (
    <ClientLayout>
      <div style={{ padding: "40px 48px", maxWidth: 1440, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div>
            <h2 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 32, fontWeight: 700, color: "#e1e2eb", marginBottom: 6 }}>Transactions</h2>
            <p style={{ color: "#8c90a0", fontSize: 15 }}>Detailed history of your ecosystem's fiscal flow</p>
          </div>
          {/* TODO (BE): onClick gọi API export */}
          <button onClick={handleExport}
            style={{ padding: "10px 20px", background: "#1772eb", color: "#fff", fontFamily: "JetBrains Mono, monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, borderRadius: 8, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
            Export
          </button>
        </div>

        {/* Filters */}
        <div style={{ background: "rgba(29,32,38,0.4)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
          {/* Date */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(29,32,38,0.5)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, cursor: "pointer", fontSize: 14, color: "#c2c6d6" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#00F0FF" }}>calendar_month</span>
            Last 30 Days
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>expand_more</span>
          </div>

          {/* Type filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, color: "#8c90a0", fontWeight: 500 }}>Type:</span>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              style={{ background: "rgba(29,32,38,0.5)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 10px", color: "#e1e2eb", fontSize: 13, outline: "none", cursor: "pointer" }}>
              {["All", "Escrow", "Deposit", "Payment", "Refund"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>

          {/* Status filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, color: "#8c90a0", fontWeight: 500 }}>Status:</span>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              style={{ background: "rgba(29,32,38,0.5)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 10px", color: "#e1e2eb", fontSize: 13, outline: "none", cursor: "pointer" }}>
              {["All", "Completed", "Pending", "Failed"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <button onClick={() => { setFilterType("All"); setFilterStatus("All"); }}
            style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "#8c90a0", background: "none", border: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.1em" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#00F0FF")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#8c90a0")}>
            Clear Filters
          </button>
        </div>

        {/* Table */}
        <div style={{ background: "rgba(29,32,38,0.4)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>

          {/* Table Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 3fr 1.5fr 1.5fr 1fr", padding: "14px 24px", background: "rgba(29,32,38,0.3)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            {["Date", "Type", "Project Name", "Amount", "Status", "Action"].map((h, i) => (
              <div key={h} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8c90a0", textAlign: i >= 3 ? "right" : "left" }}>{h}</div>
            ))}
          </div>

          {/* Table Body */}
          <div style={{ overflowY: "auto", maxHeight: "55vh" }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#8c90a0" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 12 }}>receipt_long</span>
                No transactions found
              </div>
            ) : filtered.map((tx) => {
              const statusCfg = STATUS_CONFIG[tx.status] || STATUS_CONFIG.Pending;
              return (
                <div key={tx.id}
                  style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 3fr 1.5fr 1.5fr 1fr", padding: "18px 24px", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>

                  {/* Date */}
                  <div style={{ fontSize: 13, color: "#8c90a0" }}>{tx.date}</div>

                  {/* Type */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: tx.iconBg, color: tx.iconColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{tx.icon}</span>
                    </div>
                    <span style={{ fontSize: 13, color: "#e1e2eb" }}>{tx.type}</span>
                  </div>

                  {/* Project */}
                  <div style={{ fontSize: 13, color: "#e1e2eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.project}</div>

                  {/* Amount */}
                  <div style={{ fontSize: 13, fontFamily: "JetBrains Mono, monospace", color: tx.amount > 0 ? "#34d399" : "#e1e2eb", textAlign: "right" }}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                  </div>

                  {/* Status */}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 10, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}>
                      {tx.status}
                    </span>
                  </div>

                  {/* Action — TODO (BE): navigate đến trang detail transaction */}
                  {/* Khi BE xong: navigate(`/client/transactions/${tx.id}`) */}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => navigate(`/client/transactions/${tx.id}`)}
                      style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.05em", color: "#00F0FF", background: "none", border: "none", cursor: "pointer", transition: "filter 0.2s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.3)")}
                      onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}>
                      Detail
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
          <button style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#8c90a0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
          </button>
          {[1, 2, 3, "...", 12].map((p, i) => (
            <button key={i} onClick={() => typeof p === "number" && setPage(p)}
              style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${page === p ? "transparent" : "rgba(255,255,255,0.12)"}`, background: page === p ? "#00F0FF" : "transparent", color: page === p ? "#002022" : "#8c90a0", fontFamily: "JetBrains Mono, monospace", fontSize: 12, cursor: typeof p === "number" ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {p}
            </button>
          ))}
          <button style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#8c90a0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
          </button>
        </div>

      </div>
    </ClientLayout>
  );
}