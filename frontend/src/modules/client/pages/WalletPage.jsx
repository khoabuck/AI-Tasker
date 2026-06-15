// src/modules/client/pages/WalletPage.jsx
import { useState, useEffect } from "react";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";

// ── Withdraw Modal ────────────────────────────────────────────────────
function WithdrawModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ amount: "", bankName: "", bankAccountNumber: "", bankAccountHolder: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (fieldErrors[e.target.name]) setFieldErrors((prev) => ({ ...prev, [e.target.name]: null }));
    setError("");
  };

  const validate = () => {
    const errors = {};
    if (!form.amount || Number(form.amount) <= 0) errors.amount = "The amount must be greater than 0.";
    if (!form.bankName.trim()) errors.bankName = "The bank name cannot be empty.";
    if (!form.bankAccountNumber.trim()) errors.bankAccountNumber = "The bank account number cannot be empty.";
    else if (!/^\d{6,20}$/.test(form.bankAccountNumber.trim())) errors.bankAccountNumber = "The bank account number is invalid (6-20 digits).";
    if (!form.bankAccountHolder.trim()) errors.bankAccountHolder = "The account holder name cannot be empty.";
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setLoading(true); setError("");
    try {
      await axiosInstance.post("/withdrawals", {
        amount: Number(form.amount),
        bankName: form.bankName,
        bankAccountNumber: form.bankAccountNumber,
        bankAccountHolder: form.bankAccountHolder,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to withdraw funds. Please try again.");
    } finally { setLoading(false); }
  };

  const inputStyle = (field) => ({
    width: "100%", background: "#1d2026",
    border: `1px solid ${fieldErrors[field] ? "#ef4444" : "rgba(255,255,255,0.12)"}`,
    borderRadius: 8, padding: "11px 14px", color: "#e1e2eb", outline: "none",
    fontFamily: "Inter, sans-serif", fontSize: 14, boxSizing: "border-box",
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "rgba(16,19,25,0.98)", border: "1px solid rgba(0,240,255,0.2)", borderRadius: 16, padding: 32, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 20, fontWeight: 700, color: "#e1e2eb", margin: 0 }}>Rút tiền</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8c90a0", cursor: "pointer" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: fieldErrors.amount ? "#f87171" : "#8c90a0", marginBottom: 6 }}>Số tiền (USD)</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#00F0FF", fontWeight: 700 }}>$</span>
              <input type="number" name="amount" value={form.amount} onChange={handleChange} placeholder="100"
                style={{ ...inputStyle("amount"), paddingLeft: 28 }} />
            </div>
            {fieldErrors.amount && <p style={{ fontSize: 12, color: "#f87171", marginTop: 4 }}>{fieldErrors.amount}</p>}
          </div>

          <div>
            <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: fieldErrors.bankName ? "#f87171" : "#8c90a0", marginBottom: 6 }}>Tên ngân hàng</label>
            <input type="text" name="bankName" value={form.bankName} onChange={handleChange} placeholder="Vietcombank, Techcombank..."
              style={inputStyle("bankName")} />
            {fieldErrors.bankName && <p style={{ fontSize: 12, color: "#f87171", marginTop: 4 }}>{fieldErrors.bankName}</p>}
          </div>

          <div>
            <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: fieldErrors.bankAccountNumber ? "#f87171" : "#8c90a0", marginBottom: 6 }}>Số tài khoản</label>
            <input type="text" name="bankAccountNumber" value={form.bankAccountNumber} onChange={handleChange} placeholder="0123456789"
              style={inputStyle("bankAccountNumber")} />
            {fieldErrors.bankAccountNumber && <p style={{ fontSize: 12, color: "#f87171", marginTop: 4 }}>{fieldErrors.bankAccountNumber}</p>}
          </div>

          <div>
            <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: fieldErrors.bankAccountHolder ? "#f87171" : "#8c90a0", marginBottom: 6 }}>Tên chủ tài khoản</label>
            <input type="text" name="bankAccountHolder" value={form.bankAccountHolder} onChange={handleChange} placeholder="NGUYEN VAN A"
              style={inputStyle("bankAccountHolder")} />
            {fieldErrors.bankAccountHolder && <p style={{ fontSize: 12, color: "#f87171", marginTop: 4 }}>{fieldErrors.bankAccountHolder}</p>}
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13 }}>{error}</div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "transparent", color: "#c2c6d6", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Hủy</button>
            <button onClick={handleSubmit} disabled={loading}
              style={{ flex: 2, padding: "12px", background: loading ? "#1d2026" : "#00F0FF", color: loading ? "#8c90a0" : "#002022", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {loading && <span className="material-symbols-outlined" style={{ fontSize: 16, animation: "spin 1s linear infinite" }}>autorenew</span>}
              {loading ? "Đang xử lý..." : "Xác nhận rút tiền"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Deposit Modal ─────────────────────────────────────────────────────
function DepositModal({ onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) { setError("The amount must be greater than 0."); return; }
    setLoading(true); setError("");
    try {
      await axiosInstance.post("/wallets/deposit", null, {
        params: { amount: Number(amount), transactionRef: transactionRef.trim() || undefined },
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Deposit failed. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "rgba(16,19,25,0.98)", border: "1px solid rgba(0,240,255,0.2)", borderRadius: 16, padding: 32, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 20, fontWeight: 700, color: "#e1e2eb", margin: 0 }}>Nạp tiền</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8c90a0", cursor: "pointer" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", marginBottom: 6 }}>Số tiền (USD)</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#00F0FF", fontWeight: 700 }}>$</span>
              <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} placeholder="100"
                style={{ width: "100%", background: "#1d2026", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "11px 14px 11px 28px", color: "#e1e2eb", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 14, boxSizing: "border-box" }} />
            </div>
          </div>

          {/* Quick amounts */}
          <div style={{ display: "flex", gap: 8 }}>
            {[100, 500, 1000, 5000].map((a) => (
              <button key={a} onClick={() => setAmount(String(a))}
                style={{ flex: 1, padding: "8px", background: amount == a ? "rgba(0,240,255,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${amount == a ? "rgba(0,240,255,0.4)" : "rgba(255,255,255,0.1)"}`, borderRadius: 8, color: amount == a ? "#00F0FF" : "#8c90a0", fontSize: 12, cursor: "pointer", fontFamily: "JetBrains Mono, monospace" }}>
                ${a}
              </button>
            ))}
          </div>

          <div>
            <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", marginBottom: 6 }}>Transaction Ref (tuỳ chọn)</label>
            <input type="text" value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} placeholder="Mã giao dịch ngân hàng..."
              style={{ width: "100%", background: "#1d2026", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "11px 14px", color: "#e1e2eb", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 14, boxSizing: "border-box" }} />
          </div>

          {error && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13 }}>{error}</div>}

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "transparent", color: "#c2c6d6", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Hủy</button>
            <button onClick={handleSubmit} disabled={loading}
              style={{ flex: 2, padding: "12px", background: loading ? "#1d2026" : "linear-gradient(90deg, #1772eb, #00F0FF)", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {loading && <span className="material-symbols-outlined" style={{ fontSize: 16, animation: "spin 1s linear infinite" }}>autorenew</span>}
              {loading ? "Đang xử lý..." : "Nạp tiền"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    COMPLETED: { bg: "rgba(74,222,128,0.1)", color: "#4ade80" },
    PENDING:   { bg: "rgba(250,204,21,0.1)", color: "#facc15" },
    FAILED:    { bg: "rgba(248,113,113,0.1)", color: "#f87171" },
    APPROVED:  { bg: "rgba(74,222,128,0.1)", color: "#4ade80" },
    REJECTED:  { bg: "rgba(248,113,113,0.1)", color: "#f87171" },
  };
  const cfg = map[status?.toUpperCase()] || { bg: "rgba(140,144,160,0.1)", color: "#8c90a0" };
  return (
    <span style={{ padding: "3px 8px", borderRadius: 4, background: cfg.bg, color: cfg.color, fontSize: 10, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase" }}>
      {status}
    </span>
  );
}

export default function WalletPage() {
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchAll = async () => {
  setLoading(true);
  try {
    const [balRes, txRes, wdRes] = await Promise.all([
      axiosInstance.get("/wallets/balance"),
      axiosInstance.get("/transactions/me"),
      axiosInstance.get("/withdrawals/me"),
    ]);

    console.log("BALANCE API:", balRes.data);

    const balRaw = balRes.data;

    setBalance({
      availableBalance:
        balRaw?.availableBalance ??
        balRaw?.available ??
        balRaw?.balance ??
        balRaw?.walletBalance ??
        balRaw?.amount ??
        (typeof balRaw === "number" ? balRaw : 0),

      escrowBalance:
        balRaw?.escrowBalance ??
        balRaw?.escrow ??
        0,

      totalDeposited:
        balRaw?.totalDeposited ??
        balRaw?.deposited ??
        0,

      totalWithdrawn:
        balRaw?.totalWithdrawn ??
        balRaw?.withdrawn ??
        balRaw?.totalSpent ??
        0,
    });

    const txRaw = txRes.data;
    setTransactions(Array.isArray(txRaw) ? txRaw : txRaw.items ?? txRaw.data ?? []);

    const wdRaw = wdRes.data;
    setWithdrawals(Array.isArray(wdRaw) ? wdRaw : wdRaw.items ?? wdRaw.data ?? []);
  } catch (err) {
    console.error("Wallet fetch error:", err);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => { fetchAll(); }, []);

  const showSuccess = async (msg) => {
  await fetchAll();
  setSuccessMsg(msg);
  setTimeout(() => setSuccessMsg(""), 4000);
};

  const metrics = balance ? [
    { label: "Available Balance", value: `$${(balance.availableBalance ?? balance.available ?? 0).toLocaleString()}`, icon: "account_balance_wallet", iconColor: "#00F0FF", iconBg: "rgba(0,240,255,0.1)" },
    { label: "Escrow Balance",    value: `$${(balance.escrowBalance ?? balance.escrow ?? 0).toLocaleString()}`,    icon: "lock_clock",              iconColor: "#c0c1ff", iconBg: "rgba(98,101,240,0.1)" },
    { label: "Total Deposited",   value: `$${(balance.totalDeposited ?? 0).toLocaleString()}`,                      icon: "input",                   iconColor: "#adc6ff", iconBg: "rgba(23,114,235,0.1)" },
    { label: "Total Withdrawn",   value: `$${(balance.totalWithdrawn ?? balance.totalSpent ?? 0).toLocaleString()}`,icon: "output",                  iconColor: "#ffb4ab", iconBg: "rgba(147,0,10,0.1)"  },
  ] : [];

  return (
    <ClientLayout>
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "48px" }}>

        {/* Success banner */}
        {successMsg && (
          <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 10, padding: "12px 20px", marginBottom: 24, color: "#22c55e", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
            {successMsg}
          </div>
        )}

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h2 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 32, fontWeight: 700, color: "#e1e2eb", marginBottom: 6 }}>Wallet</h2>
            <p style={{ color: "#8c90a0", fontSize: 15 }}>Quản lý số dư và lịch sử giao dịch.</p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setShowDeposit(true)}
              style={{ padding: "14px 28px", background: "linear-gradient(90deg, #1772eb, #00F0FF)", color: "#fff", fontWeight: 700, borderRadius: 12, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontFamily: "Hanken Grotesk, sans-serif", boxShadow: "0 0 20px rgba(0,240,255,0.2)" }}>
              <span className="material-symbols-outlined">add_card</span>
              Nạp tiền
            </button>
            <button onClick={() => setShowWithdraw(true)}
              style={{ padding: "14px 28px", background: "transparent", color: "#00F0FF", fontWeight: 700, borderRadius: 12, border: "2px solid rgba(0,240,255,0.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontFamily: "Hanken Grotesk, sans-serif", transition: "background 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,240,255,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <span className="material-symbols-outlined">outbox</span>
              Rút tiền
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#8c90a0" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 16, animation: "spin 1s linear infinite", color: "#00F0FF" }}>autorenew</span>
            Đang tải dữ liệu...
          </div>
        )}

        {!loading && (
          <>
            {/* Balance Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginBottom: 32 }}>
              {metrics.map((m) => (
                <div key={m.label} style={{ background: "rgba(29,32,38,0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 24 }}>
                  <div style={{ padding: 12, background: m.iconBg, borderRadius: 12, color: m.iconColor, display: "inline-flex", marginBottom: 16 }}>
                    <span className="material-symbols-outlined">{m.icon}</span>
                  </div>
                  <p style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.12em", color: "#8c90a0", marginBottom: 6 }}>{m.label}</p>
                  <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 26, fontWeight: 700, color: "#fff" }}>{m.value}</h3>
                </div>
              ))}
            </div>

            {/* Lower section */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>

              {/* Transactions */}
              <div style={{ background: "rgba(29,32,38,0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <h4 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 18, fontWeight: 700, color: "#e1e2eb", margin: 0 }}>Lịch sử giao dịch</h4>
                </div>
                {transactions.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px 0", color: "#8c90a0" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 12, color: "#272a30" }}>receipt_long</span>
                    Chưa có giao dịch nào.
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "rgba(35,42,53,0.5)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                        {["Loại", "Mô tả", "Ngày", "Số tiền", "Status"].map((h) => (
                          <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 10, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.slice(0, 10).map((tx, i) => {
                        const amount = tx.amount ?? tx.proposedPrice ?? 0;
                        const isCredit = amount > 0;
                        const date = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString("vi-VN") : "—";
                        return (
                          <tr key={tx.transactionId ?? tx.id ?? i}
                            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", transition: "background 0.2s" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                            <td style={{ padding: "14px 20px", fontSize: 13, color: "#c2c6d6" }}>{tx.type ?? tx.transactionType ?? "—"}</td>
                            <td style={{ padding: "14px 20px", fontSize: 13, color: "#e1e2eb", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.description ?? tx.note ?? "—"}</td>
                            <td style={{ padding: "14px 20px", fontSize: 13, color: "#8c90a0" }}>{date}</td>
                            <td style={{ padding: "14px 20px", fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: isCredit ? "#00F0FF" : "#e1e2eb" }}>
                              {isCredit ? "+" : ""}${Math.abs(amount).toLocaleString()}
                            </td>
                            <td style={{ padding: "14px 20px" }}><StatusBadge status={tx.status} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Withdrawal History */}
              <div style={{ background: "rgba(29,32,38,0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <h4 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 18, fontWeight: 700, color: "#e1e2eb", margin: 0 }}>Lịch sử rút tiền</h4>
                </div>
                {withdrawals.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px 24px", color: "#8c90a0" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 12, color: "#272a30" }}>outbox</span>
                    Chưa có yêu cầu rút tiền.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {withdrawals.slice(0, 8).map((wd, i) => {
                      const date = wd.createdAt ? new Date(wd.createdAt).toLocaleDateString("vi-VN") : "—";
                      return (
                        <div key={wd.withdrawalId ?? wd.id ?? i}
                          style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "background 0.2s" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                          <div>
                            <p style={{ fontSize: 13, color: "#e1e2eb", margin: "0 0 2px", fontWeight: 600 }}>${(wd.amount ?? 0).toLocaleString()}</p>
                            <p style={{ fontSize: 11, color: "#8c90a0", margin: 0 }}>{wd.bankName} • {date}</p>
                          </div>
                          <StatusBadge status={wd.status} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </>
        )}
      </div>

      {showDeposit && <DepositModal onClose={() => setShowDeposit(false)} onSuccess={() => showSuccess("Nạp tiền thành công!")} />}
      {showWithdraw && <WithdrawModal onClose={() => setShowWithdraw(false)} onSuccess={() => showSuccess("Yêu cầu rút tiền đã được gửi!")} />}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </ClientLayout>
  );
}