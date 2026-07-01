import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPasswordApi } from "../../../api/auth.api";
import { getErrorMessage } from "../../../utils/auth.utils";

const BG_IMAGE =
  "https://lh3.googleusercontent.com/aida/ADBb0uiAogMCN4ONd1eV0ckwyeNv8QfTOCxlvbOfag-KSL1Cdba-otv2YjPez9ovCM3FL-qyGKTDeVirDziA80hhQSTs6XXast-3vn_rIy5jZgYjYUXxWbn7589Hj6JdyzhvkZYNXQ9pQUbNptjiPkROg5Kp1z8ZHsKZL28Xmx-Rtm9fYag14W6IkJdjjWBtwCUOnpOhakWfAR9l6aohBmWnTPgav2fsqTD4ZFoyetZhmIs7tPIQxkGVlrRy0gVd";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [form, setForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
      setError("Confirm password does not match.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await resetPasswordApi({
        token,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });

      setSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const Shell = ({ children }) => (
    <div className="min-h-screen bg-[#12151B] text-[#e1e2eb] font-sans">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#12151B]/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center px-6 lg:px-12">
          <Link
            to="/"
            className="font-['Hanken_Grotesk'] text-[22px] font-bold tracking-[-0.02em]"
          >
            <span className="text-[#00F0FF]">AI</span>{" "}
            <span className="text-[#e1e2eb]">Tasker</span>
          </Link>
        </div>
      </nav>

      <main
        className="relative flex min-h-screen items-center justify-center bg-cover bg-center px-4 pb-10 pt-28"
        style={{
          backgroundImage: `linear-gradient(rgba(18,21,27,0.72), rgba(18,21,27,0.82)), url('${BG_IMAGE}')`,
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,240,255,0.12),transparent_35%)]" />
        {children}
      </main>
    </div>
  );

  if (!token) {
    return (
      <Shell>
        <section className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#12151B]/85 p-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-2xl sm:p-12">
          <div className="mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full border border-red-400/30 bg-red-400/10">
            <span className="material-symbols-outlined text-4xl text-red-300">
              error
            </span>
          </div>

          <h1 className="mb-3 font-['Hanken_Grotesk'] text-3xl font-bold tracking-tight text-[#e1e2eb]">
            Invalid reset link
          </h1>

          <p className="mb-8 text-sm leading-7 text-[#8c90a0]">
            Please request a new password reset link and try again.
          </p>

          <Link
            to="/forgot-password"
            className="inline-flex items-center justify-center rounded-xl border border-[#00F0FF]/30 bg-[#00F0FF]/10 px-6 py-3 text-sm font-semibold text-[#00F0FF] transition hover:bg-[#00F0FF]/15"
          >
            Request new link
          </Link>
        </section>
      </Shell>
    );
  }

  if (success) {
    return (
      <Shell>
        <section className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#12151B]/85 p-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-2xl sm:p-12">
          <div className="mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10">
            <span className="material-symbols-outlined text-4xl text-emerald-300">
              check_circle
            </span>
          </div>

          <h1 className="mb-3 font-['Hanken_Grotesk'] text-3xl font-bold tracking-tight text-[#e1e2eb]">
            Password reset successful
          </h1>

          <p className="mb-8 text-sm leading-7 text-[#8c90a0]">
            You can now sign in with your new password.
          </p>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="inline-flex items-center justify-center rounded-xl bg-[#00F0FF] px-6 py-3 text-sm font-bold text-[#12151B] transition hover:shadow-[0_0_24px_rgba(0,240,255,0.35)]"
          >
            Back to Login
          </button>
        </section>
      </Shell>
    );
  }

  return (
    <Shell>
      <section className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#12151B]/85 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-2xl sm:p-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full border border-[#00F0FF]/25 bg-[#00F0FF]/10">
            <span className="material-symbols-outlined text-4xl text-[#00F0FF]">
              lock_reset
            </span>
          </div>

          <h1 className="mb-3 font-['Hanken_Grotesk'] text-3xl font-bold tracking-tight text-[#e1e2eb]">
            Reset your password
          </h1>

          <p className="text-sm text-[#8c90a0]">
            Enter a new password for your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#e1e2eb]">
              New password
            </label>
            <input
              type="password"
              name="newPassword"
              value={form.newPassword}
              onChange={handleChange}
              required
              placeholder="Minimum 6 characters"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#e1e2eb] outline-none transition placeholder:text-[#8c90a0] focus:border-[#00F0FF]/60 focus:ring-2 focus:ring-[#00F0FF]/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#e1e2eb]">
              Confirm new password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Re-enter new password"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#e1e2eb] outline-none transition placeholder:text-[#8c90a0] focus:border-[#00F0FF]/60 focus:ring-2 focus:ring-[#00F0FF]/20"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#00F0FF] py-3 text-sm font-bold text-[#12151B] transition hover:shadow-[0_0_24px_rgba(0,240,255,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Processing..." : "Reset Password"}
          </button>
        </form>

        <div className="mt-8 border-t border-white/10 pt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 text-sm text-[#8c90a0] transition hover:text-[#e1e2eb]"
          >
            <span className="material-symbols-outlined text-lg">
              arrow_back
            </span>
            Back to Login
          </Link>
        </div>
      </section>
    </Shell>
  );
}