// src/modules/client/pages/ClientProfilePage.jsx
// GET /api/client-profiles/me — lấy thông tin profile client

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";
import authService from "../../../services/auth.service";

export default function ClientProfilePage() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── TODO (BE): Khi BE thêm endpoint GET /api/client-profiles/me thì không cần sửa gì ──
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axiosInstance.get("/client-profiles/me");
        setProfile(res.data);
      } catch (err) {
        setError(err?.response?.data?.message || "Không thể tải thông tin profile.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const infoItem = (icon, label, value) => (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(0,240,255,0.08)", border: "1px solid rgba(0,240,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#00F0FF" }}>{icon}</span>
      </div>
      <div>
        <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", marginBottom: 4 }}>{label}</p>
        <p style={{ color: "#e1e2eb", fontSize: 15 }}>{value || "—"}</p>
      </div>
    </div>
  );

  return (
    <ClientLayout>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 32, fontWeight: 700, color: "#e1e2eb", marginBottom: 8 }}>
            My Profile
          </h1>
          <p style={{ color: "#c2c6d6" }}>Thông tin tài khoản và hồ sơ của bạn</p>
        </div>

        {/* User card */}
        <div style={{ background: "rgba(16,19,25,0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 32, marginBottom: 24, display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#1772eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "#fff", fontFamily: "Hanken Grotesk, sans-serif", flexShrink: 0 }}>
            {user?.fullName?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "CL"}
          </div>
          <div>
            <h2 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 22, fontWeight: 700, color: "#e1e2eb", marginBottom: 4 }}>
              {user?.fullName}
            </h2>
            <p style={{ color: "#8c90a0", fontSize: 14 }}>{user?.email}</p>
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", background: "rgba(0,240,255,0.1)", border: "1px solid rgba(0,240,255,0.3)", color: "#00F0FF" }}>
                {user?.role || "CLIENT"}
              </span>
              <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80" }}>
                {user?.status || "ACTIVE"}
              </span>
            </div>
          </div>
        </div>

        {/* Profile info */}
        {loading && (
          <div style={{ textAlign: "center", padding: 48, color: "#8c90a0" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, display: "block", marginBottom: 12 }}>hourglass_empty</span>
            Đang tải thông tin...
          </div>
        )}

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: 24, color: "#f87171", textAlign: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, display: "block", marginBottom: 8 }}>error</span>
            {error}
          </div>
        )}

        {profile && !loading && (
          <div style={{ background: "rgba(16,19,25,0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 32 }}>

            {/* Section: Thông tin cơ bản */}
            <h3 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em", color: "#00F0FF", marginBottom: 8 }}>
              Thông tin cơ bản
            </h3>

            {infoItem("phone", "Số điện thoại", profile.phoneNumber)}
            {infoItem("location_on", "Địa chỉ", profile.address)}
            {infoItem("psychology", "Nhu cầu AI", profile.aiNeeds)}
            {infoItem("troubleshoot", "Vấn đề chính", profile.mainProblems)}
            {infoItem("payments", "Ngân sách dự kiến", profile.expectedBudgetMin && profile.expectedBudgetMax ? `$${profile.expectedBudgetMin} — $${profile.expectedBudgetMax} USD` : null)}

            {/* Section: Doanh nghiệp (nếu có) */}
            {profile.companyName && (
              <>
                <h3 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em", color: "#00F0FF", marginTop: 32, marginBottom: 8 }}>
                  Thông tin doanh nghiệp
                </h3>
                {infoItem("corporate_fare", "Tên công ty", profile.companyName)}
                {infoItem("tag", "Mã số thuế", profile.taxCode)}
                {infoItem("category", "Ngành nghề", profile.industry)}
                {infoItem("location_city", "Địa chỉ công ty", profile.companyAddress)}
                {infoItem("mail", "Email doanh nghiệp", profile.businessEmail)}
                {infoItem("call", "Điện thoại doanh nghiệp", profile.businessPhone)}
              </>
            )}

            {/* Edit button */}
            <div style={{ marginTop: 32, display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => navigate("/client/profile/edit")}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "rgba(0,240,255,0.05)", border: "1px solid rgba(0,240,255,0.3)", borderRadius: 8, color: "#00F0FF", fontWeight: 600, fontSize: 14, cursor: "pointer", transition: "all 0.2s", fontFamily: "Inter, sans-serif" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,240,255,0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,240,255,0.05)")}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                Chỉnh sửa hồ sơ
              </button>
            </div>
          </div>
        )}

      </div>
    </ClientLayout>
  );
}