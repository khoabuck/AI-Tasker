// src/modules/auth/pages/RegisterPage.jsx
// Trang đăng ký tài khoản mới
// Chọn Expert hoặc Company → điền thông tin → submit

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import Navbar from "../../../components/layout/Navbar";
import authService from "../../../services/auth.service";

// ─── Tab chọn loại tài khoản ──────────────────────────
function TypeTab({ value, icon, label, selected, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`flex flex-col items-center justify-center p-4 rounded-lg border
                  transition-all
                  ${selected
                    ? "border-cyan-400 text-cyan-400 bg-cyan-400/5"
                    : "border-white/10 bg-white/5 text-gray-400 hover:border-cyan-400/50"
                  }`}
    >
      <span className={`material-symbols-outlined mb-2
                        ${selected ? "text-cyan-400" : "text-gray-400"}`}>
        {icon}
      </span>
      <span className="font-mono text-xs uppercase tracking-widest">{label}</span>
    </button>
  );
}

// ─── Input field có icon ───────────────────────────────
function InputField({ label, icon, type = "text", id, placeholder, value, onChange, required }) {
  return (
    <div className="group space-y-1.5">
      <label htmlFor={id}
        className="block font-mono text-xs uppercase tracking-widest text-gray-500 ml-1">
        {label}
      </label>
      <div className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2
                         text-gray-500 group-focus-within:text-cyan-400 transition-colors">
          {icon}
        </span>
        <input
          id={id} name={id} type={type} required={required}
          placeholder={placeholder}
          value={value} onChange={onChange}
          className="w-full bg-[#232A35] border border-white/10 rounded-lg
                     py-3 pl-12 pr-4 text-white placeholder:text-gray-600
                     focus:outline-none focus:border-cyan-400
                     focus:ring-1 focus:ring-cyan-400/30 transition-all"
        />
      </div>
    </div>
  );
}

// ─── RegisterPage ─────────────────────────────────────
export default function RegisterPage() {
  const navigate = useNavigate();

  // State loại tài khoản
  const [accountType, setAccountType] = useState("client");

  // State form data
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading]             = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]                 = useState(null);

  // Form hợp lệ khi tất cả field có giá trị và đã tick terms
  const isFormValid =
    Object.values(formData).every((v) => v.trim() !== "") && agreedToTerms;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    // Kiểm tra password khớp
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    console.log("Register:", { ...formData, accountType });
    // TODO: gọi authApi.register() → nhận token → navigate role-selection
    await new Promise((res) => setTimeout(res, 1500));

    setLoading(false);
    if (accountType === "client") {
      navigate("/client/profile-setup");
    } else {
      navigate("/expert/profile-setup");
    }
  };

  // Google Register
  const handleGoogleRegister = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setError(null);
      const result = await authService.loginWithGoogle(tokenResponse.access_token);
      if (result.success) {
        if (accountType === "client") {
          navigate("/client/profile-setup");
        } else {
          navigate("/expert/profile-setup");
        }
      } else {
        setError(result.message);
      }
      setGoogleLoading(false);
    },
    onError: () => setError("Google sign up failed. Please try again."),
  });

  return (
    <div className="bg-[#101319] text-white min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-32 pb-24 relative">
        {/* Overlay */}
        <div className="absolute inset-0 bg-[#12151B]/60 pointer-events-none" />

        <div className="relative z-10 max-w-xl mx-auto px-4 md:px-0">
          <div className="bg-[#12151B]/80 backdrop-blur-2xl border border-white/10
                          rounded-xl p-8 md:p-12 shadow-[0_8px_32px_rgba(0,0,0,0.8)]">

            {/* Header */}
            <div className="flex flex-col items-center mb-10 text-center">
              <h1 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">
                Join the Neural Network
              </h1>
              <p className="text-gray-400">
                Unlock AI Prompt features and personalized career recommendations.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Chọn loại tài khoản */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <TypeTab value="expert"  icon="psychology"    label="AI Expert" selected={accountType === "expert"}  onChange={setAccountType} />
                <TypeTab value="client"  icon="work"          label="Client"    selected={accountType === "client"}  onChange={setAccountType} />
              </div>

              {/* Lỗi */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400
                                text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              {/* Fields */}
              <div className="space-y-4">
                <InputField
                  label="Full Name" icon="person" id="fullName"
                  placeholder="Dr. Sarah Chen"
                  value={formData.fullName} onChange={handleChange} required
                />
                <InputField
                  label="Email Address" icon="alternate_email" type="email" id="email"
                  placeholder="sarah.chen@neural.ai"
                  value={formData.email} onChange={handleChange} required
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    label="Password" icon="lock" type="password" id="password"
                    placeholder="••••••••"
                    value={formData.password} onChange={handleChange} required
                  />
                  <InputField
                    label="Confirm Password" icon="shield" type="password" id="confirmPassword"
                    placeholder="••••••••"
                    value={formData.confirmPassword} onChange={handleChange} required
                  />
                </div>
              </div>

              {/* Terms checkbox */}
              <div className="flex items-start gap-3 pt-2">
                <input
                  type="checkbox" id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-white/10 bg-[#232A35]
                             text-cyan-400 focus:ring-cyan-400 cursor-pointer"
                />
                <label htmlFor="terms" className="text-sm text-gray-400 cursor-pointer select-none">
                  Tôi đồng ý với{" "}
                  <a href="#" className="text-cyan-400 hover:underline">Điều khoản dịch vụ</a>
                  {" "}và{" "}
                  <a href="#" className="text-cyan-400 hover:underline">Chính sách bảo mật</a>
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!isFormValid || loading}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-lg
                           flex items-center justify-center gap-2
                           shadow-[0_0_15px_rgba(0,240,255,0.4)]
                           hover:shadow-[0_0_25px_rgba(0,240,255,0.6)]
                           hover:scale-[1.02] transition-all
                           disabled:opacity-40 disabled:cursor-not-allowed
                           disabled:shadow-none disabled:hover:scale-100"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    Initializing Neural Link...
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <span className="material-symbols-outlined">bolt</span>
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-white/10" />
                <span className="mx-4 text-sm text-gray-500">or</span>
                <div className="flex-grow border-t border-white/10" />
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleRegister}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3
                           bg-[#232A35] border border-white/10 text-white
                           py-3.5 rounded-lg hover:bg-white/10 transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {googleLoading ? (
                  <span className="text-sm">Connecting...</span>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              {/* Link login */}
              <div className="text-center pt-4">
                <p className="text-sm text-gray-500">
                  Already have an account?{" "}
                  <Link to="/login" className="text-cyan-400 hover:underline ml-1">
                    Login
                  </Link>
                </p>
              </div>

            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 bg-[#0b0e14] border-t border-white/10" />
    </div>
  );
}