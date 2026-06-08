import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { resendVerificationEmailApi } from "../../../api/auth.api";
import { getErrorMessage } from "../../../utils/auth.utils";

const BG_IMAGE = "https://lh3.googleusercontent.com/aida/ADBb0uiAogMCN4ONd1eV0ckwyeNv8QfTOCxlvbOfag-KSL1Cdba-otv2YjPez9ovCM3FL-qyGKTDeVirDziA80hhQSTs6XXast-3vn_rIy5jZgYjYUXxWbn7589Hj6JdyzhvkZYNXQ9pQUbNptjiPkROg5Kp1z8ZHsKZL28Xmx-Rtm9fYag14W6IkJdjjWBtwCUOnpOhakWfAR9l6aohBmWnTPgav2fsqTD4ZFoyetZhmIs7tPIQxkGVlrRy0gVd";

export default function VerifyEmailNoticePage() {
  const location = useLocation();
  const email = location.state?.email || "";

  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    setLoading(true);
    setStatus("");
    try {
      const data = await resendVerificationEmailApi({ email });
      setStatus("success");
      setMessage(data.message || "Verification email has been resent.");
    } catch (err) {
      setStatus("error");
      setMessage(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "#12151B", color: "#e1e2eb", minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif" }}>

      {/* Navbar */}
      <nav style={{ position: "fixed", top: 0, width: "100%", zIndex: 50, background: "rgba(18,21,27,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 48px", height: 80, display: "flex", alignItems: "center" }}>
          <Link to="/" style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 22, fontWeight: 700, textDecoration: "none", letterSpacing: "-0.02em" }}>
            <span style={{ color: "#00F0FF" }}>AI</span>{" "}
            <span style={{ color: "#e1e2eb" }}>Tasker</span>
          </Link>
        </div>
      </nav>

      {/* Main */}
      <main style={{ flex: 1, paddingTop: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 16px", backgroundImage: `linear-gradient(rgba(18,21,27,0.7), rgba(18,21,27,0.7)), url('${BG_IMAGE}')`, backgroundSize: "cover", backgroundPosition: "center" }}>
        <div style={{ width: "100%", maxWidth: 480, background: "rgba(18,21,27,0.85)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 48, boxShadow: "0 8px 32px rgba(0,0,0,0.8)", textAlign: "center" }}>

          {/* Icon */}
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(0,240,255,0.08)", border: "1px solid rgba(0,240,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 36, color: "#00F0FF" }}>mark_email_unread</span>
          </div>

          {/* Title */}
          <h2 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 28, fontWeight: 700, color: "#e1e2eb", marginBottom: 12 }}>
            Check your inbox
          </h2>
          <p style={{ color: "#8c90a0", fontSize: 14, marginBottom: 8 }}>
            We've sent a verification link to
          </p>
          {email && (
            <p style={{ fontWeight: 600, color: "#00F0FF", fontSize: 15, marginBottom: 20, fontFamily: "JetBrains Mono, monospace" }}>
              {email}
            </p>
          )}
          <p style={{ color: "#8c90a0", fontSize: 13, marginBottom: 32, lineHeight: 1.7 }}>
            Click the link in the email to activate your account, then come back to log in.
          </p>

          {/* Status messages */}
          {status === "success" && (
            <div style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 8, padding: "12px 16px", color: "#4ade80", fontSize: 14, marginBottom: 20 }}>
              {message}
            </div>
          )}
          {status === "error" && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "12px 16px", color: "#f87171", fontSize: 14, marginBottom: 20 }}>
              {message}
            </div>
          )}

          {/* Resend */}
          {email && (
            <button onClick={handleResend} disabled={loading}
              style={{ fontSize: 14, color: loading ? "#8c90a0" : "#00F0FF", background: "none", border: "none", cursor: loading ? "not-allowed" : "pointer", textDecoration: "underline", marginBottom: 32 }}>
              {loading ? "Sending..." : "Didn't receive the email? Resend"}
            </button>
          )}

          {/* Back to login */}
          <div style={{ paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <Link to="/login" style={{ fontSize: 14, color: "#8c90a0", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#e1e2eb")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#8c90a0")}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
              Back to Login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}