// src/modules/auth/pages/SetupProfilePage.jsx
// Individual: POST /api/client-profiles/individual
// Business:   POST /api/client-profiles/business
// Edit mode:  PUT  /api/client-profiles/business/resubmit (business)
// GET data:   GET  /api/client-profiles/me

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axiosInstance";

const BG_IMAGE = "https://lh3.googleusercontent.com/aida/ADBb0uiAogMCN4ONd1eV0ckwyeNv8QfTOCxlvbOfag-KSL1Cdba-otv2YjPez9ovCM3FL-qyGKTDeVirDziA80hhQSTs6XXast-3vn_rIy5jZgYjYUXxWbn7589Hj6JdyzhvkZYNXQ9pQUbNptjiPkROg5Kp1z8ZHsKZL28Xmx-Rtm9fYag14W6IkJdjjWBtwCUOnpOhakWfAR9l6aohBmWnTPgav2fsqTD4ZFoyetZhmIs7tPIQxkGVlrRy0gVd";

const inputStyle = {
  background: "#232A35", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8,
  padding: "12px 16px", color: "#e1e2eb", width: "100%", outline: "none",
  fontFamily: "Inter, sans-serif", fontSize: 14, boxSizing: "border-box",
};

const labelStyle = {
  display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 11,
  textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", marginBottom: 6,
};

export default function SetupProfilePage() {
  const navigate = useNavigate();
  const [clientType, setClientType] = useState("individual");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [isEdit, setIsEdit] = useState(false); // true nếu đã có profile

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

  // Load data cũ nếu đã có profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await axiosInstance.get("/client-profiles/me");
        const data = res.data;
        setIsEdit(true);

        // Xác định loại profile
        const isBusiness = !!data.companyName;
        setClientType(isBusiness ? "business" : "individual");

        const commonFields = {
          phoneNumber: data.phoneNumber || "",
          address: data.address || "",
          aiNeeds: data.aiNeeds || "",
          mainProblems: data.mainProblems || "",
          expectedBudgetMin: data.expectedBudgetMin || "",
          expectedBudgetMax: data.expectedBudgetMax || "",
        };

        if (isBusiness) {
          setBusiness({
            ...commonFields,
            companyName: data.companyName || "",
            taxCode: data.taxCode || "",
            industry: data.industry || "",
            companyAddress: data.companyAddress || "",
            businessEmail: data.businessEmail || "",
            businessPhone: data.businessPhone || "",
          });
        } else {
          setIndividual(commonFields);
        }
      } catch {
        // Chưa có profile → tạo mới, không báo lỗi
        setIsEdit(false);
      } finally {
        setFetching(false);
      }
    };
    loadProfile();
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
        // POST /api/client-profiles/individual (tạo mới)
        // TODO (BE): nếu BE có PUT để update individual thì dùng PUT khi isEdit
        await axiosInstance.post("/client-profiles/individual", {
          phoneNumber: individual.phoneNumber,
          address: individual.address,
          aiNeeds: individual.aiNeeds,
          mainProblems: individual.mainProblems,
          expectedBudgetMin: Number(individual.expectedBudgetMin),
          expectedBudgetMax: Number(individual.expectedBudgetMax),
        });
      } else {
        if (isEdit) {
          // PUT /api/client-profiles/business/resubmit (cập nhật)
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
        } else {
          // POST /api/client-profiles/business (tạo mới)
          await axiosInstance.post("/client-profiles/business", {
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
      <div style={{ background: "#12151B", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#8c90a0", fontFamily: "Inter, sans-serif" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 40 }}>hourglass_empty</span>
      </div>
    );
  }

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
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 16px" }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 36, fontWeight: 700, color: "#e1e2eb", marginBottom: 8 }}>
              {isEdit ? "Chỉnh sửa hồ sơ" : "Hoàn thiện hồ sơ"}
            </h1>
            <p style={{ color: "#c2c6d6", fontSize: 15 }}>
              {isEdit ? "Cập nhật thông tin của bạn" : "Giúp chúng tôi hiểu hơn về nhu cầu của bạn"}
            </p>
          </div>

          {/* Client Type Toggle */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
            {[
              { key: "individual", icon: "person", label: "Cá nhân" },
              { key: "business", icon: "corporate_fare", label: "Doanh nghiệp" },
            ].map((t) => (
              <button key={t.key} type="button" onClick={() => setClientType(t.key)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 16px", borderRadius: 8, border: `1px solid ${clientType === t.key ? "#00F0FF" : "rgba(255,255,255,0.12)"}`, background: clientType === t.key ? "rgba(0,240,255,0.05)" : "rgba(29,32,38,0.5)", color: clientType === t.key ? "#00F0FF" : "#8c90a0", cursor: "pointer", transition: "all 0.2s", fontWeight: 600 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Form Card */}
          <div style={{ background: "rgba(18,21,27,0.8)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 40, boxShadow: "0 8px 32px rgba(0,0,0,0.8)" }}>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Common fields */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Số điện thoại</label>
                    <input type="text" name="phoneNumber"
                      value={clientType === "individual" ? individual.phoneNumber : business.phoneNumber}
                      onChange={clientType === "individual" ? handleIndividualChange : handleBusinessChange}
                      placeholder="0912345678" style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                  </div>
                  <div>
                    <label style={labelStyle}>Địa chỉ</label>
                    <input type="text" name="address"
                      value={clientType === "individual" ? individual.address : business.address}
                      onChange={clientType === "individual" ? handleIndividualChange : handleBusinessChange}
                      placeholder="TP. Hồ Chí Minh" style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Nhu cầu AI của bạn</label>
                  <textarea name="aiNeeds"
                    value={clientType === "individual" ? individual.aiNeeds : business.aiNeeds}
                    onChange={clientType === "individual" ? handleIndividualChange : handleBusinessChange}
                    placeholder="Mô tả bạn cần AI làm gì..." rows={3}
                    style={{ ...inputStyle, resize: "none" }}
                    onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                </div>

                <div>
                  <label style={labelStyle}>Vấn đề chính cần giải quyết</label>
                  <textarea name="mainProblems"
                    value={clientType === "individual" ? individual.mainProblems : business.mainProblems}
                    onChange={clientType === "individual" ? handleIndividualChange : handleBusinessChange}
                    placeholder="Mô tả những vấn đề bạn đang gặp phải..." rows={3}
                    style={{ ...inputStyle, resize: "none" }}
                    onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Ngân sách tối thiểu (USD)</label>
                    <input type="number" name="expectedBudgetMin"
                      value={clientType === "individual" ? individual.expectedBudgetMin : business.expectedBudgetMin}
                      onChange={clientType === "individual" ? handleIndividualChange : handleBusinessChange}
                      placeholder="500" style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                  </div>
                  <div>
                    <label style={labelStyle}>Ngân sách tối đa (USD)</label>
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
                      Thông tin doanh nghiệp
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div>
                          <label style={labelStyle}>Tên công ty</label>
                          <input type="text" name="companyName" value={business.companyName} onChange={handleBusinessChange}
                            placeholder="AITasker Inc." style={inputStyle}
                            onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                        </div>
                        <div>
                          <label style={labelStyle}>Mã số thuế</label>
                          <input type="text" name="taxCode" value={business.taxCode} onChange={handleBusinessChange}
                            placeholder="0123456789" style={inputStyle}
                            onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Ngành nghề</label>
                        <input type="text" name="industry" value={business.industry} onChange={handleBusinessChange}
                          placeholder="Công nghệ thông tin..." style={inputStyle}
                          onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                      </div>
                      <div>
                        <label style={labelStyle}>Địa chỉ công ty</label>
                        <input type="text" name="companyAddress" value={business.companyAddress} onChange={handleBusinessChange}
                          placeholder="123 Nguyễn Huệ, Q.1, TP.HCM" style={inputStyle}
                          onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div>
                          <label style={labelStyle}>Email doanh nghiệp</label>
                          <input type="email" name="businessEmail" value={business.businessEmail} onChange={handleBusinessChange}
                            placeholder="contact@company.com" style={inputStyle}
                            onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                        </div>
                        <div>
                          <label style={labelStyle}>Điện thoại doanh nghiệp</label>
                          <input type="text" name="businessPhone" value={business.businessPhone} onChange={handleBusinessChange}
                            placeholder="028 1234 5678" style={inputStyle}
                            onFocus={(e) => (e.target.style.borderColor = "#00F0FF")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
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
                  {isEdit && (
                    <button type="button" onClick={() => navigate("/client/profile")}
                      style={{ flex: 1, padding: "16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#e1e2eb", cursor: "pointer", fontWeight: 600, fontFamily: "Inter, sans-serif", fontSize: 15 }}>
                      Hủy
                    </button>
                  )}
                  <button type="submit" disabled={loading}
                    style={{ flex: 2, background: "#00F0FF", color: "#002022", fontFamily: "Hanken Grotesk, sans-serif", fontWeight: 700, fontSize: 16, padding: "16px", borderRadius: 8, border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, boxShadow: "0 0 20px rgba(0,240,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    {loading ? (
                      <><span className="material-symbols-outlined">progress_activity</span><span>Đang lưu...</span></>
                    ) : isEdit ? (
                      <><span>Lưu thay đổi</span><span className="material-symbols-outlined">save</span></>
                    ) : (
                      <><span>Hoàn tất & Vào Dashboard</span><span className="material-symbols-outlined">arrow_forward</span></>
                    )}
                  </button>
                </div>

              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}