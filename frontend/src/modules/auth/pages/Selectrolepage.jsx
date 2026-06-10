// src/modules/auth/pages/SelectRolePage.jsx
// POST /api/auth/select-role { "role": "CLIENT" | "EXPERT" }
// Gọi sau khi verify email xong, status = PENDING_ROLE

import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axiosInstance";

const BG_IMAGE = "https://lh3.googleusercontent.com/aida/ADBb0uiAogMCN4ONd1eV0ckwyeNv8QfTOCxlvbOfag-KSL1Cdba-otv2YjPez9ovCM3FL-qyGKTDeVirDziA80hhQSTs6XXast-3vn_rIy5jZgYjYUXxWbn7589Hj6JdyzhvkZYNXQ9pQUbNptjiPkROg5Kp1z8ZHsKZL28Xmx-Rtm9fYag14W6IkJdjjWBtwCUOnpOhakWfAR9l6aohBmWnTPgav2fsqTD4ZFoyetZhmIs7tPIQxkGVlrRy0gVd";

const ROLES = [
  {
    key: "CLIENT",
    icon: "corporate_fare",
    title: "Client",
    desc: "Tôi muốn thuê AI Expert để thực hiện dự án",
    features: ["Đăng job tuyển dụng", "AI Matching chuyên gia", "Quản lý dự án & thanh toán"],
    color: "#00F0FF",
  },
  {
    key: "EXPERT",
    icon: "psychology",
    title: "AI Expert",
    desc: "Tôi là chuyên gia AI muốn nhận dự án",
    features: ["Nhận job phù hợp", "AI gợi ý công việc", "Xây dựng portfolio"],
    color: "#adc6ff",
  },
];

export default function SelectRolePage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
  if (!selected) return;

  setLoading(true);
  setError("");

  try {
    await axiosInstance.post("/auth/select-role", { role: selected });

    await refreshUser();

    if (selected === "EXPERT") {
      navigate("/expert/setup-profile", { replace: true });
    } else {
      navigate("/setup-profile", { replace: true });
    }
  } catch (err) {
    setError(err?.response?.data?.message || "Đã có lỗi xảy ra.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div style={{ background: "#12151B", color: "#e1e2eb", minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif" }}>

      {/* Navbar */}
      <nav style={{ position: "fixed", top: 0, width: "100%", zIndex: 50, background: "rgba(18,21,27,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 48px", height: 80, display: "flex", alignItems: "center" }}>
          <span style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>
            <span style={{ color: "#00F0FF" }}>AI</span>{" "}
            <span style={{ color: "#e1e2eb" }}>Tasker</span>
          </span>
        </div>
      </nav>

      {/* Main */}
      <main style={{ flex: 1, paddingTop: 128, paddingBottom: 96, backgroundImage: `linear-gradient(rgba(18,21,27,0.7), rgba(18,21,27,0.7)), url('${BG_IMAGE}')`, backgroundSize: "cover", backgroundPosition: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 16px" }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 40, fontWeight: 700, color: "#e1e2eb", marginBottom: 12 }}>
              Bạn là ai?
            </h1>
            <p style={{ color: "#c2c6d6", fontSize: 16 }}>
              Chọn vai trò của bạn để cá nhân hóa trải nghiệm
            </p>
          </div>

          {/* Role Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
            {ROLES.map((role) => {
              const isSelected = selected === role.key;
              return (
                <div
                  key={role.key}
                  onClick={() => setSelected(role.key)}
                  style={{ background: isSelected ? `rgba(${role.key === "CLIENT" ? "0,240,255" : "173,198,255"},0.05)` : "rgba(18,21,27,0.8)", backdropFilter: "blur(24px)", border: `2px solid ${isSelected ? role.color : "rgba(255,255,255,0.1)"}`, borderRadius: 16, padding: 32, cursor: "pointer", transition: "all 0.2s", boxShadow: isSelected ? `0 0 20px ${role.color}22` : "none" }}
                >
                  {/* Icon */}
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: isSelected ? `${role.color}15` : "rgba(255,255,255,0.05)", border: `1px solid ${isSelected ? role.color : "rgba(255,255,255,0.1)"}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 28, color: isSelected ? role.color : "#8c90a0" }}>{role.icon}</span>
                  </div>

                  {/* Title */}
                  <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 22, fontWeight: 700, color: isSelected ? role.color : "#e1e2eb", marginBottom: 8 }}>
                    {role.title}
                  </h3>
                  <p style={{ fontSize: 14, color: "#8c90a0", marginBottom: 20, lineHeight: 1.6 }}>
                    {role.desc}
                  </p>

                  {/* Features */}
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                    {role.features.map((f) => (
                      <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#c2c6d6" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: isSelected ? role.color : "#414754" }}>check_circle</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* Selected indicator */}
                  {isSelected && (
                    <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 6, color: role.color, fontSize: 13, fontWeight: 600 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                      Đã chọn
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "12px 16px", color: "#f87171", fontSize: 14, marginBottom: 16, textAlign: "center" }}>
              {error}
            </div>
          )}

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            disabled={!selected || loading}
            style={{ width: "100%", background: selected ? "#00F0FF" : "rgba(255,255,255,0.05)", color: selected ? "#002022" : "#414754", fontFamily: "Hanken Grotesk, sans-serif", fontWeight: 700, fontSize: 16, padding: "18px", borderRadius: 12, border: "none", cursor: selected && !loading ? "pointer" : "not-allowed", transition: "all 0.2s", boxShadow: selected ? "0 0 20px rgba(0,240,255,0.3)" : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            {loading ? (
              <><span className="material-symbols-outlined">progress_activity</span><span>Đang xử lý...</span></>
            ) : (
              <><span>Xác nhận & Tiếp tục</span><span className="material-symbols-outlined">arrow_forward</span></>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}