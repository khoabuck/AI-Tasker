// src/modules/auth/pages/LoginPage.jsx

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import Navbar      from "../../../components/layout/Navbar";
import authService from "../../../services/auth.service";

// ─── LoginForm ────────────────────────────────────────
function LoginForm({ onSubmit, onGoogleLogin, loading, googleLoading, error }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Hiện lỗi */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400
                        text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Email */}
      <div className="space-y-2">
        <label htmlFor="email"
          className="font-mono text-xs uppercase tracking-widest text-gray-400 block">
          Email Address
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xl">
            mail
          </span>
          <input
            id="email" name="email" type="email" required
            placeholder="name@company.ai"
            value={formData.email}
            onChange={handleChange}
            className="w-full bg-white/5 border border-white/10 rounded-xl
                       py-3 pl-12 pr-4 text-white placeholder:text-gray-600
                       focus:outline-none focus:ring-1 focus:ring-cyan-400/50
                       focus:border-cyan-400/50 transition-all"
          />
        </div>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label htmlFor="password"
            className="font-mono text-xs uppercase tracking-widest text-gray-400">
            Password
          </label>
          <a href="#" className="text-xs text-cyan-400 hover:underline">
            Forgot Password?
          </a>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xl">
            lock
          </span>
          <input
            id="password" name="password" type="password" required
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            className="w-full bg-white/5 border border-white/10 rounded-xl
                       py-3 pl-12 pr-4 text-white placeholder:text-gray-600
                       focus:outline-none focus:ring-1 focus:ring-cyan-400/50
                       focus:border-cyan-400/50 transition-all"
          />
        </div>
      </div>

      {/* Remember me */}
      <div className="flex items-center gap-3">
        <input
          id="remember" name="remember" type="checkbox"
          checked={formData.remember}
          onChange={handleChange}
          className="w-4 h-4 rounded border-white/10 bg-white/5
                     text-cyan-400 focus:ring-cyan-400 cursor-pointer"
        />
        <label htmlFor="remember" className="text-sm text-gray-400 cursor-pointer">
          Remember me for 30 days
        </label>
      </div>

      {/* Submit */}
      <button type="submit" disabled={loading}
        className="w-full bg-cyan-400 text-gray-900 font-bold py-4 rounded-xl
                   shadow-[0_0_15px_rgba(0,240,255,0.3)]
                   hover:shadow-[0_0_25px_rgba(0,240,255,0.5)]
                   hover:-translate-y-0.5 transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
        {loading ? "Signing in..." : "Sign In"}
      </button>

      {/* Divider */}
      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#12151B] px-4 text-gray-500">or</span>
        </div>
      </div>

      {/* Google Login */}
      {/* useGoogleLogin hook từ @react-oauth/google xử lý popup Google */}
      <button
        type="button"
        onClick={onGoogleLogin}
        disabled={googleLoading}
        className="w-full bg-white/5 border border-white/10 text-white font-medium
                   py-3 rounded-xl flex items-center justify-center gap-3
                   hover:bg-white/10 transition-all
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

    </form>
  );
}

// ─── LoginPage ────────────────────────────────────────
export default function LoginPage() {
  const navigate      = useNavigate();
  const [loading, setLoading]           = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]               = useState(null);

  // Hàm điều hướng theo role sau khi login thành công
  const redirectByRole = (role) => {
    if (role === "CLIENT") navigate("/client/dashboard");
    else if (role === "EXPERT") navigate("/expert/dashboard");
    else if (role === "ADMIN") navigate("/admin/dashboard");
    else navigate("/");
  };

  // Login thường
  const handleLogin = async (formData) => {
    setLoading(true);
    setError(null);
    const result = await authService.login(formData);
    if (result.success) {
      redirectByRole(result.role);
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  // Google Login
  // useGoogleLogin: mở popup Google, nhận access_token sau khi user đồng ý
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setError(null);
      // tokenResponse.access_token = token Google cấp
      // Gửi token này lên BE để BE verify với Google API
      const result = await authService.loginWithGoogle(tokenResponse.access_token);
      if (result.success) {
        redirectByRole(result.role);
      } else {
        setError(result.message);
      }
      setGoogleLoading(false);
    },
    onError: () => {
      setError("Google login failed. Please try again.");
    },
  });

  return (
    <div className="bg-[#12151B] text-white min-h-screen">
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-neural p-4">
        <article className="w-full max-w-md glass-panel rounded-2xl p-8 md:p-10 shadow-2xl">

          <header className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 text-white">Welcome Back</h1>
            <p className="text-gray-400 text-sm">
              Enter your credentials to access the grid.
            </p>
          </header>

          <LoginForm
            onSubmit={handleLogin}
            onGoogleLogin={handleGoogleLogin}
            loading={loading}
            googleLoading={googleLoading}
            error={error}
          />

          <p className="text-center text-sm text-gray-400 mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-cyan-400 font-semibold hover:underline ml-1">
              Register
            </Link>
          </p>

        </article>
      </div>
    </div>
  );
}