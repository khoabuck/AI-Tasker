// src/modules/auth/pages/OAuthCallbackPage.jsx
// Trang bắt token sau khi Google OAuth redirect về FE
// URL: /oauth/callback?token=xxx&status=xxx

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axiosInstance from "../../../api/axiosInstance";
import { useAuth } from "../../../context/AuthContext";

const getNextPath = (user) => {
  const role = String(user?.role || "").toUpperCase();
  const status = String(user?.status || "").toUpperCase();

  if (status === "PENDING_ROLE" || !role) return "/select-role";

  if (status === "PENDING_PROFILE") {
    if (role === "EXPERT") return "/expert/setup-profile";
    if (role === "CLIENT") return "/setup-profile";
    return "/select-role";
  }

  if (status === "ACTIVE") {
    if (role === "CLIENT") return "/client/dashboard";
    if (role === "EXPERT") return "/expert/dashboard";
    if (role === "ADMIN") return "/admin/dashboard";
  }

  return "/login";
};

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setError("Không tìm thấy token. Vui lòng thử lại.");
        return;
      }

      try {
        localStorage.setItem("accessToken", token);

        const res = await axiosInstance.get("/auth/me");
        const user = res.data?.data || res.data;

        localStorage.setItem("user", JSON.stringify(user));

        await refreshUser();

        navigate(getNextPath(user), { replace: true });
      } catch (err) {
        console.error("OAUTH CALLBACK ERROR:", err?.response?.data || err);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        setError("Xác thực thất bại. Vui lòng thử lại.");
      }
    };

    handleOAuthCallback();
  }, [navigate, refreshUser, searchParams]);

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#101319",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, sans-serif",
          color: "#e1e2eb",
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 64, color: "#f87171", marginBottom: 16 }}
        >
          error
        </span>
        <h2
          style={{
            fontFamily: "Hanken Grotesk, sans-serif",
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          Authentication Failed
        </h2>
        <p style={{ color: "#8c90a0", marginBottom: 24 }}>{error}</p>
        <button
          onClick={() => navigate("/login")}
          style={{
            padding: "12px 32px",
            background: "#00F0FF",
            color: "#002022",
            fontWeight: 700,
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontFamily: "Hanken Grotesk, sans-serif",
            fontSize: 15,
          }}
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#101319",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, sans-serif",
        color: "#e1e2eb",
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: 64,
          color: "#00F0FF",
          marginBottom: 16,
          animation: "spin 1s linear infinite",
        }}
      >
        autorenew
      </span>
      <h2
        style={{
          fontFamily: "Hanken Grotesk, sans-serif",
          fontSize: 24,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        Signing you in...
      </h2>
      <p style={{ color: "#8c90a0" }}>
        Please wait while we verify your account.
      </p>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
