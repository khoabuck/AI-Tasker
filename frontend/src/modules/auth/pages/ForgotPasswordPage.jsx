import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPasswordApi } from "../../../api/auth.api";
import { getErrorMessage } from "../../../utils/auth.utils";

const BG_IMAGE =
  "https://lh3.googleusercontent.com/aida/ADBb0uiAogMCN4ONd1eV0ckwyeNv8QfTOCxlvbOfag-KSL1Cdba-otv2YjPez9ovCM3FL-qyGKTDeVirDziA80hhQSTs6XXast-3vn_rIy5jZgYjYUXxWbn7589Hj6JdyzhvkZYNXQ9pQUbNptjiPkROg5Kp1z8ZHsKZL28Xmx-Rtm9fYag14W6IkJdjjWBtwCUOnpOhakWfAR9l6aohBmWnTPgav2fsqTD4ZFoyetZhmIs7tPIQxkGVlrRy0gVd";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusField, setFocusField] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await forgotPasswordApi({ email });
      setSubmitted(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
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
          backgroundImage: `linear-gradient(rgba(18,21,27,0.6), rgba(18,21,27,0.6)), url('${BG_IMAGE}')`,
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
                to="/login"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-gray-400 transition hover:text-cyan-300"
              >
                <span className="material-symbols-outlined text-xl">
                  arrow_back
                </span>
              </Link>

              <h1
                className="flex-1 text-center text-3xl font-semibold text-white"
                style={{
                  fontFamily: "Hanken Grotesk, sans-serif",
                  marginRight: 52,
                }}
              >
                Forgot Password
              </h1>
            </div>

            <p className="text-center text-sm text-on-surface-variant">
              Enter your email and we will send you a password reset link.
            </p>
          </header>

          {submitted ? (
            <div className="text-center">
              <div className="mb-5 text-5xl">📧</div>

              <h2
                className="mb-3 text-2xl font-semibold text-white"
                style={{ fontFamily: "Hanken Grotesk, sans-serif" }}
              >
                Check Your Email
              </h2>

              <p className="mb-7 text-sm leading-6 text-on-surface-variant">
                If{" "}
                <span className="font-medium text-neon-cyan">{email}</span>{" "}
                exists in our system, a password reset link has been sent.
                Google accounts cannot use this feature.
              </p>

              <Link
                to="/login"
                className="inline-flex w-full items-center justify-center rounded-xl py-4 font-bold transition-all"
                style={{
                  background: "#00F0FF",
                  color: "#12151B",
                  boxShadow: "0 0 15px rgba(0,240,255,0.3)",
                }}
              >
                Back to Login
              </Link>
            </div>
          ) : (
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
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
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
                {loading ? "Sending..." : "Send Reset Link"}
              </button>

              <p className="text-center text-sm text-on-surface-variant">
                Remember your password?{" "}
                <Link
                  to="/login"
                  className="ml-1 font-semibold text-neon-cyan hover:underline"
                >
                  Login
                </Link>
              </p>
            </form>
          )}
        </article>
      </main>
    </div>
  );
}