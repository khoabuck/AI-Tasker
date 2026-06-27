// src/modules/client/pages/TransactionsPage.jsx
// Trang Transactions — Finance > Transactions

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import { transactionService } from "../../../services/transaction.service";

const STATUS_CONFIG = {
  SUCCESS:   { bg: "rgba(52,211,153,0.1)", color: "#34d399", border: "rgba(52,211,153,0.2)" },
  COMPLETED: { bg: "rgba(52,211,153,0.1)", color: "#34d399", border: "rgba(52,211,153,0.2)" },
  PAID:      { bg: "rgba(52,211,153,0.1)", color: "#34d399", border: "rgba(52,211,153,0.2)" },
  PENDING:   { bg: "rgba(250,204,21,0.1)", color: "#facc15", border: "rgba(250,204,21,0.2)" },
  FAILED:    { bg: "rgba(248,113,113,0.1)", color: "#f87171", border: "rgba(248,113,113,0.2)" },
};

export default function TransactionsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const selectedProjectId = searchParams.get("projectId");
  const selectedMilestoneId = searchParams.get("milestoneId");
  const selectedTransactionId = searchParams.get("transactionId");

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await transactionService.getMyTransactions();
        setTransactions(data);
      } catch (err) {
        setError(err?.response?.data?.message || "Không thể tải lịch sử giao dịch.");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const getTxType = (tx) => (tx.type ?? tx.transactionType ?? "").toUpperCase();

  const isExpenseTx = (tx) => {
    return [
      "ESCROW_LOCK",
      "ESCROW_RELEASE",
      "PLATFORM_FEE",
      "WITHDRAWAL",
      "WITHDRAW",
    ].includes(getTxType(tx));
  };

  const getTxAmountText = (tx) => {
    const amount = Number(tx.amount ?? 0);

    if (amount === 0) return "0₫";

    return `${isExpenseTx(tx) ? "-" : "+"}${Math.abs(amount).toLocaleString()}₫`;
  };

  const getTxProjectText = (tx) => {
    if (tx.projectId && tx.milestoneId) {
      return `Project #${tx.projectId} • Milestone #${tx.milestoneId}`;
    }

    if (tx.projectId) {
      return `Project #${tx.projectId}`;
    }

    if (getTxType(tx) === "DEPOSIT") {
      return "Nạp tiền vào ví";
    }

    return tx.description ?? "—";
  };

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const type = getTxType(tx);
      const status = (tx.status ?? "").toUpperCase();

      const matchType =
        filterType === "All" || type === filterType.toUpperCase();

      const matchStatus =
        filterStatus === "All" || status === filterStatus.toUpperCase();

      const matchProject =
        !selectedProjectId || String(tx.projectId) === String(selectedProjectId);

      const matchMilestone =
        !selectedMilestoneId || String(tx.milestoneId) === String(selectedMilestoneId);

      const matchTransaction =
        !selectedTransactionId || String(tx.transactionId) === String(selectedTransactionId);

      return matchType && matchStatus && matchProject && matchMilestone && matchTransaction;
    });
  }, [
    transactions,
    filterType,
    filterStatus,
    selectedProjectId,
    selectedMilestoneId,
    selectedTransactionId,
  ]);

  const handleExport = () => {
    // TODO (BE): GET /wallet/transactions/export → download file
    alert("Export coming soon!");
  };

  return (
    <ClientLayout>
      <div className="mx-auto max-w-[1440px] px-12 py-10">

        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex w-fit items-center gap-2 rounded-lg border border-cyan-400/30 px-4 py-2 text-cyan-400 transition hover:bg-cyan-400/10"
        >
          <span className="material-symbols-outlined text-[18px]">
            arrow_back
          </span>
          Back 
        </button>

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
              {["All", "DEPOSIT", "ESCROW_LOCK", "ESCROW_RELEASE", "PLATFORM_FEE", "WITHDRAWAL"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, color: "#8c90a0", fontWeight: 500 }}>Status:</span>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              style={{ background: "rgba(29,32,38,0.5)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 10px", color: "#e1e2eb", fontSize: 13, outline: "none", cursor: "pointer" }}>
              {["All", "SUCCESS", "PENDING", "FAILED", "PAID"].map((s) => (
                <option key={s}>{s}</option>
              ))}
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
            {loading ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#8c90a0" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 12, animation: "spin 1s linear infinite", color: "#00F0FF" }}>
                  autorenew
                </span>
                Loading transactions...
              </div>
            ) : error ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#f87171" }}>
                {error}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#8c90a0" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 12 }}>receipt_long</span>
                No transactions found
              </div>
            ) : filtered.map((tx) => {
              const statusKey = (tx.status ?? "").toUpperCase();
              const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.PENDING;

              return (
                <div key={tx.transactionId ?? tx.id}
                  style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 3fr 1.5fr 1.5fr 1fr", padding: "18px 24px", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>

                  {/* Date */}
                  <div style={{ fontSize: 13, color: "#8c90a0" }}>
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString("vi-VN") : "—"}
                  </div>

                  {/* Type */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: isExpenseTx(tx) ? "rgba(248,113,113,0.1)" : "rgba(52,211,153,0.1)", color: isExpenseTx(tx) ? "#f87171" : "#34d399", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                        {isExpenseTx(tx) ? "output" : "input"}
                      </span>
                    </div>
                    <span style={{ fontSize: 13, color: "#e1e2eb" }}>
                      {getTxType(tx)}
                    </span>
                  </div>

                  {/* Project */}
                  <div style={{ fontSize: 13, color: "#e1e2eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={tx.description ?? ""}>{getTxProjectText(tx)}</div>

                  {/* Amount */}
                  <div style={{ fontSize: 13, fontFamily: "JetBrains Mono, monospace", color: isExpenseTx(tx) ? "#ffb4ab" : "#34d399", textAlign: "right", fontWeight: 700 }}>
                    {getTxAmountText(tx)}
                  </div>

                  {/* Status */}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 10, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}>
                      {statusKey || "—"}
                    </span>
                  </div>

                  {/* Action — dẫn vào trang form chi tiết riêng cho từng transaction */}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => navigate(`/client/transactions/${tx.transactionId}`)}
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