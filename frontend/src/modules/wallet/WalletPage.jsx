// src/modules/client/pages/WalletPage.jsx
//
// GET  /api/wallets/balance                              → số dư hiện tại
// GET  /api/transactions/me                               → lịch sử giao dịch
// POST /api/wallets/deposit-orders            {amount}    → tạo order PayOS, trả về QR + checkoutUrl
// GET  /api/wallets/deposit-orders/me                      → lịch sử các deposit order
// GET  /api/wallets/deposit-orders/{id}                    → poll trạng thái 1 order
// POST /api/wallets/deposit-orders/{id}/simulate-paid      → giả lập thanh toán (dev/test only)
//
// Withdraw vẫn dùng /withdrawals (giữ nguyên flow cũ, không có trong API list mới nhưng
// chưa thấy yêu cầu đổi — nếu BE đã đổi endpoint này, báo lại để sửa)
//
// FIX (so với bản cũ):
// 1) fetchAll() trước đây gọi walletService.getEscrows(selectedProjectId) với biến
//    `selectedProjectId` chưa từng được khai báo (không có useState) → ReferenceError,
//    làm Promise.all reject toàn bộ và trang không load được balance/transactions/deposit
//    dù các API đó hoạt động bình thường. Đã bỏ lời gọi này và dùng thẳng field
//    `lockedBalance` có sẵn trong response GET /api/wallets/me để tính Escrow.
// 2) isExpenseTx() trước đây liệt "ESCROW_RELEASE" vào nhóm chi tiêu (trừ tiền), nhưng
//    theo dữ liệu thật từ BE, ESCROW_RELEASE là tiền VÀO ví (amount dương, ví dụ +200₫
//    khi freelancer được release tiền milestone) → đã bỏ ESCROW_RELEASE ra khỏi danh sách.
// 3) metrics[] trước đây thiếu field icon/iconBg/iconColor khiến ô icon luôn trống →
//    đã bổ sung đầy đủ cho cả 3 ô Balance / Escrow / Withdrawable.

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ClientLayout from "../../components/layout/ClientLayout";
import { walletService } from "../../services/wallet.service";

// ── Deposit Modal (PayOS flow — production: poll status thật, không tự nạp tiền) ──
function DepositModal({ onClose, onSuccess, existingOrder }) {
  const [step, setStep] = useState(existingOrder ? "qr" : "input"); // input | qr | expired
  const [amount, setAmount] = useState("");
  const [order, setOrder] = useState(existingOrder || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Mở lại order cũ luôn vào step "qr" — không tự đoán hết hạn dựa vào giờ máy client,
  // chỉ dựa vào status thật trả về từ BE (EXPIRED/CANCELLED) qua polling bên dưới.

  // Poll trạng thái order mỗi 3s — chỉ coi là thành công khi BE tự cập nhật PAID
  // (BE cập nhật PAID khi nhận webhook thật từ PayOS sau khi user chuyển khoản)
  useEffect(() => {
    if (step !== "qr" || !order?.depositOrderId) return;

    const checkStatus = async () => {
      try {
        const res = await walletService.getDepositOrderById(order.depositOrderId);
        const latest = res.data?.data || res.data;

        if (latest?.status === "PAID") {
          onSuccess();
          onClose();
          return true; // dừng polling
        } else if (latest?.status === "EXPIRED" || latest?.status === "CANCELLED") {
          setStep("expired");
          return true; // dừng polling
        }
      } catch {
        // Bỏ qua lỗi tạm thời của 1 lần poll, thử lại lần sau
      }
      return false;
    };

    let stopped = false;
    checkStatus(); // kiểm tra ngay lập tức, không chờ 3s đầu

    const pollInterval = setInterval(async () => {
      if (stopped) return;
      const shouldStop = await checkStatus();
      if (shouldStop) { stopped = true; clearInterval(pollInterval); }
    }, 3000);

    return () => { stopped = true; clearInterval(pollInterval); };
  }, [step, order]);

  // Countdown tới expiresAt — chỉ để HIỂN THỊ, không tự quyết định hết hạn.
  // Việc hết hạn thật được xác nhận qua polling status ở trên (BE trả EXPIRED/CANCELLED).
  useEffect(() => {
    if (step !== "qr" || !order?.expiresAt) return;

    const updateCountdown = () => {
      const remain = Math.max(0, Math.floor((new Date(order.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(remain);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [step, order]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleCreateOrder = async () => {
    if (!amount || Number(amount) <= 0) { setError("The amount must be greater than 0."); return; }
    setLoading(true); setError("");
    try {
      const res = await walletService.createDepositOrder(amount);
      const orderData = res.data?.data || res.data;
      setOrder(orderData);
      setStep("qr");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create deposit order. Please try again.");
    } finally { setLoading(false); }
  };

  const handleCopyContent = () => {
    if (!order?.qrContent) return;
    navigator.clipboard.writeText(order.qrContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRetry = () => {
    setOrder(null);
    setStep("input");
    setError("");
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "rgba(16,19,25,0.98)", border: "1px solid rgba(0,240,255,0.2)", borderRadius: 16, padding: 32, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 20, fontWeight: 700, color: "#e1e2eb", margin: 0 }}>
            {step === "input" ? "Deposit" : step === "qr" ? "Scan QR to pay" : "Deposit request expired"}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8c90a0", cursor: "pointer" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        {step === "input" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", marginBottom: 6 }}>Amount (VND)</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#00F0FF", fontWeight: 700 }}>₫</span>
                <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} placeholder="20000"
                  style={{ width: "100%", background: "#1d2026", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "11px 14px 11px 28px", color: "#e1e2eb", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>

            {/* Quick amounts */}
            <div style={{ display: "flex", gap: 8 }}>
              {[20000, 50000, 100000, 500000].map((a) => (
                <button key={a} onClick={() => setAmount(String(a))}
                  style={{ flex: 1, padding: "8px", background: amount == a ? "rgba(0,240,255,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${amount == a ? "rgba(0,240,255,0.4)" : "rgba(255,255,255,0.1)"}`, borderRadius: 8, color: amount == a ? "#00F0FF" : "#8c90a0", fontSize: 12, cursor: "pointer", fontFamily: "JetBrains Mono, monospace" }}>
                  {a.toLocaleString()}₫
                </button>
              ))}
            </div>

            {error && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "transparent", color: "#c2c6d6", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleCreateOrder} disabled={loading}
                style={{ flex: 2, padding: "12px", background: loading ? "#1d2026" : "linear-gradient(90deg, #1772eb, #00F0FF)", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {loading && <span className="material-symbols-outlined" style={{ fontSize: 16, animation: "spin 1s linear infinite" }}>autorenew</span>}
                {loading ? "Creating..." : "Create Deposit Request"}
              </button>
            </div>
          </div>
        )}

        {step === "qr" && order && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
            <div style={{ background: "#fff", borderRadius: 12, padding: 16 }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(order.qrContent || "")}`}
                alt="QR payment"
                style={{ width: 220, height: 220, display: "block" }}
              />
            </div>

            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "#8c90a0", margin: "0 0 4px" }}>Số tiền</p>
              <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 700, color: "#00F0FF", margin: 0 }}>
                {Number(order.amount).toLocaleString()}₫
              </p>
            </div>

            <div style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#8c90a0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.orderCode}</span>
              <button onClick={handleCopyContent} style={{ background: "none", border: "none", color: "#00F0FF", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{copied ? "check" : "content_copy"}</span>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>


            {/* Trạng thái chờ — tự poll, KHÔNG có nút tự xác nhận */}
            <div style={{ width: "100%", background: "rgba(250,204,21,0.06)", border: "1px solid rgba(250,204,21,0.2)", borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, boxSizing: "border-box" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#facc15", animation: "spin 1.5s linear infinite" }}>autorenew</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, color: "#facc15", fontWeight: 600, margin: "0 0 2px" }}>Waiting for payment...</p>
                <p style={{ fontSize: 11, color: "#8c90a0", margin: 0 }}>
                  System will automatically confirm when payment is received.
                  {secondsLeft > 0 && ` The application expires after ${formatTime(secondsLeft)}`}
                </p>
              </div>
            </div>

            <button onClick={onClose} style={{ width: "100%", padding: "12px", background: "transparent", color: "#c2c6d6", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 14, cursor: "pointer", boxSizing: "border-box" }}>
              Close (continue waiting in background)
            </button>
          </div>
        )}

        {step === "expired" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", textAlign: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#f87171" }}>schedule</span>
            <p style={{ color: "#c2c6d6", fontSize: 14, margin: 0 }}>
              Your deposit order has expired or been cancelled. Please create a new order to continue.
            </p>
            <button onClick={handleRetry}
              style={{ width: "100%", padding: "12px", background: "linear-gradient(90deg, #1772eb, #00F0FF)", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Create a new order
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

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
      await walletService.createWithdrawal(form);
      onSuccess();
      onClose();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) {
        // API /withdrawals chưa được BE triển khai — báo rõ cho user thay vì
        // để lộ lỗi kỹ thuật "404 Not Found" khó hiểu.
        setError("The withdrawal feature is currently being upgraded. Please try again later.");
      } else {
        setError(err?.response?.data?.message || "Failed to withdraw funds. Please try again.");
      }
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
          <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 20, fontWeight: 700, color: "#e1e2eb", margin: 0 }}>Withdraw</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8c90a0", cursor: "pointer" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: fieldErrors.amount ? "#f87171" : "#8c90a0", marginBottom: 6 }}>Amount</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#00F0FF", fontWeight: 700 }}>₫</span>
              <input type="number" name="amount" value={form.amount} onChange={handleChange} placeholder="100000"
                style={{ ...inputStyle("amount"), paddingLeft: 28 }} />
            </div>
            {fieldErrors.amount && <p style={{ fontSize: 12, color: "#f87171", marginTop: 4 }}>{fieldErrors.amount}</p>}
          </div>

          <div>
            <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: fieldErrors.bankName ? "#f87171" : "#8c90a0", marginBottom: 6 }}>Bank Name</label>
            <input type="text" name="bankName" value={form.bankName} onChange={handleChange} placeholder="Vietcombank, Techcombank..."
              style={inputStyle("bankName")} />
            {fieldErrors.bankName && <p style={{ fontSize: 12, color: "#f87171", marginTop: 4 }}>{fieldErrors.bankName}</p>}
          </div>

          <div>
            <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: fieldErrors.bankAccountNumber ? "#f87171" : "#8c90a0", marginBottom: 6 }}>Account Number</label>
            <input type="text" name="bankAccountNumber" value={form.bankAccountNumber} onChange={handleChange} placeholder="0123456789"
              style={inputStyle("bankAccountNumber")} />
            {fieldErrors.bankAccountNumber && <p style={{ fontSize: 12, color: "#f87171", marginTop: 4 }}>{fieldErrors.bankAccountNumber}</p>}
          </div>

          <div>
            <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: fieldErrors.bankAccountHolder ? "#f87171" : "#8c90a0", marginBottom: 6 }}>Account Holder Name</label>
            <input type="text" name="bankAccountHolder" value={form.bankAccountHolder} onChange={handleChange} placeholder="NGUYEN VAN A"
              style={inputStyle("bankAccountHolder")} />
            {fieldErrors.bankAccountHolder && <p style={{ fontSize: 12, color: "#f87171", marginTop: 4 }}>{fieldErrors.bankAccountHolder}</p>}
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13 }}>{error}</div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "transparent", color: "#c2c6d6", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Cancel</button>
            <button onClick={handleSubmit} disabled={loading}
              style={{ flex: 2, padding: "12px", background: loading ? "#1d2026" : "#00F0FF", color: loading ? "#8c90a0" : "#002022", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {loading && <span className="material-symbols-outlined" style={{ fontSize: 16, animation: "spin 1s linear infinite" }}>autorenew</span>}
              {loading ? "Processing..." : "Confirm Withdrawal"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const getTxType = (tx) =>
  (tx.type ?? tx.transactionType ?? "").toUpperCase();

// FIX #2: bỏ "ESCROW_RELEASE" — đây là tiền VÀO ví (amount dương), không phải chi tiêu.
const isExpenseTx = (tx) => {
  return [
    "ESCROW_LOCK",
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

function StatusBadge({ status }) {
  const map = {
    COMPLETED: { bg: "rgba(74,222,128,0.1)", color: "#4ade80" },
    SUCCESS:   { bg: "rgba(74,222,128,0.1)", color: "#4ade80" },
    PAID:      { bg: "rgba(74,222,128,0.1)", color: "#4ade80" },
    PENDING:   { bg: "rgba(250,204,21,0.1)", color: "#facc15" },
    FAILED:    { bg: "rgba(248,113,113,0.1)", color: "#f87171" },
    EXPIRED:   { bg: "rgba(248,113,113,0.1)", color: "#f87171" },
    CANCELLED: { bg: "rgba(248,113,113,0.1)", color: "#f87171" },
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
  const navigate = useNavigate();
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [depositOrders, setDepositOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // FIX #1: bỏ walletService.getEscrows(selectedProjectId) — biến selectedProjectId
  // chưa từng được khai báo (ReferenceError), khiến Promise.all reject toàn bộ và
  // balance/transactions/depositOrders không bao giờ được set dù các API đó vẫn
  // trả 200 OK bình thường. Escrow giờ lấy trực tiếp từ balance.lockedBalance
  // (đã có sẵn trong response GET /api/wallets/me).
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [wallet, tx, deposit] = await Promise.all([
        walletService.getWallet(),
        walletService.getTransactions(),
        walletService.getDepositOrders(),
      ]);

      setBalance(wallet);
      setTransactions(tx);
      setDepositOrders(deposit);
    } catch (err) {
      console.error(err);
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

  // FIX #3: bổ sung icon/iconBg/iconColor cho từng ô để icon hiển thị đúng thay vì trống.
  const metrics = balance
    ? [
        {
          label: "Balance",
          value: `${balance.availableBalance.toLocaleString()}₫`,
          icon: "account_balance_wallet",
          iconBg: "rgba(0,240,255,0.1)",
          iconColor: "#00F0FF",
        },
        {
          label: "Escrow",
          value: `${balance.lockedBalance.toLocaleString()}₫`,
          icon: "lock",
          iconBg: "rgba(250,204,21,0.1)",
          iconColor: "#facc15",
        },
        {
          label: "Withdrawable",
          value: `${(balance.availableBalance - balance.lockedBalance).toLocaleString()}₫`,
          icon: "outbox",
          iconBg: "rgba(74,222,128,0.1)",
          iconColor: "#4ade80",
        },
      ]
    : [];

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
        <div style={{ marginBottom: 32 }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 flex w-fit items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-cyan-400/50 hover:text-cyan-400"
        >
          <span className="material-symbols-outlined text-[18px]">
            arrow_back
          </span>
          Back
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h2 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 32, fontWeight: 700, color: "#e1e2eb", marginBottom: 6 }}>Wallet</h2>
            <p style={{ color: "#8c90a0", fontSize: 15 }}>Manage your balance and transaction history.</p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setShowDeposit(true)}
              style={{ padding: "14px 28px", background: "linear-gradient(90deg, #1772eb, #00F0FF)", color: "#fff", fontWeight: 700, borderRadius: 12, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontFamily: "Hanken Grotesk, sans-serif", boxShadow: "0 0 20px rgba(0,240,255,0.2)" }}>
              <span className="material-symbols-outlined">add_card</span>
              Deposit
            </button>
            <button onClick={() => setShowWithdraw(true)}
              style={{ padding: "14px 28px", background: "transparent", color: "#00F0FF", fontWeight: 700, borderRadius: 12, border: "2px solid rgba(0,240,255,0.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontFamily: "Hanken Grotesk, sans-serif", transition: "background 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,240,255,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <span className="material-symbols-outlined">outbox</span>
              Withdraw
            </button>
          </div>
        </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#8c90a0" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 16, animation: "spin 1s linear infinite", color: "#00F0FF" }}>autorenew</span>
            Loading data...
          </div>
        )}

        {!loading && (
          <>
            {/* Balance Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 24,
                marginBottom: 32,
              }}
            >
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
                <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 18, fontWeight: 700, color: "#e1e2eb", margin: 0 }}>Transaction History</h4>
                  <button onClick={() => navigate("/client/transactions")}
                    style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "#00F0FF", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    View All
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
                  </button>
                </div>
                {transactions.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px 0", color: "#8c90a0" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 12, color: "#272a30" }}>receipt_long</span>
                    No transactions have been made yet.
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "rgba(35,42,53,0.5)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                        {["Type", "Description", "Date", "Amount", "Status"].map((h) => (
                          <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 10, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.slice(0, 10).map((tx, i) => {
                        const date = tx.createdAt
                          ? new Date(tx.createdAt).toLocaleDateString("vi-VN")
                          : "—";
                        return (
                          <tr key={tx.transactionId ?? i}
                            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", transition: "background 0.2s", cursor: "pointer" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                            <td style={{ padding: "14px 20px", fontSize: 13, color: "#c2c6d6" }}>{tx.type ?? "—"}</td>
                            <td style={{ padding: "14px 20px", fontSize: 13, color: "#e1e2eb", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.description ?? "—"}</td>
                            <td style={{ padding: "14px 20px", fontSize: 13, color: "#8c90a0" }}>{date}</td>
                            <td style={{ padding: "14px 20px", fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: isExpenseTx(tx) ? "#ffb4ab" : "#00F0FF" }}>
                              {getTxAmountText(tx)}
                            </td>
                            <td style={{ padding: "14px 20px" }}><StatusBadge status={tx.status} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Deposit Order History */}
              <div style={{ background: "rgba(29,32,38,0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <h4 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 18, fontWeight: 700, color: "#e1e2eb", margin: 0 }}>Deposit History</h4>
                </div>
                {depositOrders.filter((o) => o.status !== "EXPIRED" && o.status !== "CANCELLED").length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px 24px", color: "#8c90a0" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 12, color: "#272a30" }}>add_card</span>
                    No deposit orders yet.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {depositOrders
                      .filter((o) => o.status !== "EXPIRED" && o.status !== "CANCELLED")
                      .slice(0, 8)
                      .map((order, i) => {
                      const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString("vi-VN") : "—";
                      const isPending = order.status === "PENDING";
                      return (
                        <div key={order.depositOrderId ?? i}
                          onClick={() => isPending && setSelectedOrder(order)}
                          style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "background 0.2s", cursor: isPending ? "pointer" : "default" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                          <div>
                            <p style={{ fontSize: 13, color: "#e1e2eb", margin: "0 0 2px", fontWeight: 600 }}>{(order.amount ?? 0).toLocaleString()}₫</p>
                            <p style={{ fontSize: 11, color: "#8c90a0", margin: 0 }}>{order.provider ?? "PAYOS"} • {date}</p>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <StatusBadge status={order.status} />
                            {isPending && <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#8c90a0" }}>qr_code_2</span>}
                          </div>
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

      {showDeposit && <DepositModal onClose={() => setShowDeposit(false)} onSuccess={() => showSuccess("Deposit successful!")} />}
      {selectedOrder && (
        <DepositModal
          existingOrder={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onSuccess={() => showSuccess("Deposit successful!")}
        />
      )}
      {showWithdraw && <WithdrawModal onClose={() => setShowWithdraw(false)} onSuccess={() => showSuccess("Withdrawal request submitted!")}/>}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </ClientLayout>
  );
}