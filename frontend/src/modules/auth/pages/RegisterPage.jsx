import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerApi } from "../../../api/auth.api";
import { getErrorMessage } from "../../../utils/auth.utils";

const BG_IMAGE = "https://lh3.googleusercontent.com/aida/ADBb0uiAogMCN4ONd1eV0ckwyeNv8QfTOCxlvbOfag-KSL1Cdba-otv2YjPez9ovCM3FL-qyGKTDeVirDziA80hhQSTs6XXast-3vn_rIy5jZgYjYUXxWbn7589Hj6JdyzhvkZYNXQ9pQUbNptjiPkROg5Kp1z8ZHsKZL28Xmx-Rtm9fYag14W6IkJdjjWBtwCUOnpOhakWfAR9l6aohBmWnTPgav2fsqTD4ZFoyetZhmIs7tPIQxkGVlrRy0gVd";

<<<<<<< HEAD
=======
const GOOGLE_LOGIN_URL = "http://localhost:5070/api/auth/google-login";

const GoogleIcon = () => (
  <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

>>>>>>> origin/fe/minh
export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "", terms: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setError("");
  };

  const isFormValid = form.fullName.trim() && form.email.trim() && form.password.trim() && form.confirmPassword.trim() && form.terms;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    if (form.password !== form.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await registerApi({ fullName: form.fullName, email: form.email, password: form.password });
      navigate("/verify-email-notice", { state: { email: form.email } });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD
=======
  // TODO (BE): Khi BE sửa GoogleCallback redirect về http://localhost:5173/oauth/callback?token=xxx
  // thì tạo thêm trang /oauth/callback để bắt token và lưu vào localStorage
  const handleGoogleLogin = () => {
    window.location.href = GOOGLE_LOGIN_URL;
  };

>>>>>>> origin/fe/minh
  const inputStyle = {
    background: "#232A35",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "0.5rem",
    padding: "12px 16px 12px 48px",
    color: "#e1e2eb",
    width: "100%",
    outline: "none",
    fontFamily: "Inter, sans-serif",
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
      <main style={{ flex: 1, paddingTop: 128, paddingBottom: 96, backgroundImage: `linear-gradient(rgba(18,21,27,0.6), rgba(18,21,27,0.6)), url('${BG_IMAGE}')`, backgroundSize: "cover", backgroundPosition: "center" }}>
        <div style={{ maxWidth: 576, margin: "0 auto", padding: "0 16px" }}>
          <div style={{ background: "rgba(18,21,27,0.8)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "48px", boxShadow: "0 8px 32px rgba(0,0,0,0.8)" }}>

            {/* Brand */}
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 42, fontWeight: 700, letterSpacing: "-0.02em", color: "#e1e2eb", marginBottom: 8 }}>
                Join the Neural Network
              </h1>
              <p style={{ color: "#c2c6d6", fontSize: 16 }}>
                Unlock AI Prompt features and personalized career recommendations.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>

                {/* Full Name */}
                <div>
                  <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", marginBottom: 6 }}>Full Name</label>
                  <div style={{ position: "relative" }}>
                    <span className="material-symbols-outlined" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#8c90a0", fontSize: 20 }}>person</span>
                    <input type="text" name="fullName" value={form.fullName} onChange={handleChange} required placeholder="Dr. Sarah Chen" style={inputStyle} />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", marginBottom: 6 }}>Email Address</label>
                  <div style={{ position: "relative" }}>
                    <span className="material-symbols-outlined" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#8c90a0", fontSize: 20 }}>alternate_email</span>
                    <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="sarah.chen@neural.ai" style={inputStyle} />
                  </div>
                </div>

                {/* Password row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", marginBottom: 6 }}>Password</label>
                    <div style={{ position: "relative" }}>
                      <span className="material-symbols-outlined" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#8c90a0", fontSize: 20 }}>lock</span>
                      <input type="password" name="password" value={form.password} onChange={handleChange} required placeholder="••••••••" style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", marginBottom: 6 }}>Confirm Password</label>
                    <div style={{ position: "relative" }}>
                      <span className="material-symbols-outlined" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#8c90a0", fontSize: 20 }}>shield</span>
                      <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required placeholder="••••••••" style={inputStyle} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16, marginTop: 8 }}>
                <input type="checkbox" name="terms" id="terms" checked={form.terms} onChange={handleChange} style={{ width: 20, height: 20, accentColor: "#00F0FF", marginTop: 2, cursor: "pointer", flexShrink: 0 }} />
                <label htmlFor="terms" style={{ fontSize: 14, color: "#8c90a0", cursor: "pointer" }}>
                  Tôi đồng ý với{" "}
                  <a href="#" style={{ color: "#00F0FF" }}>Điều khoản dịch vụ</a>{" "}
                  và{" "}
                  <a href="#" style={{ color: "#00F0FF" }}>Chính sách bảo mật</a>
                </label>
              </div>

              {/* Error */}
              {error && (
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "12px 16px", color: "#f87171", fontSize: 14, marginBottom: 16 }}>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={!isFormValid || loading}
                style={{ width: "100%", background: "#1772eb", color: "#fff", fontFamily: "Hanken Grotesk, sans-serif", fontWeight: 700, fontSize: 16, padding: "16px", borderRadius: 8, border: "none", cursor: isFormValid && !loading ? "pointer" : "not-allowed", opacity: isFormValid && !loading ? 1 : 0.4, boxShadow: isFormValid ? "0 0 15px rgba(0,240,255,0.4)" : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s", marginBottom: 16 }}>
                {loading ? (
                  <><span className="material-symbols-outlined">progress_activity</span><span>Đang đăng ký...</span></>
                ) : (
                  <><span>Create Account</span><span className="material-symbols-outlined">bolt</span></>
                )}
              </button>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.12)" }} />
                <span style={{ color: "#8c90a0", fontSize: 13 }}>or</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.12)" }} />
              </div>

<<<<<<< HEAD
              {/* Google — tạm ẩn, chờ BE sửa redirect */}
              {/* TODO (BE): bật lại khi BE sửa GoogleCallback redirect về http://localhost:5173/oauth/callback?token=xxx */}
              <div style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "14px", color: "#414754", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 24, cursor: "not-allowed" }}>
                <svg style={{ width: 20, height: 20, opacity: 0.4 }} viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>Continue with Google (coming soon)</span>
              </div>
=======
              {/* Google */}
              <button type="button" onClick={handleGoogleLogin}
                style={{ width: "100%", background: "#232A35", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "14px", color: "#e1e2eb", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 24, transition: "background 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#32353b")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#232A35")}>
                <GoogleIcon />
                <span>Continue with Google</span>
              </button>
>>>>>>> origin/fe/minh

              {/* Login link */}
              <p style={{ textAlign: "center", fontSize: 14, color: "#8c90a0" }}>
                Already have an account?{" "}
                <Link to="/login" style={{ color: "#00F0FF", textDecoration: "none", fontWeight: 600 }}>Login</Link>
              </p>
<<<<<<< HEAD

=======
>>>>>>> origin/fe/minh
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ background: "#0b0e14", borderTop: "1px solid rgba(255,255,255,0.12)", padding: "48px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 48px" }}>
          <p style={{ fontFamily: "Hanken Grotesk, sans-serif", fontWeight: 700, color: "#e1e2eb", marginBottom: 4 }}>AI Tasker</p>
          <p style={{ fontSize: 14, color: "#8c90a0" }}>© 2024 AI Tasker. All rights reserved.</p>
        </div>
      </footer>
<<<<<<< HEAD

=======
>>>>>>> origin/fe/minh
    </div>
  );
}