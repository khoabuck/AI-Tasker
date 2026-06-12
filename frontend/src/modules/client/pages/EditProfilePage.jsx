// src/modules/client/pages/EditProfilePage.jsx
// Trang chỉnh sửa profile — chỉ dùng khi đã có profile (status ACTIVE)
// Individual: không có API update → TODO khi BE làm
// Business:   PUT /api/client-profiles/business/resubmit

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";

const inputStyle = {
  background: "#232A35", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8,
  padding: "12px 16px", color: "#e1e2eb", width: "100%", outline: "none",
  fontFamily: "Inter, sans-serif", fontSize: 14, boxSizing: "border-box",
};

const labelStyle = {
  display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 11,
  textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", marginBottom: 6,
};

export default function EditProfilePage() {
  const navigate = useNavigate();
  const [clientType, setClientType] = useState("individual");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  const [individual, setIndividual] = useState({
    phoneNumber: "", address: "", aiNeeds: "", mainProblems: "",
    expectedBudgetMin: "", expectedBudgetMax: "",
  });

  const [business, setBusiness] = useState({
    phoneNumber: "", address: "", aiNeeds: "", mainProblems: "",
    expectedBudgetMin: "", expectedBudgetMax: "",
    companyName: "", taxCode: "", industry: "",
    companyAddress: "", businessEmail: "", businessPhone: "",
  });

  // Load data cũ từ API
  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosInstance.get("/client-profiles/me");
        const data = res.data;
        const isBusiness = !!data.companyName;
        setClientType(isBusiness ? "business" : "individual");

        const common = {
          phoneNumber: data.phoneNumber || "",
          address: data.address || "",
          aiNeeds: data.aiNeeds || "",
          mainProblems: data.mainProblems || "",
          expectedBudgetMin: data.expectedBudgetMin || "",
          expectedBudgetMax: data.expectedBudgetMax || "",
        };

        if (isBusiness) {
          setBusiness({
            ...common,
            companyName: data.companyName || "",
            taxCode: data.taxCode || "",
            industry: data.industry || "",
            companyAddress: data.companyAddress || "",
            businessEmail: data.businessEmail || "",
            businessPhone: data.businessPhone || "",
          });
        } else {
          setIndividual(common);
        }
      } catch {
        setError("Không thể tải thông tin profile.");
      } finally {
        setFetching(false);
      }
    };
    load();
  }, []);

  const handleIndividualChange = (e) => {
    setIndividual((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleBusinessChange = (e) => {
    setBusiness((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (clientType === "individual") {
        // TODO (BE): Khi BE có API update individual thì thêm vào đây
        // Hiện tại chưa có API update individual → báo lỗi
        setError("Chức năng cập nhật profile cá nhân đang được phát triển.");
        setLoading(false);
        return;
      } else {
        // PUT /api/client-profiles/business/resubmit
        await axiosInstance.put("/client-profiles/business/resubmit", {
          phoneNumber: business.phoneNumber,
          address: business.address,
          aiNeeds: business.aiNeeds,
          mainProblems: business.mainProblems,
          expectedBudgetMin: Number(business.expectedBudgetMin),
          expectedBudgetMax: Number(business.expectedBudgetMax),
          companyName: business.companyName,
          taxCode: business.taxCode,
          industry: business.industry,
          companyAddress: business.companyAddress,
          businessEmail: business.businessEmail,
          businessPhone: business.businessPhone,
        });
      }
      navigate("/client/profile");
    } catch (err) {
      setError(err?.response?.data?.message || "Đã có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <ClientLayout>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "#8c90a0" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40 }}>hourglass_empty</span>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "48px 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
          <button onClick={() => navigate("/client/profile")}
            style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#e1e2eb" }}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 28, fontWeight: 700, color: "#e1e2eb", marginBottom: 4 }}>
              Edit profile
            </h1>
            <p style={{ color: "#8c90a0", fontSize: 14 }}>Update your information</p>
          </div>
        </div>

        {/* Client Type Toggle */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {[
            { key: "individual", icon: "person", label: "Individual" },
            { key: "business", icon: "corporate_fare", label: "Business" },
          ].map((t) => (
            <button key={t.key} type="button" onClick={() => setClientType(t.key)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 16px", borderRadius: 8, border: `1px solid ${clientType === t.key ? "#00F0FF" : "rgba(255,255,255,0.12)"}`, background: clientType === t.key ? "rgba(0,240,255,0.05)" : "rgba(29,32,38,0.5)", color: clientType === t.key ? "#00F0FF" : "#8c90a0", cursor: "pointer", transition: "all 0.2s", fontWeight: 600 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <div style={{ background: "rgba(16,19,25,0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 32 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Common */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Phone Number</label>
                  <input type="text" name="phoneNumber"
                    value={clientType === "individual" ? individual.phoneNumber : business.phoneNumber}
                    onChange={clientType === "individual" ? handleIndividualChange : handleBusinessChange}
                    placeholder="0912345678" style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                </div>
                <div>
                  <label style={labelStyle}>Address</label>
                  <input type="text" name="address"
                    value={clientType === "individual" ? individual.address : business.address}
                    onChange={clientType === "individual" ? handleIndividualChange : handleBusinessChange}
                    placeholder="TP. Hồ Chí Minh" style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>The need for AI</label>
                <textarea name="aiNeeds"
                  value={clientType === "individual" ? individual.aiNeeds : business.aiNeeds}
                  onChange={clientType === "individual" ? handleIndividualChange : handleBusinessChange}
                  rows={3} style={{ ...inputStyle, resize: "none" }}
                  onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
              </div>

              <div>
                <label style={labelStyle}>Main Problems</label>
                <textarea name="mainProblems"
                  value={clientType === "individual" ? individual.mainProblems : business.mainProblems}
                  onChange={clientType === "individual" ? handleIndividualChange : handleBusinessChange}
                  rows={3} style={{ ...inputStyle, resize: "none" }}
                  onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Minimum Budget (USD)</label>
                  <input type="number" name="expectedBudgetMin"
                    value={clientType === "individual" ? individual.expectedBudgetMin : business.expectedBudgetMin}
                    onChange={clientType === "individual" ? handleIndividualChange : handleBusinessChange}
                    placeholder="500" style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                </div>
                <div>
                  <label style={labelStyle}>Maximum Budget (USD)</label>
                  <input type="number" name="expectedBudgetMax"
                    value={clientType === "individual" ? individual.expectedBudgetMax : business.expectedBudgetMax}
                    onChange={clientType === "individual" ? handleIndividualChange : handleBusinessChange}
                    placeholder="5000" style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                </div>
              </div>

              {/* Business only */}
              {clientType === "business" && (
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 20 }}>
                  <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#00F0FF", marginBottom: 16 }}>
                    Business Information
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <label style={labelStyle}>Company Name</label>
                        <input type="text" name="companyName" value={business.companyName} onChange={handleBusinessChange}
                          style={inputStyle} onFocus={(e) => (e.target.style.borderColor = "#00F0FF")} onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                      </div>
                      <div>
                        <label style={labelStyle}>Tax Code</label>
                        <input type="text" name="taxCode" value={business.taxCode} onChange={handleBusinessChange}
                          style={inputStyle} onFocus={(e) => (e.target.style.borderColor = "#00F0FF")} onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Industry</label>
                      <input type="text" name="industry" value={business.industry} onChange={handleBusinessChange}
                        style={inputStyle} onFocus={(e) => (e.target.style.borderColor = "#00F0FF")} onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                    </div>
                    <div>
                      <label style={labelStyle}>Company Address</label>
                      <input type="text" name="companyAddress" value={business.companyAddress} onChange={handleBusinessChange}
                        style={inputStyle} onFocus={(e) => (e.target.style.borderColor = "#00F0FF")} onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <label style={labelStyle}>Business Email</label>
                        <input type="email" name="businessEmail" value={business.businessEmail} onChange={handleBusinessChange}
                          style={inputStyle} onFocus={(e) => (e.target.style.borderColor = "#00F0FF")} onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                      </div>
                      <div>
                        <label style={labelStyle}>Business Phone</label>
                        <input type="text" name="businessPhone" value={business.businessPhone} onChange={handleBusinessChange}
                          style={inputStyle} onFocus={(e) => (e.target.style.borderColor = "#00F0FF")} onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "12px 16px", color: "#f87171", fontSize: 14 }}>
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" onClick={() => navigate("/client/profile")}
                  style={{ flex: 1, padding: "14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#e1e2eb", cursor: "pointer", fontWeight: 600, fontFamily: "Inter, sans-serif", fontSize: 15 }}>
                  Hủy
                </button>
                <button type="submit" disabled={loading}
                  style={{ flex: 2, background: "#00F0FF", color: "#002022", fontFamily: "Hanken Grotesk, sans-serif", fontWeight: 700, fontSize: 15, padding: "14px", borderRadius: 8, border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, boxShadow: "0 0 20px rgba(0,240,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {loading ? (
                    <><span className="material-symbols-outlined">progress_activity</span><span>Đang lưu...</span></>
                  ) : (
                    <><span>Lưu thay đổi</span><span className="material-symbols-outlined">save</span></>
                  )}
                </button>
              </div>

            </div>
          </form>
        </div>
      </div>
    </ClientLayout>
  );
}