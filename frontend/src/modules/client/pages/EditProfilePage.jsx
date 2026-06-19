// src/modules/client/pages/EditProfilePage.jsx
// Individual: PUT /api/client-profiles/individual/me  { phoneNumber, address }
// Business:   PUT /api/client-profiles/business/me    { phoneNumber, address, taxCode, industry, businessEmail, businessPhone }
//
// LƯU Ý: companyName và companyAddress do AI tự tra cứu (VietQR) — không cho user nhập tay.

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

  // companyName chỉ để HIỂN THỊ readonly, không gửi lên BE
  const [companyNameDisplay, setCompanyNameDisplay] = useState("");

  const [individual, setIndividual] = useState({
    phoneNumber: "", address: "",
  });

  const [business, setBusiness] = useState({
    phoneNumber: "", address: "",
    taxCode: "", industry: "", businessEmail: "", businessPhone: "",
  });

  // ── Load data cũ ─────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosInstance.get("/client-profiles/me");
        const data = res.data;
        const businessProfile = data.businessProfile || null;
        const isBusiness = !!businessProfile;

        if (isBusiness) {
          setClientType("business");
          setCompanyNameDisplay(businessProfile.companyName || "");
          setBusiness({
            phoneNumber:   data.phoneNumber || "",
            address:       data.address || "",
            taxCode:       businessProfile.taxCode || "",
            industry:      businessProfile.industry || "",
            businessEmail: businessProfile.businessEmail || "",
            businessPhone: businessProfile.businessPhone || "",
          });
        } else {
          setClientType("individual");
          setIndividual({
            phoneNumber: data.phoneNumber || "",
            address:     data.address || "",
          });
        }
      } catch (err) {
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

    if (clientType === "business") {
      const taxClean = business.taxCode.replace(/\-/g, "");
      if (!business.taxCode.trim()) {
        errors.taxCode = "Mã số thuế không được để trống.";
      } else if (!/^\d{10}$/.test(taxClean) && !/^\d{13}$/.test(taxClean)) {
        errors.taxCode = "Mã số thuế không hợp lệ (10 hoặc 13 chữ số).";
      }

      if (!business.industry.trim()) errors.industry = "Ngành nghề không được để trống.";

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
      setGlobalError("Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setLoading(true);

    try {
      let res;
      if (clientType === "individual") {
        res = await axiosInstance.put("/client-profiles/individual/me", {
          phoneNumber: individual.phoneNumber,
          address: individual.address,
        });
      } else {
        res = await axiosInstance.put("/client-profiles/business/me", {
          phoneNumber: business.phoneNumber,
          address: business.address,
          taxCode: business.taxCode,
          industry: business.industry,
          businessEmail: business.businessEmail,
          businessPhone: business.businessPhone,
        });
      }

      const userStatus = res.data?.userStatus;
      const verificationStatus = res.data?.businessProfile?.verificationStatus;
      const verificationNote = res.data?.businessProfile?.verificationNote;

      if (
        userStatus === "BUSINESS_NEEDS_CORRECTION" ||
        (verificationStatus && verificationStatus !== "VERIFIED")
      ) {
        setGlobalError(verificationNote || "Business information needs correction.");
        setFieldErrors({ taxCode: verificationNote || "Tax code could not be verified." });
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // Update company name hiển thị (nếu AI tra cứu lại ra tên mới)
      if (res.data?.businessProfile?.companyName) {
        setCompanyNameDisplay(res.data.businessProfile.companyName);
      }

      navigate("/client/profile");
    } catch (err) {
      const resData = err?.response?.data;
      const message = resData?.message || resData?.title || "Đã có lỗi xảy ra hoặc xác minh thất bại.";

      if (resData?.errors && typeof resData.errors === "object" && !Array.isArray(resData.errors)) {
        // BE trả lỗi theo từng field cụ thể → highlight đúng field đó
        setFieldErrors(resData.errors);
        setGlobalError(message);
      } else if (clientType === "business") {
        // BE chỉ trả message chung (vd: lỗi verify tax code) → mặc định highlight taxCode
        setFieldErrors({ taxCode: message });
        setGlobalError(message);
      } else {
        setGlobalError(message);
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

        {/* Client Type Toggle — luôn lock, không cho đổi sau khi đã đăng ký */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {[
            { key: "individual", icon: "person", label: "Individual" },
            { key: "business", icon: "corporate_fare", label: "Business" },
          ].map((t) => (
            <button key={t.key} type="button" disabled
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "12px 16px", borderRadius: 8,
                border: `1px solid ${clientType === t.key ? "#00F0FF" : "rgba(255,255,255,0.12)"}`,
                background: clientType === t.key ? "rgba(0,240,255,0.05)" : "rgba(29,32,38,0.5)",
                color: clientType === t.key ? "#00F0FF" : "#8c90a0",
                transition: "all 0.2s", fontWeight: 600,
                cursor: clientType === t.key ? "default" : "not-allowed",
                opacity: clientType === t.key ? 1 : 0.4,
              }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{t.icon}</span>
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

              {/* Business only */}
              {clientType === "business" && (
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 20 }}>
                  <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#00F0FF", marginBottom: 16 }}>
                    Business Information
                  </p>

                  {/* Company name — readonly, AI tra cứu */}
                  {companyNameDisplay && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle}>Company Name (auto-verified)</label>
                      <div style={{ background: "rgba(0,240,255,0.04)", border: "1px solid rgba(0,240,255,0.15)", borderRadius: 8, padding: "12px 16px", color: "#c0c1ff", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#00F0FF" }}>verified</span>
                        {companyNameDisplay}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <label style={{ ...labelStyle, color: fieldErrors.taxCode ? "#f87171" : "#8c90a0" }}>Tax Code</label>
                      <input type="text" name="taxCode" value={business.taxCode} onChange={handleBusinessChange}
                        style={getInputStyle("taxCode", fieldErrors)}
                        onFocus={(e) => (e.target.style.borderColor = fieldErrors.taxCode ? "#ef4444" : "#00F0FF")}
                        onBlur={(e) => (e.target.style.borderColor = fieldErrors.taxCode ? "#ef4444" : "rgba(255,255,255,0.12)")} />
                      <FieldError name="taxCode" errors={fieldErrors} />
                      <p style={{ fontSize: 11, color: "#8c90a0", marginTop: 4 }}>Đổi mã số thuế sẽ kích hoạt verify lại company name.</p>
                    </div>
                    <div>
                      <label style={{ ...labelStyle, color: fieldErrors.industry ? "#f87171" : "#8c90a0" }}>Industry</label>
                      <input type="text" name="industry" value={business.industry} onChange={handleBusinessChange}
                        style={getInputStyle("industry", fieldErrors)}
                        onFocus={(e) => (e.target.style.borderColor = fieldErrors.industry ? "#ef4444" : "#00F0FF")}
                        onBlur={(e) => (e.target.style.borderColor = fieldErrors.industry ? "#ef4444" : "rgba(255,255,255,0.12)")} />
                      <FieldError name="industry" errors={fieldErrors} />
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