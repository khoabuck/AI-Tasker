// src/modules/client/pages/EditProfilePage.jsx
// Individual: PUT /api/client-profiles/individual/me
// Business:   PUT /api/client-profiles/business/me

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";

const getInputStyle = (fieldName, fieldErrors) => ({
  background: "#232A35",
  border: `1px solid ${fieldErrors[fieldName] ? "#ef4444" : "rgba(255,255,255,0.12)"}`,
  borderRadius: 8,
  padding: "12px 16px",
  color: "#e1e2eb",
  width: "100%",
  outline: "none",
  fontFamily: "Inter, sans-serif",
  fontSize: 14,
  boxSizing: "border-box",
  transition: "border-color 0.2s",
});

const labelStyle = {
  display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 11,
  textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c90a0", marginBottom: 6,
};

function FieldError({ name, errors }) {
  if (!errors[name]) return null;
  return (
    <p style={{ fontSize: 12, color: "#f87171", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>error</span>
      {errors[name]}
    </p>
  );
}

export default function EditProfilePage() {
  const navigate = useNavigate();
  const [clientType, setClientType] = useState("individual");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [globalError, setGlobalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [individual, setIndividual] = useState({
    fullName: "",
    phoneNumber: "",
    address: "",
    aiNeeds: "",
    mainProblems: "",
    expectedBudgetMin: "",
    expectedBudgetMax: "",
    avatarUrl: "",
  });

  const [business, setBusiness] = useState({
    fullName: "",
    phoneNumber: "",
    address: "",
    aiNeeds: "",
    mainProblems: "",
    expectedBudgetMin: "",
    expectedBudgetMax: "",
    avatarUrl: "",
    companyName: "",
    taxCode: "",
    industry: "",
    companyAddress: "",
    businessEmail: "",
    businessPhone: "",
  });

  // ── Load data cũ ─────────────────────────────────────────────────
  useEffect(() => {
  const load = async () => {
    try {
      const res = await axiosInstance.get("/client-profiles/me");
      const data = res.data;

      console.log("CLIENT PROFILE:", data);

      const businessProfile = data.businessProfile || null;
      const isBusiness = !!businessProfile;

      const common = {
        fullName: data.fullName || data.name || "",
        phoneNumber: data.phoneNumber || "",
        address: data.address || "",
        aiNeeds: data.aiNeeds || "",
        mainProblems: data.mainProblems || "",
        expectedBudgetMin: data.expectedBudgetMin ?? "",
        expectedBudgetMax: data.expectedBudgetMax ?? "",
        avatarUrl: data.avatarUrl || "",
      };

      if (isBusiness) {
        setClientType("business");

        setBusiness({
          ...common,
          companyName: businessProfile.companyName || "",
          taxCode: businessProfile.taxCode || "",
          industry: businessProfile.industry || "",
          companyAddress: businessProfile.companyAddress || "",
          businessEmail: businessProfile.businessEmail || "",
          businessPhone: businessProfile.businessPhone || "",
        });
      } else {
        setClientType("individual");
        setIndividual(common);
      }
    } catch (err) {
      console.error("Load profile error:", err);
      setGlobalError("Không thể tải thông tin profile.");
    } finally {
      setFetching(false);
    }
  };

  load();
}, []);

  const handleIndividualChange = (e) => {
    const { name, value } = e.target;
    setIndividual((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: null }));
    setGlobalError("");
  };

  const handleBusinessChange = (e) => {
    const { name, value } = e.target;
    setBusiness((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: null }));
    setGlobalError("");
  };

  // ── FE Validate ───────────────────────────────────────────────────
  const validateForm = () => {
    const errors = {};
    const f = clientType === "individual" ? individual : business;

    const phoneClean = f.phoneNumber.replace(/[\s\-\.]/g, "");
    if (!f.phoneNumber.trim()) {
      errors.phoneNumber = "Số điện thoại không được để trống.";
    } else if (
      !/^(0[3-9]\d{8})$/.test(phoneClean) &&
      !/^(\+84[3-9]\d{8})$/.test(phoneClean) &&
      !/^(84[3-9]\d{8})$/.test(phoneClean)
    ) {
      errors.phoneNumber = "Số điện thoại không hợp lệ (vd: 0912345678).";
    }

    if (!f.address.trim()) {
      errors.address = "Địa chỉ không được để trống.";
    } else if (f.address.trim().length < 5) {
      errors.address = "Địa chỉ quá ngắn (tối thiểu 5 ký tự).";
    }

    if (!f.aiNeeds.trim()) {
      errors.aiNeeds = "Vui lòng mô tả nhu cầu AI.";
    } else if (f.aiNeeds.trim().length < 10) {
      errors.aiNeeds = "Mô tả quá ngắn (tối thiểu 10 ký tự).";
    }

    if (!f.mainProblems.trim()) {
      errors.mainProblems = "Vui lòng mô tả vấn đề chính.";
    } else if (f.mainProblems.trim().length < 10) {
      errors.mainProblems = "Mô tả quá ngắn (tối thiểu 10 ký tự).";
    }

    const minB = Number(f.expectedBudgetMin);
    const maxB = Number(f.expectedBudgetMax);
    if (f.expectedBudgetMin === "") {
      errors.expectedBudgetMin = "Vui lòng nhập ngân sách tối thiểu.";
    } else if (minB < 50) {
      errors.expectedBudgetMin = "Ngân sách tối thiểu phải từ $50.";
    }
    if (f.expectedBudgetMax === "") {
      errors.expectedBudgetMax = "Vui lòng nhập ngân sách tối đa.";
    } else if (!errors.expectedBudgetMin && maxB <= minB) {
      errors.expectedBudgetMax = "Ngân sách tối đa phải lớn hơn tối thiểu.";
    }

    if (clientType === "business") {
      if (!business.companyName.trim()) errors.companyName = "Tên công ty không được để trống.";

      const taxClean = business.taxCode.replace(/\-/g, "");
      if (!business.taxCode.trim()) {
        errors.taxCode = "Mã số thuế không được để trống.";
      } else if (!/^\d{10}$/.test(taxClean) && !/^\d{13}$/.test(taxClean)) {
        errors.taxCode = "Mã số thuế không hợp lệ (10 hoặc 13 chữ số).";
      }

      if (!business.industry.trim()) errors.industry = "Ngành nghề không được để trống.";
      if (!business.companyAddress.trim()) errors.companyAddress = "Địa chỉ công ty không được để trống.";

      if (!business.businessEmail.trim()) {
        errors.businessEmail = "Email doanh nghiệp không được để trống.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(business.businessEmail.trim())) {
        errors.businessEmail = "Email không đúng định dạng.";
      }

      const bizPhoneClean = business.businessPhone.replace(/[\s\-\.]/g, "");
      if (!business.businessPhone.trim()) {
        errors.businessPhone = "Số điện thoại doanh nghiệp không được để trống.";
      } else if (
        !/^(0[2-9]\d{8,9})$/.test(bizPhoneClean) &&
        !/^(\+84[2-9]\d{8,9})$/.test(bizPhoneClean) &&
        !/^(84[2-9]\d{8,9})$/.test(bizPhoneClean)
      ) {
        errors.businessPhone = "Số điện thoại doanh nghiệp không hợp lệ.";
      }
    }

    return errors;
  };

  // ── Submit ────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
  e.preventDefault();

  setGlobalError("");
  setFieldErrors({});

  const feErrors = validateForm();
  if (Object.keys(feErrors).length > 0) {
    setFieldErrors(feErrors);
    setGlobalError("Thông tin đang vi phạm. Vui lòng kiểm tra lại.");
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  setLoading(true);

  try {
    if (clientType === "individual") {
      await axiosInstance.put("/client-profiles/individual/me", {
        fullName: individual.fullName || "Client User",
        phoneNumber: individual.phoneNumber,
        address: individual.address,
        aiNeeds: individual.aiNeeds,
        mainProblems: individual.mainProblems,
        expectedBudgetMin: Number(individual.expectedBudgetMin),
        expectedBudgetMax: Number(individual.expectedBudgetMax),
        avatarUrl: individual.avatarUrl || "",
      });
    } else {
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
    const resData = err?.response?.data;

    if (resData?.errors && typeof resData.errors === "object") {
      setFieldErrors(resData.errors);
      setGlobalError(resData.message || "Thông tin đang vi phạm. Vui lòng sửa lại.");
    } else {
      setGlobalError(resData?.message || "Thông tin đang vi phạm hoặc có lỗi xác minh.");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  } finally {
    setLoading(false);
  }
};

  if (fetching) return (
    <ClientLayout>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "#8c90a0" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 40, animation: "spin 1s linear infinite" }}>autorenew</span>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </ClientLayout>
  );

  const form = clientType === "individual" ? individual : business;
  const handleChange = clientType === "individual" ? handleIndividualChange : handleBusinessChange;
  const hasFieldErrors = Object.values(fieldErrors).some(Boolean);

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
              Edit Profile
            </h1>
            <p style={{ color: "#8c90a0", fontSize: 14 }}>Cập nhật thông tin — AI sẽ verify lại sau khi lưu</p>
          </div>
        </div>

        {/* Global error / AI fail banner */}
        {(globalError || hasFieldErrors) && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#f87171", flexShrink: 0, marginTop: 1 }}>gpp_bad</span>
            <div>
              <p style={{ color: "#f87171", fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>
                {hasFieldErrors ? "AI Verification Failed" : "Lỗi"}
              </p>
              <p style={{ color: "#fca5a5", fontSize: 13, margin: 0 }}>
                {globalError || "Vui lòng kiểm tra và sửa các trường được đánh dấu đỏ."}
              </p>
            </div>
          </div>
        )}

        {/* Client Type Toggle — lock theo data hiện tại */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {[
            { key: "individual", icon: "person", label: "Individual" },
            { key: "business", icon: "corporate_fare", label: "Business" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              disabled
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px 16px",
                borderRadius: 8,
                border: `1px solid ${clientType === t.key ? "#00F0FF" : "rgba(255,255,255,0.12)"}`,
                background: clientType === t.key ? "rgba(0,240,255,0.05)" : "rgba(29,32,38,0.5)",
                color: clientType === t.key ? "#00F0FF" : "#8c90a0",
                transition: "all 0.2s",
                fontWeight: 600,
                cursor: clientType === t.key ? "default" : "not-allowed",
                opacity: clientType === t.key ? 1 : 0.4,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                {t.icon}
              </span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <div style={{ background: "rgba(16,19,25,0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 32 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Phone + Address */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ ...labelStyle, color: fieldErrors.phoneNumber ? "#f87171" : "#8c90a0" }}>Phone Number</label>
                  <input type="text" name="phoneNumber" value={form.phoneNumber} onChange={handleChange}
                    placeholder="0912345678"
                    style={getInputStyle("phoneNumber", fieldErrors)}
                    onFocus={(e) => (e.target.style.borderColor = fieldErrors.phoneNumber ? "#ef4444" : "#00F0FF")}
                    onBlur={(e) => (e.target.style.borderColor = fieldErrors.phoneNumber ? "#ef4444" : "rgba(255,255,255,0.12)")} />
                  <FieldError name="phoneNumber" errors={fieldErrors} />
                </div>
                <div>
                  <label style={{ ...labelStyle, color: fieldErrors.address ? "#f87171" : "#8c90a0" }}>Address</label>
                  <input type="text" name="address" value={form.address} onChange={handleChange}
                    placeholder="TP. Hồ Chí Minh"
                    style={getInputStyle("address", fieldErrors)}
                    onFocus={(e) => (e.target.style.borderColor = fieldErrors.address ? "#ef4444" : "#00F0FF")}
                    onBlur={(e) => (e.target.style.borderColor = fieldErrors.address ? "#ef4444" : "rgba(255,255,255,0.12)")} />
                  <FieldError name="address" errors={fieldErrors} />
                </div>
              </div>

              {/* AI Needs */}
              <div>
                <label style={{ ...labelStyle, color: fieldErrors.aiNeeds ? "#f87171" : "#8c90a0" }}>AI Needs</label>
                <textarea name="aiNeeds" value={form.aiNeeds} onChange={handleChange} rows={3}
                  style={{ ...getInputStyle("aiNeeds", fieldErrors), resize: "none" }}
                  onFocus={(e) => (e.target.style.borderColor = fieldErrors.aiNeeds ? "#ef4444" : "#00F0FF")}
                  onBlur={(e) => (e.target.style.borderColor = fieldErrors.aiNeeds ? "#ef4444" : "rgba(255,255,255,0.12)")} />
                <FieldError name="aiNeeds" errors={fieldErrors} />
              </div>

              {/* Main Problems */}
              <div>
                <label style={{ ...labelStyle, color: fieldErrors.mainProblems ? "#f87171" : "#8c90a0" }}>Main Problems</label>
                <textarea name="mainProblems" value={form.mainProblems} onChange={handleChange} rows={3}
                  style={{ ...getInputStyle("mainProblems", fieldErrors), resize: "none" }}
                  onFocus={(e) => (e.target.style.borderColor = fieldErrors.mainProblems ? "#ef4444" : "#00F0FF")}
                  onBlur={(e) => (e.target.style.borderColor = fieldErrors.mainProblems ? "#ef4444" : "rgba(255,255,255,0.12)")} />
                <FieldError name="mainProblems" errors={fieldErrors} />
              </div>

              {/* Budget */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ ...labelStyle, color: fieldErrors.expectedBudgetMin ? "#f87171" : "#8c90a0" }}>Min Budget (USD)</label>
                  <input type="number" min="0" name="expectedBudgetMin" value={form.expectedBudgetMin} onChange={handleChange}
                    placeholder="500"
                    style={getInputStyle("expectedBudgetMin", fieldErrors)}
                    onFocus={(e) => (e.target.style.borderColor = fieldErrors.expectedBudgetMin ? "#ef4444" : "#00F0FF")}
                    onBlur={(e) => (e.target.style.borderColor = fieldErrors.expectedBudgetMin ? "#ef4444" : "rgba(255,255,255,0.12)")} />
                  <FieldError name="expectedBudgetMin" errors={fieldErrors} />
                </div>
                <div>
                  <label style={{ ...labelStyle, color: fieldErrors.expectedBudgetMax ? "#f87171" : "#8c90a0" }}>Max Budget (USD)</label>
                  <input type="number" min="0" name="expectedBudgetMax" value={form.expectedBudgetMax} onChange={handleChange}
                    placeholder="5000"
                    style={getInputStyle("expectedBudgetMax", fieldErrors)}
                    onFocus={(e) => (e.target.style.borderColor = fieldErrors.expectedBudgetMax ? "#ef4444" : "#00F0FF")}
                    onBlur={(e) => (e.target.style.borderColor = fieldErrors.expectedBudgetMax ? "#ef4444" : "rgba(255,255,255,0.12)")} />
                  <FieldError name="expectedBudgetMax" errors={fieldErrors} />
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
                        <label style={{ ...labelStyle, color: fieldErrors.companyName ? "#f87171" : "#8c90a0" }}>Company Name</label>
                        <input type="text" name="companyName" value={business.companyName} onChange={handleBusinessChange}
                          style={getInputStyle("companyName", fieldErrors)}
                          onFocus={(e) => (e.target.style.borderColor = fieldErrors.companyName ? "#ef4444" : "#00F0FF")}
                          onBlur={(e) => (e.target.style.borderColor = fieldErrors.companyName ? "#ef4444" : "rgba(255,255,255,0.12)")} />
                        <FieldError name="companyName" errors={fieldErrors} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, color: fieldErrors.taxCode ? "#f87171" : "#8c90a0" }}>Tax Code</label>
                        <input type="text" name="taxCode" value={business.taxCode} onChange={handleBusinessChange}
                          style={getInputStyle("taxCode", fieldErrors)}
                          onFocus={(e) => (e.target.style.borderColor = fieldErrors.taxCode ? "#ef4444" : "#00F0FF")}
                          onBlur={(e) => (e.target.style.borderColor = fieldErrors.taxCode ? "#ef4444" : "rgba(255,255,255,0.12)")} />
                        <FieldError name="taxCode" errors={fieldErrors} />
                      </div>
                    </div>
                    <div>
                      <label style={{ ...labelStyle, color: fieldErrors.industry ? "#f87171" : "#8c90a0" }}>Industry</label>
                      <input type="text" name="industry" value={business.industry} onChange={handleBusinessChange}
                        style={getInputStyle("industry", fieldErrors)}
                        onFocus={(e) => (e.target.style.borderColor = fieldErrors.industry ? "#ef4444" : "#00F0FF")}
                        onBlur={(e) => (e.target.style.borderColor = fieldErrors.industry ? "#ef4444" : "rgba(255,255,255,0.12)")} />
                      <FieldError name="industry" errors={fieldErrors} />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, color: fieldErrors.companyAddress ? "#f87171" : "#8c90a0" }}>Company Address</label>
                      <input type="text" name="companyAddress" value={business.companyAddress} onChange={handleBusinessChange}
                        style={getInputStyle("companyAddress", fieldErrors)}
                        onFocus={(e) => (e.target.style.borderColor = fieldErrors.companyAddress ? "#ef4444" : "#00F0FF")}
                        onBlur={(e) => (e.target.style.borderColor = fieldErrors.companyAddress ? "#ef4444" : "rgba(255,255,255,0.12)")} />
                      <FieldError name="companyAddress" errors={fieldErrors} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <label style={{ ...labelStyle, color: fieldErrors.businessEmail ? "#f87171" : "#8c90a0" }}>Business Email</label>
                        <input type="email" name="businessEmail" value={business.businessEmail} onChange={handleBusinessChange}
                          style={getInputStyle("businessEmail", fieldErrors)}
                          onFocus={(e) => (e.target.style.borderColor = fieldErrors.businessEmail ? "#ef4444" : "#00F0FF")}
                          onBlur={(e) => (e.target.style.borderColor = fieldErrors.businessEmail ? "#ef4444" : "rgba(255,255,255,0.12)")} />
                        <FieldError name="businessEmail" errors={fieldErrors} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, color: fieldErrors.businessPhone ? "#f87171" : "#8c90a0" }}>Business Phone</label>
                        <input type="text" name="businessPhone" value={business.businessPhone} onChange={handleBusinessChange}
                          style={getInputStyle("businessPhone", fieldErrors)}
                          onFocus={(e) => (e.target.style.borderColor = fieldErrors.businessPhone ? "#ef4444" : "#00F0FF")}
                          onBlur={(e) => (e.target.style.borderColor = fieldErrors.businessPhone ? "#ef4444" : "rgba(255,255,255,0.12)")} />
                        <FieldError name="businessPhone" errors={fieldErrors} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => navigate("/client/profile")}
                  style={{ flex: 1, padding: "14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#e1e2eb", cursor: "pointer", fontWeight: 600, fontFamily: "Inter, sans-serif", fontSize: 15 }}>
                  Hủy
                </button>
                <button type="submit" disabled={loading}
                  style={{ flex: 2, background: loading ? "#1d2026" : "#00F0FF", color: loading ? "#8c90a0" : "#002022", fontFamily: "Hanken Grotesk, sans-serif", fontWeight: 700, fontSize: 15, padding: "14px", borderRadius: 8, border: "none", cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 0 20px rgba(0,240,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" }}>
                  {loading ? (
                    <><span className="material-symbols-outlined" style={{ animation: "spin 1s linear infinite" }}>autorenew</span><span>AI đang xác minh...</span></>
                  ) : (
                    <><span>Lưu & Xác minh</span><span className="material-symbols-outlined">verified</span></>
                  )}
                </button>
              </div>

            </div>
          </form>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </ClientLayout>
  );
}