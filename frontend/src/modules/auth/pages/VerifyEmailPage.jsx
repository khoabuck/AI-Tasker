import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

const BG_IMAGE = "https://lh3.googleusercontent.com/aida/ADBb0uiAogMCN4ONd1eV0ckwyeNv8QfTOCxlvbOfag-KSL1Cdba-otv2YjPez9ovCM3FL-qyGKTDeVirDziA80hhQSTs6XXast-3vn_rIy5jZgYjYUXxWbn7589Hj6JdyzhvkZYNXQ9pQUbNptjiPkROg5Kp1z8ZHsKZL28Xmx-Rtm9fYag14W6IkJdjjWBtwCUOnpOhakWfAR9l6aohBmWnTPgav2fsqTD4ZFoyetZhmIs7tPIQxkGVlrRy0gVd";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const successParam = searchParams.get("success");
  const messageParam = searchParams.get("message");
  const isSuccess = successParam === "true";

  const isJwtLike = (text) => {
    if (!text) return false;
    return text.split(".").length === 3 && text.startsWith("eyJ");
  };

  const safeMessage =
    messageParam && !isJwtLike(messageParam)
      ? messageParam
      : "";

  const message =
    safeMessage ||
    (isSuccess
      ? "Your email has been verified successfully. You can now log in."
      : "The verification link is invalid or has expired.");

  // Xác thực thành công → chuyển sang /login ngay lập tức, không chờ.
  useEffect(() => {
    if (isSuccess) {
      navigate("/login", { replace: true });
    }
  }, [isSuccess, navigate]);

  // Đã điều hướng đi ngay ở effect trên, không cần render gì cho trường hợp
  // thành công — tránh nháy UI "Email Verified!" trong tích tắc trước khi
  // chuyển trang.
  if (isSuccess) {
    return null;
  }

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

      {/* Main — chỉ còn nhánh Failed, vì Success đã navigate ngay lập tức */}
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 16px", backgroundImage: `linear-gradient(rgba(18,21,27,0.7), rgba(18,21,27,0.7)), url('${BG_IMAGE}')`, backgroundSize: "cover", backgroundPosition: "center" }}>
        <div style={{ width: "100%", maxWidth: 480, background: "rgba(18,21,27,0.85)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 48, boxShadow: "0 8px 32px rgba(0,0,0,0.8)", textAlign: "center" }}>

          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 36, color: "#f87171" }}>cancel</span>
          </div>
          <h2 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 28, fontWeight: 700, color: "#e1e2eb", marginBottom: 12 }}>
            Verification Failed
          </h2>
          <p style={{ color: "#8c90a0", fontSize: 14, marginBottom: 32, lineHeight: 1.7 }}>
            {message}
          </p>
          <Link to="/verify-email-notice"
            style={{ display: "inline-block", padding: "14px 40px", background: "rgba(0,240,255,0.05)", color: "#00F0FF", fontFamily: "Hanken Grotesk, sans-serif", fontWeight: 700, fontSize: 15, borderRadius: 8, border: "1px solid rgba(0,240,255,0.3)", textDecoration: "none", transition: "all 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,240,255,0.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,240,255,0.05)")}>
            Resend Verification Email
          </Link>

          {/* Back to login */}
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
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