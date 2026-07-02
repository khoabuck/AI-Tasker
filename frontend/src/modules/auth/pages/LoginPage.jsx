import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import authService from "../../../services/auth.service";
import { useAuth } from "../../../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { handleLoginSuccess } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusField, setFocusField] = useState("");
  const [rememberedLogins, setRememberedLogins] = useState([]);
  const [showSavedAccounts, setShowSavedAccounts] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const clearAuthSession = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
  };

  useEffect(() => {
  const savedLogins = localStorage.getItem("rememberLogins");

  if (savedLogins) {
    try {
      const parsed = JSON.parse(savedLogins);
      setRememberedLogins(Array.isArray(parsed) ? parsed : []);
    } catch {
      localStorage.removeItem("rememberLogins");
    }
  }
}, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setError("");
  };

  const selectSavedAccount = (account) => {
    setForm((prev) => ({
      ...prev,
      email: account.email || "",
      password: "",
      remember: true,
    }));

    setShowSavedAccounts(false);
    setError("");
  };

  const saveRememberedLogin = () => {
    const email = form.email.trim();

    if (!form.remember || !email) {
      return;
    }

    const existingRaw = localStorage.getItem("rememberLogins");
    let existing = [];

    try {
      existing = existingRaw ? JSON.parse(existingRaw) : [];
      if (!Array.isArray(existing)) existing = [];
    } catch {
      existing = [];
    }

    const next = [
      { email },
      ...existing.filter((item) => item.email !== email),
    ];

    localStorage.setItem("rememberLogins", JSON.stringify(next));
    setRememberedLogins(next);
  };

  const goNextByRoleAndStatus = ({ role, status, email, password }) => {
    const normalizedRole = String(role || "").toUpperCase();
    const normalizedStatus = String(status || "").toUpperCase();

    if (normalizedStatus === "PENDING_EMAIL_VERIFICATION") {
      navigate("/verify-email-notice", {
        replace: true,
        state: { email },
      });
      return;
    }

    if (normalizedStatus === "PENDING_ROLE" || !normalizedRole) {
      navigate("/select-role", {
        replace: true,
        state: { email, password },
      });
      return;
    }

    if (normalizedStatus === "PENDING_PROFILE") {
      if (normalizedRole === "EXPERT") {
        navigate("/expert/setup-profile", { replace: true });
        return;
      }

      if (normalizedRole === "CLIENT") {
        navigate("/setup-profile", { replace: true });
        return;
      }

      navigate("/select-role", {
        replace: true,
        state: { email, password },
      });
      return;
    }

    if (normalizedStatus === "ACTIVE") {
      if (normalizedRole === "EXPERT") {
        navigate("/expert/dashboard", { replace: true });
        return;
      }

      if (normalizedRole === "CLIENT") {
        navigate("/client/dashboard", { replace: true });
        return;
      }

      if (normalizedRole === "ADMIN") {
        navigate("/admin/dashboard", { replace: true });
        return;
      }
    }

    if (normalizedStatus === "SUSPENDED") {
      setError(
        "Your account has been temporarily suspended. Please contact support."
      );
      return;
    }

    if (normalizedStatus === "BANNED") {
      setError("Your account has been permanently banned.");
      return;
    }

    navigate("/select-role", {
      replace: true,
      state: { email, password },
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const result = await authService.login({
        email: form.email,
        password: form.password,
      });

      if (!result.success || !result.accessToken) {
        console.log("LOGIN RESULT:", result);
        setError(result.message || "Login failed: missing access token.");
        return;
      }

      if (form.remember) {
        saveRememberedLogin();
      }

      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

      const finalUser = result.user || storedUser || {};
      const finalRole = finalUser.role || storedUser.role || result.role;
      const finalStatus = finalUser.status || storedUser.status || result.status;

      handleLoginSuccess({
        accessToken: result.accessToken,
        user: {
          ...finalUser,
          role: finalRole,
          status: finalStatus,
        },
      });

      const sessionId = crypto.randomUUID();
      sessionStorage.setItem("sessionId", sessionId);
      localStorage.setItem("activeSessionId", sessionId);

      goNextByRoleAndStatus({
        role: finalRole,
        status: finalStatus,
        email: form.email,
        password: form.password,
      });
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_BASE_URL;

    if (!backendUrl) {
      setError("Missing VITE_BACKEND_BASE_URL");
      return;
    }

    window.location.href = `${backendUrl}/api/auth/google-login`;
  };

  return (
    <div
      className="min-h-screen bg-surface-dark text-on-surface selection:bg-neon-cyan/30"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <header className="fixed top-0 z-50 w-full border-b border-glass-border bg-surface-dark/80 backdrop-blur-md">
        <nav className="mx-auto flex h-20 max-w-[1280px] items-center justify-between px-12">
          <Link
            to="/"
            className="text-xl font-bold tracking-tight"
            style={{ fontFamily: "Hanken Grotesk, sans-serif" }}
          >
            <span className="text-neon-cyan">AI</span>{" "}
            <span className="text-white">Tasker</span>
          </Link>
        </nav>
      </header>

      <main
        className="flex min-h-screen items-center justify-center p-4 pt-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(18,21,27,0.6), rgba(18,21,27,0.6)), url('https://lh3.googleusercontent.com/aida/ADBb0uiAogMCN4ONd1eV0ckwyeNv8QfTOCxlvbOfag-KSL1Cdba-otv2YjPez9ovCM3FL-qyGKTDeVirDziA80hhQSTs6XXast-3vn_rIy5jZgYjYUXxWbn7589Hj6JdyzhvkZYNXQ9pQUbNptjiPkROg5Kp1z8ZHsKZL28Xmx-Rtm9fYag14W6IkJdjjWBtwCUOnpOhakWfAR9l6aohBmWnTPgav2fsqTD4ZFoyetZhmIs7tPIQxkGVlrRy0gVd')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <article
          className="w-full max-w-md rounded-2xl p-8 shadow-2xl md:p-10"
          style={{
            background: "rgba(18, 21, 27, 0.8)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <header className="mb-8">
            <div className="mb-4 flex items-center gap-4">
              <Link
                to="/"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-gray-400 transition hover:text-cyan-300"
              >
                <span className="material-symbols-outlined text-xl">
                  arrow_back
                </span>
              </Link>

              <h1
                className="flex-1 text-center text-3xl font-semibold"
                style={{
                  fontFamily: "Hanken Grotesk, sans-serif",
                  marginRight: 52,
                }}
              >
                Welcome Back
              </h1>
            </div>

          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                className="block text-xs uppercase tracking-widest text-on-surface-variant"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                Email Address
              </label>

              <div className="relative">
                <span
                  className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl"
                  style={{
                    color: focusField === "email" ? "#00F0FF" : "#8c90a0",
                    textShadow:
                      focusField === "email"
                        ? "0 0 10px rgba(0,240,255,0.6)"
                        : "none",
                    transition: "all .25s ease",
                  }}
                >
                  mail
                </span>

                <input
                  type="email"
                  name="email"
                  autoComplete="off"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="name@company.ai"
                  className="w-full rounded-xl py-3 pl-12 pr-4 outline-none transition-all"
                  style={{
                    background: "#191c22",
                    border: `1px solid ${
                      focusField === "email"
                        ? "rgba(0,240,255,0.5)"
                        : "rgba(255,255,255,0.12)"
                    }`,
                    color: "#e1e2eb",
                    WebkitBoxShadow: "0 0 0 1000px #191c22 inset",
                    WebkitTextFillColor: "#e1e2eb",
                  }}
                  onFocus={() => {
                    setFocusField("email");
                    setShowSavedAccounts(true);
                  }}
                  onBlur={() => {
                    setFocusField("");
                    setTimeout(() => setShowSavedAccounts(false), 150);
                  }}
                />

                {showSavedAccounts && rememberedLogins.length > 0 && (
                  <div className="absolute left-0 right-0 top-[52px] z-50 overflow-hidden rounded-xl border border-white/10 bg-[#191c22] shadow-2xl">
                    {rememberedLogins.map((account) => (
                      <button
                        key={account.email}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectSavedAccount(account);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.06]"
                      >
                        <span className="material-symbols-outlined text-lg text-cyan-300">
                          account_circle
                        </span>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">
                            {account.email}
                          </p>
                          <p className="text-xs text-gray-400">
                             Saved email
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  className="text-xs uppercase tracking-widest text-on-surface-variant"
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                >
                  Password
                </label>

                <Link
                  to="/forgot-password"
                  className="text-xs text-neon-cyan hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>

              <div className="relative">
                <span
                  className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl"
                  style={{
                    color:
                      focusField === "password" ? "#00F0FF" : "#8c90a0",
                    textShadow:
                      focusField === "password"
                        ? "0 0 10px rgba(0,240,255,0.6)"
                        : "none",
                    transition: "all .25s ease",
                  }}
                >
                  lock
                </span>

                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl py-3 pl-12 pr-12 outline-none transition-all"
                  style={{
                    background: "#191c22",
                    border: `1px solid ${
                      focusField === "password"
                        ? "rgba(0,240,255,0.5)"
                        : "rgba(255,255,255,0.12)"
                    }`,
                    color: "#e1e2eb",
                  }}
                  onFocus={() => {
                    setFocusField("password");
                  }}
                  onBlur={() => setFocusField("")}
                />

                <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#00F0FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 22,
                    textShadow: "0 0 10px rgba(0,240,255,0.55)",
                    transition: "0.2s",
                  }}
                >
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="remember"
                id="remember"
                checked={form.remember}
                onChange={handleChange}
                className="h-4 w-4 rounded"
                style={{ accentColor: "#00F0FF" }}
              />

              <label
                htmlFor="remember"
                className="cursor-pointer text-sm text-on-surface-variant"
              >
                Remember me
              </label>
            </div>

            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-4 font-bold transition-all disabled:opacity-60"
              style={{
                background: "#00F0FF",
                color: "#12151B",
                boxShadow: "0 0 15px rgba(0,240,255,0.3)",
              }}
              onMouseEnter={(e) =>
              (e.currentTarget.style.boxShadow =
                "0 0 25px rgba(0,240,255,0.5)")
              }
              onMouseLeave={(e) =>
              (e.currentTarget.style.boxShadow =
                "0 0 15px rgba(0,240,255,0.3)")
              }
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div
                  className="w-full border-t"
                  style={{ borderColor: "rgba(255,255,255,0.12)" }}
                />
              </div>

              <div className="relative flex justify-center text-xs uppercase">
                <span
                  className="px-4 text-on-surface-variant"
                  style={{ background: "#12151B" }}
                >
                  or
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex w-full items-center justify-center gap-3 rounded-xl py-3 font-medium transition-all"
              style={{
                background: "#232A35",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#e1e2eb",
                cursor: "pointer",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#32353b")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#232A35")
              }
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            <p className="text-center text-sm text-on-surface-variant">
              Don&apos;t have an account?{" "}
              <Link
                to="/register"
                onClick={clearAuthSession}
                className="ml-1 font-semibold text-neon-cyan hover:underline"
              >
                Register
              </Link>
            </p>
          </form>
        </article>
      </main>
    </div>
  );
}