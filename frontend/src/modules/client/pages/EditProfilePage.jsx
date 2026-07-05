// src/modules/client/pages/EditProfilePage.jsx
// Individual: PUT /api/client-profiles/individual/me  { phoneNumber, address }
// Business:   PUT /api/client-profiles/business/me    { phoneNumber, address, taxCode, industry, businessEmail, businessPhone }
//
// LƯU Ý: companyName và companyAddress do AI tự tra cứu (VietQR) — không cho user nhập tay.

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";
import authService from "../../../services/auth.service";

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
  const user = authService.getCurrentUser();
  const [clientType, setClientType] = useState("individual");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [globalError, setGlobalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [initialSnapshot, setInitialSnapshot] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // companyName chỉ để HIỂN THỊ readonly, không gửi lên BE
  const [companyNameDisplay, setCompanyNameDisplay] = useState("");

  const [individual, setIndividual] = useState({
    fullName: "", phoneNumber: "", address: "",
  });

  const [business, setBusiness] = useState({
    fullName: "", phoneNumber: "", address: "",
    taxCode: "", industry: "", businessEmail: "", businessPhone: "",
  });

  // ── Load data cũ ─────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosInstance.get("/client-profiles/me");
        const data = res.data;
        setAvatarUrl(data.avatarUrl || "");
        setAvatarPreview(data.avatarUrl || "");
        const businessProfile = data.businessProfile || null;
        const isBusiness = !!businessProfile;

        if (isBusiness) {
          setClientType("business");
          setCompanyNameDisplay(businessProfile.companyName || "");
          const businessData = {
            fullName: data.fullName || user?.fullName || "",
            phoneNumber: data.phoneNumber || "",
            address: data.address || "",
            taxCode: businessProfile.taxCode || "",
            industry: businessProfile.industry || "",
            businessEmail: businessProfile.businessEmail || "",
            businessPhone: businessProfile.businessPhone || "",
          };

          setBusiness(businessData);
          setInitialSnapshot(JSON.stringify(businessData));
        } else {
          setClientType("individual");
          const individualData = {
          fullName: data.fullName || user?.fullName || "",
          phoneNumber: data.phoneNumber || "",
          address: data.address || "",
        };

        setIndividual(individualData);
        setInitialSnapshot(JSON.stringify(individualData));
        }
      } catch (err) {
        setGlobalError("Unable to load profile information.");
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

    if (!f.fullName?.trim()) {
      errors.fullName = "Full name is required.";
    }

    const phoneClean = f.phoneNumber.replace(/[\s\-\.]/g, "");

    if (!f.phoneNumber.trim()) {
      errors.phoneNumber = "Personal phone number cannot be empty.";
    } else if (!/^(0|84|\+84)(3|5|7|8|9)\d{8}$/.test(phoneClean)) {
      errors.phoneNumber = "Invalid VN mobile number. Example: 0912345678.";
    }

    if (!f.address.trim()) {
      errors.address = "Address cannot be empty.";
    } else if (f.address.trim().length < 5) {
      errors.address = "Address is too short (minimum 5 characters).";
    }

    if (clientType === "business") {
      const taxClean = business.taxCode.replace(/\-/g, "");
      if (!business.taxCode.trim()) {
        errors.taxCode = "Tax code cannot be empty.";
      } else if (!/^\d{10}$/.test(taxClean) && !/^\d{13}$/.test(taxClean)) {
        errors.taxCode = "Invalid tax code (10 or 13 digits).";
      }

      if (!business.industry.trim()) errors.industry = "Industry cannot be empty.";

      if (!business.businessEmail.trim()) {
        errors.businessEmail = "Business email cannot be empty.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(business.businessEmail.trim())) {
        errors.businessEmail = "Invalid email format.";
      }

      const bizPhoneClean = business.businessPhone.replace(/[\s\-\.]/g, "");

      if (!business.businessPhone.trim()) {
        errors.businessPhone = "Company phone number cannot be empty.";
      } else if (!/^(0\d{9,10}|84\d{9,10}|\+84\d{9,10})$/.test(bizPhoneClean)) {
        errors.businessPhone =
          "Invalid company phone number. Example: 02812345678 or 0912345678.";
      }
    }

    return errors;
  };

  const handleAvatarChange = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    setGlobalError("Please select a valid image file.");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    setGlobalError("Avatar image must be smaller than 5MB.");
    return;
  }

  setAvatarFile(file);
  setAvatarPreview(URL.createObjectURL(file));
  setGlobalError("");
};

const uploadAvatarIfNeeded = async () => {
  if (!avatarFile) return avatarUrl;

  setUploadingAvatar(true);

  const formData = new FormData();
  formData.append("file", avatarFile);

  const uploadRes = await axiosInstance.post("/uploads/images", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  const uploadedUrl =
    uploadRes.data?.image?.url ||
    uploadRes.data?.url ||
    uploadRes.data?.imageUrl ||
    uploadRes.data?.avatarUrl ||
    uploadRes.data?.data?.url ||
    uploadRes.data?.data?.imageUrl;

  if (!uploadedUrl) {
    throw new Error("Upload image failed: missing image URL.");
  }

  const avatarRes = await axiosInstance.put("/auth/me/avatar", {
    avatarUrl: uploadedUrl,
  });

  const newAvatarUrl =
    avatarRes.data?.avatarUrl ||
    avatarRes.data?.user?.avatarUrl ||
    uploadedUrl;

  setAvatarUrl(newAvatarUrl);
  setAvatarPreview(newAvatarUrl);
  setAvatarFile(null);

  // cập nhật user trong localStorage để ClientNavbar hiện avatar mới
  const currentUser = authService.getCurrentUser();

  if (currentUser) {
    const updatedUser = {
      ...currentUser,
      avatarUrl: newAvatarUrl,
    };

    localStorage.setItem("user", JSON.stringify(updatedUser));
  }
  return newAvatarUrl;
};

  // ── Submit ────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError("");
    setFieldErrors({});

    const currentSnapshot = JSON.stringify(
    clientType === "individual" ? individual : business
  );

  const profileNotChanged = initialSnapshot && currentSnapshot === initialSnapshot;
  const avatarNotChanged = !avatarFile;

  if (profileNotChanged && avatarNotChanged) {
    navigate("/client/profile");
    return;
  }

  const feErrors = validateForm();
  if (Object.keys(feErrors).length > 0) {
    setFieldErrors(feErrors);
    setGlobalError("Invalid information. Please review the highlighted fields.");
    return;
  }

  setLoading(true);

    try {
      await uploadAvatarIfNeeded();
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

      navigate("/client/profile", { replace: true, state: { refresh: Date.now() } });
    } catch (err) {
      const resData = err?.response?.data;
      const message = resData?.message || resData?.title || "An error occurred or verification failed.";

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
      setUploadingAvatar(false);
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
            <p style={{ color: "#8c90a0", fontSize: 14 }}>Update your information — AI will re-verify after saving</p>
          </div>
        </div>

        {/* Global error / AI fail banner */}
        {(globalError || hasFieldErrors) && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#f87171", flexShrink: 0, marginTop: 1 }}>gpp_bad</span>
            <div>
              <p style={{ color: "#f87171", fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>
                {hasFieldErrors ? "AI Verification Failed" : "Error"}
              </p>
              <p style={{ color: "#fca5a5", fontSize: 13, margin: 0 }}>
                {globalError || "Please review and correct the highlighted fields."}
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

              {/* Avatar Upload */}
              <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 8 }}>
                <div
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span className="material-symbols-outlined" style={{ fontSize: 42, color: "#8c90a0" }}>
                      account_circle
                    </span>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Avatar</label>

                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1px solid rgba(0,240,255,0.35)",
                      background: "rgba(0,240,255,0.06)",
                      color: "#00F0FF",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      upload
                    </span>
                    {avatarFile ? "Change selected image" : "Upload avatar"}

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      style={{ display: "none" }}
                    />
                  </label>

                  <p style={{ fontSize: 11, color: "#8c90a0", marginTop: 6 }}>
                    JPG, PNG or WEBP. Max 5MB.
                  </p>
                </div>
              </div>

              
              {/* Full Name — readonly */}
              <div>
                <label style={labelStyle}>Full Name</label>
                <input
                    type="text"
                    name="fullName"
                    value={form.fullName || ""}
                    disabled
                    style={{
                      ...getInputStyle("fullName", fieldErrors),
                      opacity: 0.65,
                      cursor: "not-allowed",
                    }}
                  />
                <FieldError name="fullName" errors={fieldErrors} />
              </div>
              {/* Phone + Address */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ ...labelStyle, color: fieldErrors.phoneNumber ? "#f87171" : "#8c90a0" }}>Personal Phone Number</label>
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
                    placeholder="Ho Chi Minh City"
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
                      <label
                        style={{
                          ...labelStyle,
                          color: fieldErrors.taxCode ? "#f87171" : "#8c90a0",
                        }}
                      >
                        Tax Code
                      </label>

                      <input
                        type="text"
                        name="taxCode"
                        value={business.taxCode}
                        onChange={handleBusinessChange}
                        disabled={!!companyNameDisplay}
                        style={{
                          ...getInputStyle("taxCode", fieldErrors),
                          opacity: companyNameDisplay ? 0.6 : 1,
                          cursor: companyNameDisplay ? "not-allowed" : "text",
                        }}
                        onFocus={(e) =>
                          (e.target.style.borderColor =
                            fieldErrors.taxCode ? "#ef4444" : "#00F0FF")
                        }
                        onBlur={(e) =>
                          (e.target.style.borderColor =
                            fieldErrors.taxCode
                              ? "#ef4444"
                              : "rgba(255,255,255,0.12)")
                        }
                      />

                      <FieldError name="taxCode" errors={fieldErrors} />

                      <p style={{ fontSize: 11, color: "#8c90a0", marginTop: 4 }}>
                        Tax code cannot be changed after successful verification.
                      </p>
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
                        <label style={{ ...labelStyle, color: fieldErrors.businessPhone ? "#f87171" : "#8c90a0" }}>Company Phone Number</label>
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
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  style={{ flex: 2, background: loading ? "#1d2026" : "#00F0FF", color: loading ? "#8c90a0" : "#002022", fontFamily: "Hanken Grotesk, sans-serif", fontWeight: 700, fontSize: 15, padding: "14px", borderRadius: 8, border: "none", cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 0 20px rgba(0,240,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" }}>
                  {loading ? (
                    <><span className="material-symbols-outlined" style={{ animation: "spin 1s linear infinite" }}>autorenew</span><span>{uploadingAvatar ? "Uploading avatar..." : "AI is verifying..."}</span></>
                  ) : (
                    <><span>Save & Verify</span><span className="material-symbols-outlined">verified</span></>
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