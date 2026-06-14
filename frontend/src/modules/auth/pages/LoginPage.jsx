import { useState } from "react";
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

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setError("");
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

      if (!result.success) {
        setError(result.message || "Login failed.");
        return;
      }

      handleLoginSuccess({
        accessToken: result.accessToken,
        user: result.user,
      });

      goNextByRoleAndStatus({
        role: result.role,
        status: result.status,
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
    authService.loginWithGoogle();
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

            <p className="text-center text-sm text-on-surface-variant">
              Enter your credentials to access the grid.
            </p>
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
                  }}
                >
                  mail
                </span>

                <input
                  type="email"
                  name="email"
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
                  onFocus={() => setFocusField("email")}
                  onBlur={() => setFocusField("")}
                />
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
                  }}
                >
                  lock
                </span>

                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl py-3 pl-12 pr-4 outline-none transition-all"
                  style={{
                    background: "#191c22",
                    border: `1px solid ${
                      focusField === "password"
                        ? "rgba(0,240,255,0.5)"
                        : "rgba(255,255,255,0.12)"
                    }`,
                    color: "#e1e2eb",
                  }}
                  onFocus={() => setFocusField("password")}
                  onBlur={() => setFocusField("")}
                />
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
            >
              Continue with Google
            </button>

            <p className="text-center text-sm text-on-surface-variant">
              Don&apos;t have an account?{" "}
              <Link
                to="/register"
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