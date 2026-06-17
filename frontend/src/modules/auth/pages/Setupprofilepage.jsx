// src/modules/auth/pages/SetupProfilePage.jsx
// Individual: POST /api/client-profiles/individual
// Business:   POST /api/client-profiles/business
// Resubmit:   PUT  /api/client-profiles/business/resubmit
//             PUT  /api/client-profiles/individual/me  (nếu individual resubmit)
// GET data:   GET  /api/client-profiles/me

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axiosInstance from "../../../api/axiosInstance";

const BG_IMAGE = "https://lh3.googleusercontent.com/aida/ADBb0uiAogMCN4ONd1eV0ckwyeNv8QfTOCxlvbOfag-KSL1Cdba-otv2YjPez9ovCM3FL-qyGKTDeVirDziA80hhQSTs6XXast-3vn_rIy5jZgYjYUXxWbn7589Hj6JdyzhvkZYNXQ9pQUbNptjiPkROg5Kp1z8ZHsKZL28Xmx-Rtm9fYag14W6IkJdjjWBtwCUOnpOhakWfAR9l6aohBmWnTPgav2fsqTD4ZFoyetZhmIs7tPIQxkGVlrRy0gVd";

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

// Field error message
function FieldError({ name, errors }) {
  if (!errors[name]) return null;
  return (
    <p style={{ fontSize: 12, color: "#f87171", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>error</span>
      {errors[name]}
    </p>
  );
}

// ── Parse lỗi trả về từ BE (AI check field) ─────────────────────────
// BE có thể trả nhiều dạng khác nhau tuỳ framework, hàm này chuẩn hoá
// tất cả về { fieldErrors: { phoneNumber: "msg", ... }, message: "..." }
function parseApiError(err) {
  const status = err?.response?.status;
  const resData = err?.response?.data;

  // Không có response nghĩa là lỗi network/timeout, không phải lỗi field
  if (!resData) {
    return {
      fieldErrors: {},
      message: "Could not connect to the server. Please check your network connection and try again.",
    };
  }

  const fieldErrors = {};

  // Dạng 1: errors là object thẳng { fieldName: "message" }
  if (resData.errors && typeof resData.errors === "object" && !Array.isArray(resData.errors)) {
    Object.assign(fieldErrors, resData.errors);
  }

  // Dạng 2: errors là array [{ field, message }] / [{ fieldName, msg }]
  if (Array.isArray(resData.errors)) {
    resData.errors.forEach((item) => {
      if (typeof item === "string") return; // không đủ info để gắn vào field
      const key = item.field || item.fieldName || item.name;
      const msg = item.message || item.msg || item.detail || item.reason;
      if (key && msg) fieldErrors[key] = msg;
    });
  }

  // Dạng 3: một số BE (Spring Boot) dùng "validationErrors" hoặc "violations"
  const altList = resData.validationErrors || resData.violations;
  if (Array.isArray(altList)) {
    altList.forEach((item) => {
      const key = item.field || item.fieldName || item.propertyPath;
      const msg = item.message || item.defaultMessage;
      if (key && msg) fieldErrors[key] = msg;
    });
  }

  // Message tổng quát hiển thị trong banner đỏ
  const message =
    resData.message ||
    (status === 401 && "Your session has expired. Please log in again.") ||
    (status === 403 && "You do not have permission to perform this action.") ||
    (status === 409 && "Some of this information already exists in the system (e.g. tax code, email).") ||
    (status >= 500 && "A server error occurred. Please try again later.") ||
    "Some information is invalid. Please check the fields below.";

  return { fieldErrors, message };
}

export default function SetupProfilePage() {
  const navigate = useNavigate();
  const [clientType, setClientType] = useState("individual");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [globalError, setGlobalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // { phoneNumber: "msg", ... }
  const [isEdit, setIsEdit] = useState(false);

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

  // ── Prefill data nếu đã có profile ──────────────────────────────
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await axiosInstance.get("/client-profiles/me");
        const data = res.data;
        setIsEdit(!!data.phoneNumber);
        const isBusiness = !!data.companyName;
        setClientType(isBusiness ? "business" : "individual");
        const common = {
          phoneNumber:        data.phoneNumber        || "",
          address:            data.address            || "",
          aiNeeds:            data.aiNeeds            || "",
          mainProblems:       data.mainProblems       || "",
          expectedBudgetMin:  data.expectedBudgetMin  || "",
          expectedBudgetMax:  data.expectedBudgetMax  || "",
        };
        if (isBusiness) {
          setBusiness({
            ...common,
            companyName:    data.companyName    || "",
            taxCode:        data.taxCode        || "",
            industry:       data.industry       || "",
            companyAddress: data.companyAddress || "",
            businessEmail:  data.businessEmail  || "",
            businessPhone:  data.businessPhone  || "",
          });
        } else {
          setIndividual(common);
        }
      } catch {
        setIsEdit(false); // chưa có profile → first time
      } finally {
        setFetching(false);
      }
    };
    loadProfile();
  }, []);

  const handleIndividualChange = (e) => {
    const { name, value } = e.target;
    setIndividual((prev) => ({ ...prev, [name]: value }));
    // Xóa error của field vừa sửa
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: null }));
    setGlobalError("");
  };

  const handleBusinessChange = (e) => {
    const { name, value } = e.target;

    setBusiness((prev) => ({ ...prev, [name]: value }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }

    setGlobalError("");
  };

  const handleBudgetChange = (e) => {
    const { name, value } = e.target;

    // Cho phép xóa rỗng
    if (value === "") {
      clientType === "individual"
        ? setIndividual((prev) => ({ ...prev, [name]: "" }))
        : setBusiness((prev) => ({ ...prev, [name]: "" }));

      if (fieldErrors[name]) {
        setFieldErrors((prev) => ({ ...prev, [name]: null }));
      }

      setGlobalError("");
      return;
    }

    // Chặn số âm
    if (Number(value) < 0) {
      return;
    }

    clientType === "individual"
      ? setIndividual((prev) => ({ ...prev, [name]: value }))
      : setBusiness((prev) => ({ ...prev, [name]: value }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }

    setGlobalError("");
  };

  // ── FE Validate (check format cơ bản trước khi gọi API) ──────────
  const validateForm = () => {
    const errors = {};
    const f = clientType === "individual" ? individual : business;

    // Phone — 10 số VN: 03x/05x/07x/08x/09x hoặc +84x
    const phoneClean = f.phoneNumber.replace(/[\s\-\.]/g, "");
    if (!f.phoneNumber.trim()) {
      errors.phoneNumber = "The phone number cannot be left blank.";
    } else if (
      !/^(0[3-9]\d{8})$/.test(phoneClean) &&
      !/^(\+84[3-9]\d{8})$/.test(phoneClean) &&
      !/^(84[3-9]\d{8})$/.test(phoneClean)
    ) {
      errors.phoneNumber = "The phone number is invalid. Please enter a valid VN format (e.g., 0912345678).";
    }

    // Address
    if (!f.address.trim()) {
      errors.address = "The address cannot be left blank.";
    } else if (f.address.trim().length < 5) {
      errors.address = "The address is too short (minimum 5 characters).";
    }

    // AI Needs
    if (!f.aiNeeds.trim()) {
      errors.aiNeeds = "Please describe your AI needs.";
    } else if (f.aiNeeds.trim().length < 10) {
      errors.aiNeeds = "The description is too short (minimum 10 characters).";
    }

    // Main Problems
    if (!f.mainProblems.trim()) {
      errors.mainProblems = "Please describe your main problems.";
    } else if (f.mainProblems.trim().length < 10) {
      errors.mainProblems = "The description is too short (minimum 10 characters).";
    }

    // Budget
    const minBudget = Number(f.expectedBudgetMin);
    const maxBudget = Number(f.expectedBudgetMax);
    if (f.expectedBudgetMin === "" || f.expectedBudgetMin === null) {
      errors.expectedBudgetMin = "Please enter the minimum budget.";
    } else if (minBudget < 0) {
      errors.expectedBudgetMin = "The budget cannot be negative.";
    } else if (minBudget < 50) {
      errors.expectedBudgetMin = "The minimum budget must be at least $50.";
    }
    if (f.expectedBudgetMax === "" || f.expectedBudgetMax === null) {
      errors.expectedBudgetMax = "Please enter the maximum budget.";
    } else if (maxBudget < 0) {
      errors.expectedBudgetMax = "The budget cannot be negative.";
    } else if (!errors.expectedBudgetMin && maxBudget <= minBudget) {
      errors.expectedBudgetMax = "The maximum budget must be greater than the minimum budget.";
    }

    // Business-only
    if (clientType === "business") {
      if (!business.companyName.trim()) {
        errors.companyName = "The company name cannot be left blank.";
      } else if (business.companyName.trim().length < 2) {
        errors.companyName = "The company name is too short.";
      }

      const taxClean = business.taxCode.replace(/\-/g, "");
      if (!business.taxCode.trim()) {
        errors.taxCode = "The tax code cannot be left blank.";
      } else if (!/^\d{10}$/.test(taxClean) && !/^\d{13}$/.test(taxClean)) {
        errors.taxCode = "The tax code is invalid (10 or 13 digits).";
      }

      if (!business.industry.trim()) {
        errors.industry = "The industry cannot be left blank.";
      } else if (business.industry.trim().length < 3) {
        errors.industry = "The industry is too short.";
      }

      if (!business.companyAddress.trim()) {
        errors.companyAddress = "The company address cannot be left blank.";
      } else if (business.companyAddress.trim().length < 5) {
        errors.companyAddress = "The company address is too short.";
      }

      if (!business.businessEmail.trim()) {
        errors.businessEmail = "The business email cannot be left blank.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(business.businessEmail.trim())) {
        errors.businessEmail = "The business email is not in a valid format.";
      }

      const bizPhoneClean = business.businessPhone.replace(/[\s\-\.]/g, "");
      if (!business.businessPhone.trim()) {
        errors.businessPhone = "The business phone cannot be left blank.";
      } else if (
        !/^(0[2-9]\d{8,9})$/.test(bizPhoneClean) &&
        !/^(\+84[2-9]\d{8,9})$/.test(bizPhoneClean) &&
        !/^(84[2-9]\d{8,9})$/.test(bizPhoneClean)
      ) {
        errors.businessPhone = "The business phone is not in a valid format.";
      }
    }

    return errors;
  };

  // ── Submit: gọi API thật để BE (AI) check toàn bộ field ──────────
  const handleSubmit = async (e) => {
  e.preventDefault();
  setGlobalError("");

  const feErrors = validateForm();
  if (Object.keys(feErrors).length > 0) {
    setFieldErrors(feErrors);
    setGlobalError("Please check and fill in the correct fields below.");
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  setLoading(true);
  setFieldErrors({});

  try {
    let res;

    if (clientType === "individual") {
      const payload = {
        phoneNumber: individual.phoneNumber,
        address: individual.address,
        aiNeeds: individual.aiNeeds,
        mainProblems: individual.mainProblems,
        expectedBudgetMin: Number(individual.expectedBudgetMin),
        expectedBudgetMax: Number(individual.expectedBudgetMax),
      };

      res = isEdit
        ? await axiosInstance.put("/client-profiles/individual/me", payload)
        : await axiosInstance.post("/client-profiles/individual", payload);
    } else {
      const payload = {
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
      };

      res = isEdit
        ? await axiosInstance.put("/client-profiles/business/resubmit", payload)
        : await axiosInstance.post("/client-profiles/business", payload);
    }

    console.log("PROFILE SUBMIT RESPONSE:", res.data);

    const userStatus = res.data?.userStatus;
    const verificationStatus = res.data?.businessProfile?.verificationStatus;
    const verificationNote = res.data?.businessProfile?.verificationNote;

    if (
      userStatus === "BUSINESS_NEEDS_CORRECTION" ||
      verificationStatus === "NEEDS_CORRECTION"
    ) {
      setGlobalError(
        verificationNote || "Business information needs correction."
      );

      setFieldErrors({
        companyName: verificationNote || "Company name needs correction.",
        taxCode: verificationNote || "Tax code needs correction.",
        companyAddress: verificationNote || "Company address needs correction.",
      });

      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    navigate("/client/dashboard");
  } catch (err) {
    const { fieldErrors: beErrors, message } = parseApiError(err);

    if (Object.keys(beErrors).length > 0) {
      setFieldErrors(beErrors);
    }

    setGlobalError(message);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } finally {
    setLoading(false);
  }
};

  // ── Loading prefill ──────────────────────────────────────────────
  if (fetching) return (
    <div style={{ background: "#12151B", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#8c90a0", fontFamily: "Inter, sans-serif" }}>
      <span className="material-symbols-outlined" style={{ fontSize: 40, animation: "spin 1s linear infinite" }}>autorenew</span>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const form = clientType === "individual" ? individual : business;
  const handleChange = clientType === "individual" ? handleIndividualChange : handleBusinessChange;
  const hasFieldErrors = Object.values(fieldErrors).some(Boolean);

  return (
    <div style={{ background: "#12151B", color: "#e1e2eb", minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif" }}>

      {/* Navbar */}
      <nav style={{ position: "fixed", top: 0, width: "100%", zIndex: 50, background: "rgba(18,21,27,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 48px", height: 80, display: "flex", alignItems: "center", gap: 16 }}>
          <Link to="/select-role"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#8c90a0", textDecoration: "none", transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#e1e2eb"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#8c90a0"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          </Link>
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
              {isEdit ? "Update Your Profile" : "Complete Your Profile"}
            </h1>
            <p style={{ color: "#c2c6d6", fontSize: 15 }}>
              {isEdit ? "Fix the highlighted fields and resubmit" : "Help us understand your needs better"}
            </p>
          </div>

          {/* Global error banner — AI check fail */}
          {(globalError || hasFieldErrors) && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#f87171", flexShrink: 0, marginTop: 1 }}>gpp_bad</span>
              <div>
                <p style={{ color: "#f87171", fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>
                  AI Verification Failed
                </p>
                <p style={{ color: "#fca5a5", fontSize: 13, margin: 0 }}>
                  {globalError || "Please check and fix the fields marked in red below."}
                </p>
              </div>
            </div>
          )}

          {/* Client Type Toggle — lock khi isEdit */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
            {[
              { key: "individual", icon: "person", label: "Individual" },
              { key: "business", icon: "corporate_fare", label: "Business" },
            ].map((t) => (
              <button key={t.key} type="button"
                onClick={() => !isEdit && setClientType(t.key)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 16px", borderRadius: 8, border: `1px solid ${clientType === t.key ? "#00F0FF" : "rgba(255,255,255,0.12)"}`, background: clientType === t.key ? "rgba(0,240,255,0.05)" : "rgba(29,32,38,0.5)", color: clientType === t.key ? "#00F0FF" : "#8c90a0", cursor: isEdit ? "not-allowed" : "pointer", transition: "all 0.2s", fontWeight: 600, opacity: isEdit && clientType !== t.key ? 0.4 : 1 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Form Card */}
          <div style={{ background: "rgba(18,21,27,0.8)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 40, boxShadow: "0 8px 32px rgba(0,0,0,0.8)" }}>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Phone + Address */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ ...labelStyle, color: fieldErrors.phoneNumber ? "#f87171" : "#8c90a0" }}>
                      Phone Number {fieldErrors.phoneNumber && <span style={{ color: "#f87171" }}>*</span>}
                    </label>
                    <input type="text" name="phoneNumber" value={form.phoneNumber} onChange={handleChange}
                      placeholder="e.g. +84 912 345 678"
                      style={getInputStyle("phoneNumber", fieldErrors)}
                      onFocus={(e) => (e.target.style.borderColor = fieldErrors.phoneNumber ? "#ef4444" : "#00F0FF")}
                      onBlur={(e) => (e.target.style.borderColor = fieldErrors.phoneNumber ? "#ef4444" : "rgba(255,255,255,0.12)")} />
                    <FieldError name="phoneNumber" errors={fieldErrors} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, color: fieldErrors.address ? "#f87171" : "#8c90a0" }}>Address</label>
                    <input type="text" name="address" value={form.address} onChange={handleChange}
                      placeholder="e.g. Ho Chi Minh City"
                      style={getInputStyle("address", fieldErrors)}
                      onFocus={(e) => (e.target.style.borderColor = fieldErrors.address ? "#ef4444" : "#00F0FF")}
                      onBlur={(e) => (e.target.style.borderColor = fieldErrors.address ? "#ef4444" : "rgba(255,255,255,0.12)")} />
                    <FieldError name="address" errors={fieldErrors} />
                  </div>
                </div>

                {/* AI Needs */}
                <div>
                  <label style={{ ...labelStyle, color: fieldErrors.aiNeeds ? "#f87171" : "#8c90a0" }}>AI Needs</label>
                  <textarea name="aiNeeds" value={form.aiNeeds} onChange={handleChange}
                    placeholder="Describe what you need AI to do for you..." rows={3}
                    style={{ ...getInputStyle("aiNeeds", fieldErrors), resize: "none" }}
                    onFocus={(e) => (e.target.style.borderColor = fieldErrors.aiNeeds ? "#ef4444" : "#00F0FF")}
                    onBlur={(e) => (e.target.style.borderColor = fieldErrors.aiNeeds ? "#ef4444" : "rgba(255,255,255,0.12)")} />
                  <FieldError name="aiNeeds" errors={fieldErrors} />
                </div>

                {/* Main Problems */}
                <div>
                  <label style={{ ...labelStyle, color: fieldErrors.mainProblems ? "#f87171" : "#8c90a0" }}>Main Problems</label>
                  <textarea name="mainProblems" value={form.mainProblems} onChange={handleChange}
                    placeholder="Describe the main problems you're facing..." rows={3}
                    style={{ ...getInputStyle("mainProblems", fieldErrors), resize: "none" }}
                    onFocus={(e) => (e.target.style.borderColor = fieldErrors.mainProblems ? "#ef4444" : "#00F0FF")}
                    onBlur={(e) => (e.target.style.borderColor = fieldErrors.mainProblems ? "#ef4444" : "rgba(255,255,255,0.12)")} />
                  <FieldError name="mainProblems" errors={fieldErrors} />
                </div>

                {/* Budget */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ ...labelStyle, color: fieldErrors.expectedBudgetMin ? "#f87171" : "#8c90a0" }}>Min Budget (USD)</label>
                    <input type="number" min="0" name="expectedBudgetMin" value={form.expectedBudgetMin} onChange={handleBudgetChange}
                      placeholder="500"
                      style={getInputStyle("expectedBudgetMin", fieldErrors)}
                      onFocus={(e) => (e.target.style.borderColor = fieldErrors.expectedBudgetMin ? "#ef4444" : "#00F0FF")}
                      onBlur={(e) => (e.target.style.borderColor = fieldErrors.expectedBudgetMin ? "#ef4444" : "rgba(255,255,255,0.12)")} />
                    <FieldError name="expectedBudgetMin" errors={fieldErrors} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, color: fieldErrors.expectedBudgetMax ? "#f87171" : "#8c90a0" }}>Max Budget (USD)</label>
                    <input type="number" min="0" name="expectedBudgetMax" value={form.expectedBudgetMax} onChange={handleBudgetChange}
                      placeholder="5000"
                      style={getInputStyle("expectedBudgetMax", fieldErrors)}
                      onFocus={(e) => (e.target.style.borderColor = fieldErrors.expectedBudgetMax ? "#ef4444" : "#00F0FF")}
                      onBlur={(e) => (e.target.style.borderColor = fieldErrors.expectedBudgetMax ? "#ef4444" : "rgba(255,255,255,0.12)")} />
                    <FieldError name="expectedBudgetMax" errors={fieldErrors} />
                  </div>
                </div>

                {/* Business only fields */}
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
                            placeholder="AITasker Inc."
                            style={getInputStyle("companyName", fieldErrors)}
                            onFocus={(e) => (e.target.style.borderColor = fieldErrors.companyName ? "#ef4444" : "#00F0FF")}
                            onBlur={(e) => (e.target.style.borderColor = fieldErrors.companyName ? "#ef4444" : "rgba(255,255,255,0.12)")} />
                          <FieldError name="companyName" errors={fieldErrors} />
                        </div>
                        <div>
                          <label style={{ ...labelStyle, color: fieldErrors.taxCode ? "#f87171" : "#8c90a0" }}>Tax Code</label>
                          <input type="text" name="taxCode" value={business.taxCode} onChange={handleBusinessChange}
                            placeholder="0123456789"
                            style={getInputStyle("taxCode", fieldErrors)}
                            onFocus={(e) => (e.target.style.borderColor = fieldErrors.taxCode ? "#ef4444" : "#00F0FF")}
                            onBlur={(e) => (e.target.style.borderColor = fieldErrors.taxCode ? "#ef4444" : "rgba(255,255,255,0.12)")} />
                          <FieldError name="taxCode" errors={fieldErrors} />
                        </div>
                      </div>

                      <div>
                        <label style={{ ...labelStyle, color: fieldErrors.industry ? "#f87171" : "#8c90a0" }}>Industry</label>
                        <input type="text" name="industry" value={business.industry} onChange={handleBusinessChange}
                          placeholder="e.g. Information Technology, Finance..."
                          style={getInputStyle("industry", fieldErrors)}
                          onFocus={(e) => (e.target.style.borderColor = fieldErrors.industry ? "#ef4444" : "#00F0FF")}
                          onBlur={(e) => (e.target.style.borderColor = fieldErrors.industry ? "#ef4444" : "rgba(255,255,255,0.12)")} />
                        <FieldError name="industry" errors={fieldErrors} />
                      </div>

                      <div>
                        <label style={{ ...labelStyle, color: fieldErrors.companyAddress ? "#f87171" : "#8c90a0" }}>Company Address</label>
                        <input type="text" name="companyAddress" value={business.companyAddress} onChange={handleBusinessChange}
                          placeholder="123 Nguyen Hue, District 1, HCMC"
                          style={getInputStyle("companyAddress", fieldErrors)}
                          onFocus={(e) => (e.target.style.borderColor = fieldErrors.companyAddress ? "#ef4444" : "#00F0FF")}
                          onBlur={(e) => (e.target.style.borderColor = fieldErrors.companyAddress ? "#ef4444" : "rgba(255,255,255,0.12)")} />
                        <FieldError name="companyAddress" errors={fieldErrors} />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div>
                          <label style={{ ...labelStyle, color: fieldErrors.businessEmail ? "#f87171" : "#8c90a0" }}>Business Email</label>
                          <input type="email" name="businessEmail" value={business.businessEmail} onChange={handleBusinessChange}
                            placeholder="contact@company.com"
                            style={getInputStyle("businessEmail", fieldErrors)}
                            onFocus={(e) => (e.target.style.borderColor = fieldErrors.businessEmail ? "#ef4444" : "#00F0FF")}
                            onBlur={(e) => (e.target.style.borderColor = fieldErrors.businessEmail ? "#ef4444" : "rgba(255,255,255,0.12)")} />
                          <FieldError name="businessEmail" errors={fieldErrors} />
                        </div>
                        <div>
                          <label style={{ ...labelStyle, color: fieldErrors.businessPhone ? "#f87171" : "#8c90a0" }}>Business Phone</label>
                          <input type="text" name="businessPhone" value={business.businessPhone} onChange={handleBusinessChange}
                            placeholder="+84 28 1234 5678"
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
                  {isEdit && (
                    <button type="button" onClick={() => navigate("/client/dashboard")}
                      style={{ flex: 1, padding: "16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#e1e2eb", cursor: "pointer", fontWeight: 600, fontFamily: "Inter, sans-serif", fontSize: 15 }}>
                      Cancel
                    </button>
                  )}
                  <button type="submit" disabled={loading}
                    style={{ flex: 2, background: loading ? "#1d2026" : "#00F0FF", color: loading ? "#8c90a0" : "#002022", fontFamily: "Hanken Grotesk, sans-serif", fontWeight: 700, fontSize: 16, padding: "16px", borderRadius: 8, border: "none", cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 0 20px rgba(0,240,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" }}>
                    {loading ? (
                      <><span className="material-symbols-outlined" style={{ animation: "spin 1s linear infinite" }}>autorenew</span><span>AI đang xác minh...</span></>
                    ) : isEdit ? (
                      <><span>Resubmit</span><span className="material-symbols-outlined">send</span></>
                    ) : (
                      <><span>Submit & Verify</span><span className="material-symbols-outlined">verified</span></>
                    )}
                  </button>
                </div>

              </div>
            </form>
          </div>
        </div>
      </main>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}