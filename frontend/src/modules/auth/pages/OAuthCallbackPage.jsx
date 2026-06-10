// src/modules/auth/pages/OAuthCallbackPage.jsx
// Trang bắt token sau khi Google OAuth redirect về FE
// URL: /oauth/callback?token=xxx&status=xxx

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axiosInstance from "../../../api/axiosInstance";

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setError("Không tìm thấy token. Vui lòng thử lại.");
      return;
    }

    // Lưu token vào localStorage
    localStorage.setItem("accessToken", token);

    // Gọi /auth/me để lấy thông tin user và status mới nhất
    axiosInstance.get("/auth/me")
      .then((res) => {
        const user = res.data;
        localStorage.setItem("user", JSON.stringify(user));

        // Redirect theo status
        if (user.status === "PENDING_ROLE") {
          navigate("/select-role");
        } else if (user.status === "PENDING_PROFILE") {
          navigate("/setup-profile");
        } else if (user.status === "ACTIVE") {
          if (user.role === "CLIENT") navigate("/client/dashboard");
          else if (user.role === "EXPERT") navigate("/expert/dashboard");
          else if (user.role === "ADMIN") navigate("/admin/dashboard");
          else navigate("/");
        } else {
          navigate("/login");
        }
      })
      .catch(() => {
        localStorage.removeItem("accessToken");
        setError("Xác thực thất bại. Vui lòng thử lại.");
      });
  }, []);

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "#101319", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", color: "#e1e2eb" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 64, color: "#f87171", marginBottom: 16 }}>error</span>
        <h2 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Authentication Failed</h2>
        <p style={{ color: "#8c90a0", marginBottom: 24 }}>{error}</p>
        <button onClick={() => navigate("/login")}
          style={{ padding: "12px 32px", background: "#00F0FF", color: "#002022", fontWeight: 700, borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15 }}>
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#101319", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", color: "#e1e2eb" }}>
      <span className="material-symbols-outlined" style={{ fontSize: 64, color: "#00F0FF", marginBottom: 16, animation: "spin 1s linear infinite" }}>autorenew</span>
      <h2 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Signing you in...</h2>
      <p style={{ color: "#8c90a0" }}>Please wait while we verify your account.</p>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}