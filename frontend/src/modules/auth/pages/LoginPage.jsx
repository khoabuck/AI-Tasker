import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import authService from "../../../services/auth.service";

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", remember: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusField, setFocusField] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await authService.login({ email: form.email, password: form.password });
      if (result.success) {
        // Redirect theo status trước, role sau
        const { status, role } = result;
        if (status === "PENDING_EMAIL_VERIFICATION") {
          navigate("/verify-email-notice", { state: { email: form.email } });
        } else if (status === "PENDING_ROLE") {
          navigate("/select-role");
        } else if (status === "PENDING_PROFILE") {
          navigate("/setup-profile");
        } else if (status === "ACTIVE") {
          if (role === "CLIENT") navigate("/client/dashboard");
          else if (role === "EXPERT") navigate("/expert/dashboard");
          else if (role === "ADMIN") navigate("/admin/dashboard");
          else navigate("/");
        } else if (status === "SUSPENDED") {
          setError("Tài khoản đã bị tạm khóa. Vui lòng liên hệ hỗ trợ.");
        } else if (status === "BANNED") {
          setError("Tài khoản đã bị cấm vĩnh viễn.");
        } else {
          navigate("/");
        }
      } else {
        setError(result.message || "Đăng nhập thất bại.");
      }
    } catch (err) {
      setError("Đã có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface-dark text-on-surface font-body min-h-screen selection:bg-neon-cyan/30" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-surface-dark/80 backdrop-blur-md border-b border-glass-border">
        <nav className="max-w-[1280px] mx-auto px-12 h-20 flex items-center justify-between">
          <Link to="/" className="font-bold text-xl tracking-tight" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
            <span className="text-neon-cyan">AI</span>{" "}
            <span className="text-white">Tasker</span>
          </Link>
        </nav>
      </header>

      {/* Main */}
      <main
        className="min-h-screen pt-20 flex items-center justify-center p-4"
        style={{
          backgroundImage: "linear-gradient(rgba(18,21,27,0.6), rgba(18,21,27,0.6)), url('https://lh3.googleusercontent.com/aida/ADBb0uiAogMCN4ONd1eV0ckwyeNv8QfTOCxlvbOfag-KSL1Cdba-otv2YjPez9ovCM3FL-qyGKTDeVirDziA80hhQSTs6XXast-3vn_rIy5jZgYjYUXxWbn7589Hj6JdyzhvkZYNXQ9pQUbNptjiPkROg5Kp1z8ZHsKZL28Xmx-Rtm9fYag14W6IkJdjjWBtwCUOnpOhakWfAR9l6aohBmWnTPgav2fsqTD4ZFoyetZhmIs7tPIQxkGVlrRy0gVd')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <article className="w-full max-w-md rounded-2xl p-8 md:p-10 shadow-2xl"
          style={{ background: "rgba(18, 21, 27, 0.8)", backdropFilter: "blur(16px)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>

          <header className="mb-8">
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>

              {/* mũi tên quay lại trang chủ guest */}
              <Link to="/"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#8c90a0", textDecoration: "none", flexShrink: 0, transition: "all 0.2s ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#00F0FF"; e.currentTarget.style.borderColor = "#00F0FF"; e.currentTarget.style.boxShadow = "0 0 12px #00F0FF"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#8c90a0"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
              </Link>

              {/* Title căn giữa — dùng flex-1 + margin để bù lại khoảng trống bên phải */}
              <h1 className="text-3xl font-semibold" style={{ fontFamily: "Hanken Grotesk, sans-serif", flex: 1, textAlign: "center", marginRight: 52 }}>
                Welcome Back
              </h1>
            </div>
              <p className="text-sm text-on-surface-variant text-center">Enter your credentials to access the grid.</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">

            
            {/* Email */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-on-surface-variant block" style={{ fontFamily: "JetBrains Mono, monospace" }}>Email Address</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl"
                  style={{ color: focusField === "email" ? "#00F0FF" : "#8c90a0" }}>mail</span>
                <input type="email" name="email" value={form.email} onChange={handleChange} required
                  placeholder="name@company.ai"
                  className="w-full rounded-xl py-3 pl-12 pr-4 transition-all outline-none"
                  style={{ background: "#191c22", border: `1px solid ${focusField === "email" ? "rgba(0,240,255,0.5)" : "rgba(255,255,255,0.12)"}`, 
                  color: "#e1e2eb",
                  WebkitBoxShadow: "0 0 0 1000px #191c22 inset", 
                  WebkitTextFillColor: "#e1e2eb", }}
                  onFocus={() => setFocusField("email")}
                  onBlur={() => setFocusField("")} />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs uppercase tracking-widest text-on-surface-variant" style={{ fontFamily: "JetBrains Mono, monospace" }}>Password</label>
                <Link to="/forgot-password" className="text-xs text-neon-cyan hover:underline">Forgot Password?</Link>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl"
                  style={{ color: focusField === "password" ? "#00F0FF" : "#8c90a0" }}>lock</span>
                <input type="password" name="password" value={form.password} onChange={handleChange} required
                  className="w-full rounded-xl py-3 pl-12 pr-4 transition-all outline-none"
                  style={{ background: "#191c22", border: `1px solid ${focusField === "password" ? "rgba(0,240,255,0.5)" : "rgba(255,255,255,0.12)"}`, color: "#e1e2eb" }}
                  onFocus={() => setFocusField("password")}
                  onBlur={() => setFocusField("")} />
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-3">
              <input type="checkbox" name="remember" id="remember" checked={form.remember} onChange={handleChange}
                className="w-4 h-4 rounded" style={{ accentColor: "#00F0FF" }} />
              <label htmlFor="remember" className="text-sm text-on-surface-variant cursor-pointer">Remember me </label>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">{error}</p>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full font-bold py-4 rounded-xl transition-all disabled:opacity-60"
              style={{ background: "#00F0FF", color: "#12151B", boxShadow: "0 0 15px rgba(0,240,255,0.3)" }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 25px rgba(0,240,255,0.5)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 15px rgba(0,240,255,0.3)")}>
              {loading ? "Signing in..." : "Sign In"}
            </button>

            {/* Divider */}
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" style={{ borderColor: "rgba(255,255,255,0.12)" }} />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-4 text-on-surface-variant" style={{ background: "#12151B" }}>or</span>
              </div>
            </div>

            {/* Google — tạm ẩn chờ BE sửa redirect */}
            {/* TODO (BE): bật lại khi BE sửa GoogleCallback redirect về http://localhost:5173/oauth/callback?token=xxx */}
            <button type="button"
              onClick={() => window.location.href = "http://localhost:5070/api/auth/google-login"}
              className="w-full font-medium py-3 rounded-xl flex items-center justify-center gap-3 transition-all"
              style={{ background: "#232A35", border: "1px solid rgba(255,255,255,0.12)", color: "#e1e2eb", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#32353b")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#232A35")}>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            <p className="text-center text-sm text-on-surface-variant">
              Don't have an account?{" "}
              <Link to="/register" className="text-neon-cyan font-semibold hover:underline ml-1">Register</Link>
            </p>
          </form>
        </article>
      </main>
      
    </div>
  );
}