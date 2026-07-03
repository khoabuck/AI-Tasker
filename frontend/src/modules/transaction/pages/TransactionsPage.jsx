// src/modules/client/pages/TransactionsPage.jsx
// Transactions page — Finance > Transactions

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
  const [dateRange, setDateRange] = useState("30_DAYS");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dateOpen, setDateOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [rowsOpen, setRowsOpen] = useState(false);

  const DATE_OPTIONS = [
    { label: "Today", value: "TODAY" },
    { label: "Last 7 Days", value: "7_DAYS" },
    { label: "Last 30 Days", value: "30_DAYS" },
    { label: "Last 1 Year", value: "1_YEAR" },
    { label: "All Time", value: "ALL" },
  ];

  const TYPE_OPTIONS = [
    "All",
    "DEPOSIT",
    "ESCROW_LOCK",
    "ESCROW_RELEASE",
    "PLATFORM_FEE",
    "WITHDRAWAL",
  ];

  const STATUS_OPTIONS = [
    "All",
    "SUCCESS",
    "PENDING",
    "FAILED",
    "PAID",
  ];

const ROW_OPTIONS = [5, 10, 20, 50];

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      setError("");

      try {
        const list = await transactionService.getMyTransactions();

        setTransactions(list);
      } catch (err) {
        console.error(err);
        setError(
          err?.response?.data?.message ||
          "Unable to load transaction history."
        );
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
      "JOB_CREDIT_PACKAGE_PURCHASE",
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
      return "Deposit to wallet";
    }

    return tx.description ?? "—";
  };

  const formatTxDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDateRangeStart = () => {
    const now = new Date();
    const start = new Date(now);

    switch (dateRange) {
      case "TODAY":
        start.setHours(0, 0, 0, 0);
        return start;

      case "7_DAYS":
        start.setDate(now.getDate() - 7);
        return start;

      case "30_DAYS":
        start.setDate(now.getDate() - 30);
        return start;

      case "1_YEAR":
        start.setFullYear(now.getFullYear() - 1);
        return start;

      case "ALL":
      default:
        return null;
    }
  };

  const filtered = useMemo(() => {
  const startDate = getDateRangeStart();
  const now = new Date();

  return transactions.filter((tx) => {
    const type = getTxType(tx);
    const status = (tx.status ?? "").toUpperCase();

    const txDate = tx.createdAt ? new Date(tx.createdAt) : null;

    const matchDate =
      !startDate || (txDate && txDate >= startDate && txDate <= now);

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

    return (
      matchDate &&
      matchType &&
      matchStatus &&
      matchProject &&
      matchMilestone &&
      matchTransaction
    );
  });
}, [
  transactions,
  filterType,
  filterStatus,
  dateRange,
  selectedProjectId,
  selectedMilestoneId,
  selectedTransactionId,
]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

const paginatedTransactions = filtered.slice(
  (page - 1) * pageSize,
  page * pageSize
);

useEffect(() => {
  setPage(1);
}, [
  filterType,
  filterStatus,
  dateRange,
  pageSize,
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
          className="mb-6 flex w-fit items-center gap-2 rounded-lg border border-cyan-400/25 px-4 py-2 text-cyan-400 transition hover:bg-cyan-400/8"
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
          
        </div>

        
        {/* Filters */}
        <div className="relative z-[100] mb-6 flex flex-wrap items-center gap-2.5 rounded-2xl border border-white/[0.06] bg-[#0d1017]/70 p-3 backdrop-blur-2xl">

          {/* Date */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setDateOpen(!dateOpen);
                setTypeOpen(false);
                setStatusOpen(false);
                setRowsOpen(false);
              }}
              className={`group flex min-w-[180px] items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm transition-all duration-200 ${
                dateOpen
                  ? "bg-cyan-400/[0.08] text-cyan-300 ring-1 ring-inset ring-cyan-400/50"
                  : "bg-white/[0.03] text-slate-300 ring-1 ring-inset ring-white/[0.06] hover:bg-white/[0.05] hover:ring-white/[0.12]"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-[16px] ${dateOpen ? "text-cyan-300" : "text-slate-500 group-hover:text-slate-400"}`}>
                  calendar_month
                </span>
                <span className="font-medium">{DATE_OPTIONS.find((item) => item.value === dateRange)?.label}</span>
              </span>
              <span className={`material-symbols-outlined text-[16px] text-slate-500 transition-transform duration-200 ${dateOpen ? "rotate-180 text-cyan-300" : ""}`}>
                expand_more
              </span>
            </button>

            {dateOpen && (
              <div className="scrollbar-none absolute left-0 top-[calc(100%+8px)] z-[9999] max-h-[132px] w-full overflow-y-auto rounded-xl bg-[#0a0d13] p-1 shadow-[0_16px_40px_rgba(0,0,0,0.6)] ring-1 ring-inset ring-cyan-400/20">
                {DATE_OPTIONS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setDateRange(item.value);
                      setPage(1);
                      setDateOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
                      dateRange === item.value
                        ? "bg-cyan-400/10 text-cyan-300"
                        : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    {dateRange === item.value && <span className="h-1 w-1 rounded-full bg-cyan-300" />}
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Type */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setTypeOpen(!typeOpen);
                setDateOpen(false);
                setStatusOpen(false);
                setRowsOpen(false);
              }}
              className={`flex min-w-[200px] items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm transition-all duration-200 ${
                typeOpen
                  ? "bg-cyan-400/[0.08] text-cyan-300 ring-1 ring-inset ring-cyan-400/50"
                  : "bg-white/[0.03] text-slate-300 ring-1 ring-inset ring-white/[0.06] hover:bg-white/[0.05] hover:ring-white/[0.12]"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className="text-slate-500">Type</span>
                <span className="font-medium">{filterType}</span>
              </span>
              <span className={`material-symbols-outlined text-[16px] text-slate-500 transition-transform duration-200 ${typeOpen ? "rotate-180 text-cyan-300" : ""}`}>
                expand_more
              </span>
            </button>

            {typeOpen && (
              <div className="scrollbar-none absolute left-0 top-[calc(100%+8px)] z-[9999] max-h-[132px] w-full overflow-y-auto rounded-xl bg-[#0a0d13] p-1 shadow-[0_16px_40px_rgba(0,0,0,0.6)] ring-1 ring-inset ring-cyan-400/20">
                {TYPE_OPTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setFilterType(item);
                      setPage(1);
                      setTypeOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
                      filterType === item
                        ? "bg-cyan-400/10 text-cyan-300"
                        : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    {filterType === item && <span className="h-1 w-1 rounded-full bg-cyan-300" />}
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setStatusOpen(!statusOpen);
                setDateOpen(false);
                setTypeOpen(false);
                setRowsOpen(false);
              }}
              className={`flex min-w-[160px] items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm transition-all duration-200 ${
                statusOpen
                  ? "bg-cyan-400/[0.08] text-cyan-300 ring-1 ring-inset ring-cyan-400/50"
                  : "bg-white/[0.03] text-slate-300 ring-1 ring-inset ring-white/[0.06] hover:bg-white/[0.05] hover:ring-white/[0.12]"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className="text-slate-500">Status</span>
                <span className="font-medium">{filterStatus}</span>
              </span>
              <span className={`material-symbols-outlined text-[16px] text-slate-500 transition-transform duration-200 ${statusOpen ? "rotate-180 text-cyan-300" : ""}`}>
                expand_more
              </span>
            </button>

            {statusOpen && (
              <div className="scrollbar-none absolute left-0 top-[calc(100%+8px)] z-[9999] max-h-[132px] w-full overflow-y-auto rounded-xl bg-[#0a0d13] p-1 shadow-[0_16px_40px_rgba(0,0,0,0.6)] ring-1 ring-inset ring-cyan-400/20">
                {STATUS_OPTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setFilterStatus(item);
                      setPage(1);
                      setStatusOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
                      filterStatus === item
                        ? "bg-cyan-400/10 text-cyan-300"
                        : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    {filterStatus === item && <span className="h-1 w-1 rounded-full bg-cyan-300" />}
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rows */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setRowsOpen(!rowsOpen);
                setDateOpen(false);
                setTypeOpen(false);
                setStatusOpen(false);
              }}
              className={`flex min-w-[110px] items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm transition-all duration-200 ${
                rowsOpen
                  ? "bg-cyan-400/[0.08] text-cyan-300 ring-1 ring-inset ring-cyan-400/50"
                  : "bg-white/[0.03] text-slate-300 ring-1 ring-inset ring-white/[0.06] hover:bg-white/[0.05] hover:ring-white/[0.12]"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className="text-slate-500">Rows</span>
                <span className="font-medium">{pageSize}</span>
              </span>
              <span className={`material-symbols-outlined text-[16px] text-slate-500 transition-transform duration-200 ${rowsOpen ? "rotate-180 text-cyan-300" : ""}`}>
                expand_more
              </span>
            </button>

            {rowsOpen && (
              <div className="scrollbar-none absolute left-0 top-[calc(100%+8px)] z-[9999] max-h-[132px] w-full overflow-y-auto rounded-xl bg-[#0a0d13] p-1 shadow-[0_16px_40px_rgba(0,0,0,0.6)] ring-1 ring-inset ring-cyan-400/20">
                {ROW_OPTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setPageSize(item);
                      setPage(1);
                      setRowsOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
                      pageSize === item
                        ? "bg-cyan-400/10 text-cyan-300"
                        : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    {pageSize === item && <span className="h-1 w-1 rounded-full bg-cyan-300" />}
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mx-1 h-6 w-px bg-white/[0.08]" />

          <button onClick={() => {
            setFilterType("All");
            setFilterStatus("All");
            setDateRange("30_DAYS");
            setPage(1);
          }}
            className="rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-wider text-slate-500 transition-colors duration-200 hover:text-cyan-300">
            Clear
          </button>
        </div>

        {/* Table */}
        <div style={{ background: "rgba(29,32,38,0.4)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>

          {/* Table Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2.4fr 3fr 1.5fr 1.5fr 1fr", padding: "14px 24px", background: "rgba(29,32,38,0.3)", borderBottom: "1px solid rgba(255,255,255,0.1)", columnGap: 20 }}>
            {["Date", "Type", "Project Name", "Amount", "Status", "Action"].map((h, i) => (
              <div key={h} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8c90a0", textAlign: i >= 3 ? "right" : "left" }}>{h}</div>
            ))}
          </div>

          {/* Table Body */}
          <div
              className="
                overflow-y-auto
                pr-1
                [scrollbar-width:thin]
                [scrollbar-color:rgba(0,240,255,0.45)_transparent]
                [&::-webkit-scrollbar]:w-1.5
                [&::-webkit-scrollbar-track]:bg-transparent
                [&::-webkit-scrollbar-thumb]:rounded-full
                [&::-webkit-scrollbar-thumb]:bg-cyan-400/35
                hover:[&::-webkit-scrollbar-thumb]:bg-cyan-400/65
              "
              style={{ maxHeight: "55vh" }}
            >
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
            ) : paginatedTransactions.map((tx) => {
              const statusKey = (tx.status ?? "").toUpperCase();
              const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.PENDING;

              return (
                <div key={tx.transactionId ?? tx.id}
                  style={{ display: "grid", gridTemplateColumns: "1fr 2.4fr 3fr 1.5fr 1.5fr 1fr", columnGap: 20, padding: "18px 24px", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>

                  {/* Date */}
                  <div className="text-[13px] text-[#8c90a0]">
                    {formatTxDate(tx.createdAt)}
                  </div>

                  {/* Type */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: isExpenseTx(tx) ? "rgba(248,113,113,0.1)" : "rgba(52,211,153,0.1)", color: isExpenseTx(tx) ? "#f87171" : "#34d399", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                        {isExpenseTx(tx) ? "output" : "input"}
                      </span>
                    </div>
                    <span
                      className="min-w-0 truncate text-[13px] text-[#e1e2eb]"
                      title={getTxType(tx)}
                    >
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

        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 ${
              page === 1
                ? "cursor-not-allowed text-[#3d4050]"
                : "cursor-pointer text-[#8c90a0] hover:border-cyan-400/25 hover:text-cyan-400"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              chevron_left
            </span>
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-mono ${
                page === p
                  ? "border-transparent bg-cyan-400 text-[#002022]"
                  : "border-white/10 text-[#8c90a0] hover:border-cyan-400/25 hover:text-cyan-400"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() =>
              setPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={page === totalPages}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 ${
              page === totalPages
                ? "cursor-not-allowed text-[#3d4050]"
                : "cursor-pointer text-[#8c90a0] hover:border-cyan-400/25 hover:text-cyan-400"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              chevron_right
            </span>
          </button>
        </div>

      </div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .scrollbar-none { scrollbar-width: none; -ms-overflow-style: none; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
      `}</style>
    </ClientLayout>
  );
}