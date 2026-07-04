import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPasswordApi } from "../../../api/auth.api";
import { getErrorMessage } from "../../../utils/auth.utils";

const BG_IMAGE =
  "https://lh3.googleusercontent.com/aida/ADBb0uiAogMCN4ONd1eV0ckwyeNv8QfTOCxlvbOfag-KSL1Cdba-otv2YjPez9ovCM3FL-qyGKTDeVirDziA80hhQSTs6XXast-3vn_rIy5jZgYjYUXxWbn7589Hj6JdyzhvkZYNXQ9pQUbNptjiPkROg5Kp1z8ZHsKZL28Xmx-Rtm9fYag14W6IkJdjjWBtwCUOnpOhakWfAR9l6aohBmWnTPgav2fsqTD4ZFoyetZhmIs7tPIQxkGVlrRy0gVd";

// FIX (root cause of "type 1 character → kicked out of input"):
// `Shell` trước đây được định nghĩa BÊN TRONG component ResetPasswordPage,
// nên mỗi lần setForm() chạy (mỗi lần gõ phím) → component re-render →
// Shell bị tạo lại thành 1 function MỚI mỗi lần → React coi là component
// khác loại → unmount + remount toàn bộ cây con → input mất focus ngay khi
// gõ ký tự đầu tiên. Đưa Shell ra ngoài, định nghĩa 1 lần duy nhất là hết bug.
function Shell({ children }) {
  return (
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
}

// Field mật khẩu tái sử dụng: icon con mắt để show/hide, icon + border sáng
// lên (đổi màu cyan) khi field đang được focus.
function PasswordField({ label, name, value, onChange, onFocus, onBlur, placeholder, focused, showPassword, onToggleShow }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#e1e2eb]">
        {label}
      </label>
      <div className="relative">
        <span
          className={`material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg transition-colors ${
            focused ? "text-[#00F0FF]" : "text-[#8c90a0]"
          }`}
        >
          lock
        </span>

        <input
          type={showPassword ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          required
          placeholder={placeholder}
          className={`w-full rounded-xl border bg-white/5 py-3 pl-11 pr-11 text-sm text-[#e1e2eb] outline-none transition placeholder:text-[#8c90a0] focus:ring-2 focus:ring-[#00F0FF]/20 ${
            focused ? "border-[#00F0FF]/60" : "border-white/10"
          }`}
        />

        <button
          type="button"
          onClick={onToggleShow}
          tabIndex={-1}
          className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 transition-colors ${
            focused ? "text-[#00F0FF]" : "text-[#8c90a0] hover:text-[#c2c6d6]"
          }`}
        >
          <span className="material-symbols-outlined text-lg">
            {showPassword ? "visibility_off" : "visibility"}
          </span>
        </button>
      </div>
    </div>
  );
}

const MIN_PASSWORD_LENGTH = 6;

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

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null); // "newPassword" | "confirmPassword" | null

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.newPassword.length <= MIN_PASSWORD_LENGTH) {
      setError(`Password must be longer than ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

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
          <PasswordField
            label="New password"
            name="newPassword"
            value={form.newPassword}
            onChange={handleChange}
            onFocus={() => setFocusedField("newPassword")}
            onBlur={() => setFocusedField((f) => (f === "newPassword" ? null : f))}
            placeholder={`More than ${MIN_PASSWORD_LENGTH} characters`}
            focused={focusedField === "newPassword"}
            showPassword={showNewPassword}
            onToggleShow={() => setShowNewPassword((s) => !s)}
          />

          <PasswordField
            label="Confirm new password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            onFocus={() => setFocusedField("confirmPassword")}
            onBlur={() => setFocusedField((f) => (f === "confirmPassword" ? null : f))}
            placeholder="Re-enter new password"
            focused={focusedField === "confirmPassword"}
            showPassword={showConfirmPassword}
            onToggleShow={() => setShowConfirmPassword((s) => !s)}
          />

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