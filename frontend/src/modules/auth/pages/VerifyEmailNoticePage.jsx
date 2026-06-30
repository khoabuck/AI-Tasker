import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { resendVerificationEmailApi } from "../../../api/auth.api";
import { getErrorMessage } from "../../../utils/auth.utils";

const BG_IMAGE =
  "https://lh3.googleusercontent.com/aida/ADBb0uiAogMCN4ONd1eV0ckwyeNv8QfTOCxlvbOfag-KSL1Cdba-otv2YjPez9ovCM3FL-qyGKTDeVirDziA80hhQSTs6XXast-3vn_rIy5jZgYjYUXxWbn7589Hj6JdyzhvkZYNXQ9pQUbNptjiPkROg5Kp1z8ZHsKZL28Xmx-Rtm9fYag14W6IkJdjjWBtwCUOnpOhakWfAR9l6aohBmWnTPgav2fsqTD4ZFoyetZhmIs7tPIQxkGVlrRy0gVd";

export default function VerifyEmailNoticePage() {
  const location = useLocation();
  const email = location.state?.email || "";

  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    if (!email) {
      setStatus("error");
      setMessage("Email is missing. Please go back and register again.");
      return;
    }

    try {
      setLoading(true);
      setStatus("");
      setMessage("");

      const data = await resendVerificationEmailApi({ email });

      setStatus("success");
      setMessage(data?.message || "Verification email has been resent.");
    } catch (err) {
      setStatus("error");
      setMessage(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

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

        <section className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#12151B]/85 p-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-2xl sm:p-12">
          <div className="mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full border border-[#00F0FF]/25 bg-[#00F0FF]/10">
            <span className="material-symbols-outlined text-4xl text-[#00F0FF]">
              mark_email_unread
            </span>
          </div>

          <h1 className="mb-3 font-['Hanken_Grotesk'] text-3xl font-bold tracking-tight text-[#e1e2eb]">
            Check your inbox
          </h1>

          <p className="mb-2 text-sm text-[#8c90a0]">
            We&apos;ve sent a verification link to
          </p>

          {email ? (
            <p className="mb-5 break-all font-mono text-sm font-semibold text-[#00F0FF]">
              {email}
            </p>
          ) : (
            <p className="mb-5 text-sm font-medium text-yellow-300">
              No email found from registration.
            </p>
          )}

          <p className="mb-8 text-sm leading-7 text-[#8c90a0]">
            Click the link in the email to activate your account, then come back
            to log in.
          </p>

          {status === "success" && (
            <div className="mb-5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
              {message}
            </div>
          )}

          {status === "error" && (
            <div className="mb-5 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
              {message}
            </div>
          )}

          <button
            type="button"
            onClick={handleResend}
            disabled={loading || !email}
            className="mb-8 text-sm font-medium text-[#00F0FF] underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-[#8c90a0]"
          >
            {loading ? "Sending..." : "Didn't receive the email? Resend"}
          </button>

          <div className="border-t border-white/10 pt-6">
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
      </main>
    </div>
  );
}