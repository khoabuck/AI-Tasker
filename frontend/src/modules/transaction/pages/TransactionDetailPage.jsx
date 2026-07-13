// src/modules/client/pages/TransactionDetailPage.jsx
//
// GET /api/transactions/me → không có GET /transactions/{id} riêng theo Swagger,
// nên trang này load toàn bộ list rồi tìm đúng transactionId trong URL param.
//
// Response thật của 1 transaction (đã xác nhận):
// { transactionId, escrowId, projectId, milestoneId, userId, type, amount,
//   status, description, referenceId, createdAt }

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import { transactionService } from "../../../services/transaction.service";

const cardStyle = {
  background: "rgba(16,19,25,0.85)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 16,
  padding: 32,
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
};

const sectionLabel = {
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "#8c90a0",
  marginBottom: 8,
  display: "block",
};

const STATUS_CONFIG = {
  SUCCESS:   { bg: "rgba(52,211,153,0.1)", color: "#34d399", border: "rgba(52,211,153,0.2)", icon: "check_circle" },
  COMPLETED: { bg: "rgba(52,211,153,0.1)", color: "#34d399", border: "rgba(52,211,153,0.2)", icon: "check_circle" },
  PAID:      { bg: "rgba(52,211,153,0.1)", color: "#34d399", border: "rgba(52,211,153,0.2)", icon: "check_circle" },
  PENDING:   { bg: "rgba(250,204,21,0.1)", color: "#facc15", border: "rgba(250,204,21,0.2)", icon: "hourglass_empty" },
  FAILED:    { bg: "rgba(248,113,113,0.1)", color: "#f87171", border: "rgba(248,113,113,0.2)", icon: "error" },
};

const TYPE_CONFIG = {
  DEPOSIT:        { label: "Deposit to wallet", icon: "account_balance_wallet", color: "#34d399", isExpense: false },
  WITHDRAWAL:     { label: "Withdraw",         icon: "outbox",                 color: "#f87171", isExpense: true },
  ESCROW_LOCK:    { label: "Lock fund in Escrow", icon: "lock_clock",          color: "#f87171", isExpense: true },
  ESCROW_RELEASE: { label: "Release Escrow fund", icon: "lock_open",              color: "#34d399", isExpense: true },
  PLATFORM_FEE:   { label: "Platform fee",     icon: "percent",                color: "#f87171", isExpense: true },
};

export default function TransactionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [transaction, setTransaction] = useState(null);
  const [projectMilestones, setProjectMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTransaction = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const match = await transactionService.getTransactionById(id, signal);
      if (!match) {
        setError("Transaction not found.");
        return;
      }
      setTransaction(match);

      if (match.projectId) {
        try {
          const msRes = await transactionService.getProjectMilestones(match.projectId, signal);
          setProjectMilestones(msRes);
        } catch {
          setProjectMilestones([]);
        }
      }
    } catch (err) {
      if (err?.code === "ERR_CANCELED") return;
      setError(err?.response?.data?.message || "Could not load transaction information.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    fetchTransaction(controller.signal);
    return () => controller.abort();
  }, [fetchTransaction]);

  if (loading) {
    return (
      <ClientLayout>
        <div style={{ textAlign: "center", padding: "120px 0", color: "#8c90a0" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 16, animation: "spin 1s linear infinite", color: "#00F0FF" }}>autorenew</span>
          Loading transaction...
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </ClientLayout>
    );
  }

  if (error || !transaction) {
    return (
      <ClientLayout>
        <div style={{ textAlign: "center", padding: "120px 24px" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#f87171", display: "block", marginBottom: 12 }}>error_outline</span>
          <p style={{ color: "#f87171", fontSize: 15, marginBottom: 20 }}>{error || "Transaction not found."}</p>
          <button onClick={() => navigate("/client/transactions")}
            style={{ padding: "10px 24px", background: "#00F0FF", color: "#002022", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
            Quay lại danh sách
          </button>
        </div>
      </ClientLayout>
    );
  }

  const type = (transaction.type ?? "").toUpperCase();
  const typeCfg = TYPE_CONFIG[type] || { label: type || "—", icon: "receipt_long", color: "#8c90a0", isExpense: transaction.amount < 0 };
  const statusKey = (transaction.status ?? "").toUpperCase();
  const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.PENDING;
  const amount = Number(transaction.amount ?? 0);
  const isExpense = typeCfg.isExpense ?? amount < 0;
  const createdAt = transaction.createdAt
    ? new Date(transaction.createdAt).toLocaleString("vi-VN", { dateStyle: "long", timeStyle: "short" })
    : "—";

  return (
    <ClientLayout>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>

        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex w-fit items-center gap-2 rounded-lg border border-cyan-400/30 px-4 py-2 text-cyan-400 transition hover:bg-cyan-400/10"
        >
          <span className="material-symbols-outlined text-[18px]">
            arrow_back
          </span>
          Back
        </button>

        {/* Amount hero */}
        <div style={{ ...cardStyle, marginBottom: 20, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: typeCfg.color + "15", border: `1px solid ${typeCfg.color}40`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 26, color: typeCfg.color }}>{typeCfg.icon}</span>
          </div>

          <p style={{ fontSize: 13, color: "#8c90a0", margin: "0 0 6px" }}>{typeCfg.label}</p>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 34, fontWeight: 700, color: isExpense ? "#ffb4ab" : "#34d399", margin: "0 0 16px" }}>
            {isExpense ? "-" : "+"}{Math.abs(amount).toLocaleString()}₫
          </p>

          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.05em", background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{statusCfg.icon}</span>
            {statusKey || "—"}
          </span>
        </div>

        {/* Details */}
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 20, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            Transaction Details
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <span style={sectionLabel}>Project Name</span>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, color: "#e1e2eb", textAlign: "right" }}>{transaction.projectTitle || "—"}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <span style={sectionLabel}>Type</span>
              <span style={{ fontSize: 14, color: "#e1e2eb", textAlign: "right" }}>{type || "—"}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <span style={sectionLabel}>Description</span>
              <span style={{ fontSize: 14, color: "#c2c6d6", textAlign: "right", maxWidth: 380 }}>{transaction.description || "—"}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <span style={sectionLabel}>Date & Time</span>
              <span style={{ fontSize: 14, color: "#c2c6d6", textAlign: "right" }}>{createdAt}</span>
            </div>

            {transaction.referenceId && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                <span style={sectionLabel}>Reference</span>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: "#8c90a0", textAlign: "right" }}>{transaction.referenceId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Related links — chỉ hiện Project và Milestone, không hiện Escrow */}
        {(transaction.projectId || projectMilestones.length > 0) && (
          <div style={cardStyle}>
            <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 20, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              Related Records
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {transaction.projectId && (
                <button onClick={() => navigate(`/client/projects/${transaction.projectId}`)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "rgba(0,240,255,0.04)", border: "1px solid rgba(0,240,255,0.18)", borderRadius: 10, cursor: "pointer", textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#00F0FF" }}>folder</span>
                    <span style={{ fontSize: 14, color: "#e1e2eb" }}>Project #{transaction.projectId}</span>
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#00F0FF" }}>chevron_right</span>
                </button>
              )}

              {projectMilestones.map((m) => {
                const mid = m.milestoneId ?? m.id;
                const isCurrentTransactionMilestone =
                  String(mid) === String(transaction.milestoneId);

                const content = (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: 18,
                          color: isCurrentTransactionMilestone ? "#c0c1ff" : "#8c90a0",
                        }}
                      >
                        {isCurrentTransactionMilestone ? "flag" : "lock"}
                      </span>

                      <span
                        style={{
                          fontSize: 14,
                          color: isCurrentTransactionMilestone ? "#e1e2eb" : "#8c90a0",
                        }}
                      >
                        {m.title || m.milestoneTitle || `Milestone #${mid}`}
                      </span>
                    </div>

                    {isCurrentTransactionMilestone && (
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 18, color: "#c0c1ff" }}
                      >
                        chevron_right
                      </span>
                    )}
                  </>
                );

                if (!isCurrentTransactionMilestone) {
                  return (
                    <div
                      key={mid}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 16px",
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 10,
                        cursor: "not-allowed",
                        opacity: 0.65,
                      }}
                    >
                      {content}
                    </div>
                  );
                }

                return (
                  <button
                    key={mid}
                    onClick={() => navigate(`/client/milestones/${mid}/deliverables`)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 16px",
                      background: "rgba(192,193,255,0.04)",
                      border: "1px solid rgba(192,193,255,0.18)",
                      borderRadius: 10,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </ClientLayout>
  );
}