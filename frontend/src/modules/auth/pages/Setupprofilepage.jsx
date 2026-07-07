// src/modules/auth/pages/SetupProfilePage.jsx
// Individual: POST /api/client-profiles/individual  { phoneNumber, address }
// Business:   POST /api/client-profiles/business    { phoneNumber, address, taxCode, industry, businessEmail, businessPhone }
//             PUT  /api/client-profiles/business/resubmit (khi NEEDS_CORRECTION)
//             PUT  /api/client-profiles/business/me (khi đã VERIFIED, chỉnh sửa thường)
// GET data:   GET  /api/client-profiles/me
//
// Flow:
// 1. User nhập đủ field hợp lệ (FE validate) → submit
// 2. BE verify qua VietQR tax code lookup
//    - VERIFIED → hiện companyName + companyAddress (readonly) do AI trả về
//    - NEEDS_CORRECTION → hiện lỗi + tăng verificationSubmissionCount
// 3. Khi BE xác định quá số lần sai → BE trả verificationLockedUntil
//    - Trong lúc ban: ẨN nút Submit, hiện alert "Account is banned", hiện nút quay về dashboard
//    - Hết 15s: tự động unlock, cho submit lại

import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axiosInstance";
import { useAuth } from "../../../context/AuthContext";

const BG_IMAGE =
  "https://lh3.googleusercontent.com/aida/ADBb0uiAogMCN4ONd1eV0ckwyeNv8QfTOCxlvbOfag-KSL1Cdba-otv2YjPez9ovCM3FL-qyGKTDeVirDziA80hhQSTs6XXast-3vn_rIy5jZgYjYUXxWbn7589Hj6JdyzhvkZYNXQ9pQUbNptjiPkROg5Kp1z8ZHsKZL28Xmx-Rtm9fYag14W6IkJdjjWBtwCUOnpOhakWfAR9l6aohBmWnTPgav2fsqTD4ZFoyetZhmIs7tPIQxkGVlrRy0gVd";


function FieldError({ name, errors }) {
  if (!errors[name]) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-400">
      <span className="material-symbols-outlined text-[13px]">error</span>
      {errors[name]}
    </p>
  );
}

function parseApiError(err) {
  const status = err?.response?.status;
  const resData = err?.response?.data;

  if (!resData) {
    return { fieldErrors: {}, message: "Could not connect to the server.", businessProfile: null };
  }

  const fieldErrors = {};
  
  if (resData.errors && typeof resData.errors === "object" && !Array.isArray(resData.errors)) {
    Object.assign(fieldErrors, resData.errors);
  }

  if (resData.message === "Phone number already exists.") {
    fieldErrors.phoneNumber = "This phone number is already in use.";
  }

  if (resData.message === "Business email already exists.") {
    fieldErrors.businessEmail = "This business email is already in use.";
  }

  const businessProfile = resData.businessProfile || null;

  const message =
    resData.message ||
    resData.title ||
    businessProfile?.verificationNote ||
    (status === 401 && "Your session has expired. Please log in again.") ||
    (status === 403 && "You do not have permission.") ||
    (status === 409 && "Tax code or email already exists.") ||
    (status === 423 && "Too many failed attempts. Please wait.") ||
    (status >= 500 && "Server error. Please try again later.") ||
    "Some information is invalid.";

  return { fieldErrors, message, businessProfile };
}

export default function SetupProfilePage() {
  const navigate = useNavigate();
  const { handleLoginSuccess } = useAuth();

  const [clientType, setClientType] = useState("individual");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [globalError, setGlobalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isEdit, setIsEdit] = useState(false);
  const [verifiedBusiness, setVerifiedBusiness] = useState(null);

  // Countdown khi bị ban
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
  const lockIntervalRef = useRef(null);
  const hasAlertedRef = useRef(false); // tránh alert lặp lại nhiều lần

  const [individual, setIndividual] = useState({ phoneNumber: "", address: "" });

  const [business, setBusiness] = useState({
    phoneNumber: "",
    address: "",
    taxCode: "",
    industry: "",
    businessEmail: "",
    businessPhone: "",
    verificationStatus: "",
    verificationNote: "",
    verificationSubmissionCount: 0,
    verificationLockedUntil: null,
  });

  // ── Prefill ──────────────────────────────────────────────────────
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await axiosInstance.get("/client-profiles/me");
        const data = res.data;

        if (data?.userStatus === "ACTIVE") {
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

        const updatedUser = {
          ...currentUser,
          role: "CLIENT",
          status: "ACTIVE",
        };

        handleLoginSuccess({
          user: updatedUser,
        });

        navigate("/client/dashboard", { replace: true });
        return;
      }

        const bp = data?.businessProfile || null;
        const isBusiness = data?.clientType === "BUSINESS" || Boolean(bp);

        setIsEdit(Boolean(data?.clientProfileId || data?.phoneNumber));
        setClientType(isBusiness ? "business" : "individual");

        if (isBusiness) {
          setBusiness({
            phoneNumber: data?.phoneNumber || "",
            address: data?.address || "",
            taxCode: bp?.taxCode || "",
            industry: bp?.industry || "",
            businessEmail: bp?.businessEmail || "",
            businessPhone: bp?.businessPhone || "",
            verificationStatus: bp?.verificationStatus || "",
            verificationNote: bp?.verificationNote || "",
            verificationSubmissionCount: bp?.verificationSubmissionCount || 0,
            verificationLockedUntil: bp?.verificationLockedUntil || null,
          });
          if (bp?.verificationStatus === "VERIFIED") setVerifiedBusiness(bp);
        } else {
          setIndividual({ phoneNumber: data?.phoneNumber || "", address: data?.address || "" });
        }
      } catch {
        setIsEdit(false);
      } finally {
        setFetching(false);
      }
    };
    loadProfile();
  }, [navigate, handleLoginSuccess]);

  // ── Ban countdown — tự update mỗi giây, tự unlock khi hết ─────────
  useEffect(() => {
    if (lockIntervalRef.current) {
      clearInterval(lockIntervalRef.current);
      lockIntervalRef.current = null;
    }

    if (!business.verificationLockedUntil) {
      setLockSecondsLeft(0);
      hasAlertedRef.current = false;
      return;
    }

    const updateCountdown = () => {
      const remainMs = new Date(business.verificationLockedUntil).getTime() - Date.now();
      const remainSec = Math.max(0, Math.ceil(remainMs / 1000));
      setLockSecondsLeft(remainSec);

      if (remainSec <= 0) {
        clearInterval(lockIntervalRef.current);
        lockIntervalRef.current = null;
        setBusiness((prev) => ({ ...prev, verificationLockedUntil: null, verificationSubmissionCount: 0 }));
        setGlobalError("");
        setFieldErrors({});
        hasAlertedRef.current = false;
      }
    };

    updateCountdown();
    lockIntervalRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (lockIntervalRef.current) clearInterval(lockIntervalRef.current);
    };
  }, [business.verificationLockedUntil]);

  const locked = clientType === "business" && lockSecondsLeft > 0;
  const attempts = business.verificationSubmissionCount || 0;

  const inputClass = (name) =>
    `w-full rounded-lg border bg-[#232A35] px-4 py-3 text-sm text-[#e1e2eb] outline-none transition placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-60 [color-scheme:dark] autofill:shadow-[inset_0_0_0px_1000px_#232A35] autofill:[-webkit-text-fill-color:#e1e2eb] ${
      fieldErrors[name] ? "border-red-500 focus:border-red-500" : "border-white/10 focus:border-cyan-400"
    }`;

  const clearError = (name) => {
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: null }));
    setGlobalError("");
  };

  const clearVerifiedBusiness = () => {
    if (verifiedBusiness) setVerifiedBusiness(null);
  };

  const handleIndividualChange = (e) => {
    const { name, value } = e.target;
    setIndividual((prev) => ({ ...prev, [name]: value }));
    clearError(name);
  };

  const handleBusinessChange = (e) => {
    const { name, value } = e.target;
    setBusiness((prev) => ({ ...prev, [name]: value }));
    clearError(name);
    clearVerifiedBusiness();
  };

  const validateForm = () => {
    const errors = {};
    const f = clientType === "individual" ? individual : business;

    const phoneClean = f.phoneNumber.replace(/[\s-.]/g, "");

    if (!f.phoneNumber.trim()) {
      errors.phoneNumber = "Personal phone number is required.";
    } else if (!/^(0|84|\+84)(3|5|7|8|9)\d{8}$/.test(phoneClean)) {
      errors.phoneNumber = "Invalid VN mobile number. Example: 0912345678.";
    }

    if (!f.address.trim()) errors.address = "Address is required.";

    if (clientType === "business") {
      const taxClean = business.taxCode.replace(/-/g, "");
      if (!business.taxCode.trim()) {
        errors.taxCode = "Tax code is required.";
      } else if (!/^\d{10}$/.test(taxClean)) {
        errors.taxCode = "Tax code must have 10 digits.";
      }

      if (!business.industry.trim()) errors.industry = "Industry is required.";

      if (!business.businessEmail.trim()) {
        errors.businessEmail = "Business email is required.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(business.businessEmail.trim())) {
        errors.businessEmail = "Invalid email format.";
      }

      const bizPhoneClean = business.businessPhone.replace(/[\s-.]/g, "");

      if (!business.businessPhone.trim()) {
        errors.businessPhone = "Company phone number is required.";
      } else if (!/^(0\d{9,10}|84\d{9,10}|\+84\d{9,10})$/.test(bizPhoneClean)) {
        errors.businessPhone =
          "Invalid company phone number. Example: 02812345678 or 0912345678.";
      }
    }

    return errors;
  };

  // ── Áp kết quả verify (cả success path và error path đều gọi hàm này) ──
  const applyBusinessVerificationResult = (data) => {
    const bp = data?.businessProfile;
    if (!bp) return false;
    setIsEdit(true);

    setBusiness((prev) => ({
      ...prev,
      verificationStatus: bp.verificationStatus || "",
      verificationNote: bp.verificationNote || "",
      verificationSubmissionCount: bp.verificationSubmissionCount || 0,
      verificationLockedUntil: bp.verificationLockedUntil || null,
    }));

    if (bp.verificationStatus === "VERIFIED") {
      setVerifiedBusiness(bp);
      setGlobalError("");
      setFieldErrors({});
      window.scrollTo({ top: 0, behavior: "smooth" });
      return true;
    }

    const count = bp.verificationSubmissionCount || 0;
    const msg =
      bp.verificationNote ||
      "Business verification failed. Please check your tax code.";

    if (bp.verificationLockedUntil) {
      const secondsLeft = Math.max(
        0,
        Math.ceil((new Date(bp.verificationLockedUntil).getTime() - Date.now()) / 1000)
      );

      setGlobalError(`Too many failed attempts. Your account has been banned for ${secondsLeft} seconds.`);

      // Alert riêng — chỉ bắn 1 lần khi vừa chạm ngưỡng ban
      if (!hasAlertedRef.current) {
        hasAlertedRef.current = true;
        alert("Account is banned. Too many failed verification attempts. Please wait 15 seconds.");
      }
    } else {
      setGlobalError(
        `Tax code verification failed. Attempt ${count}. Please check your tax code and try again.`
      );
    }

    setFieldErrors({ taxCode: msg });
    window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const feErrors = validateForm();
    if (Object.keys(feErrors).length > 0) {
      setFieldErrors(feErrors);
      setGlobalError("Please check the highlighted fields.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (clientType === "business" && locked) {
      setGlobalError(`Account is banned. Try again in ${lockSecondsLeft}s.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setLoading(true);
    setGlobalError("");
    setFieldErrors({});
    setVerifiedBusiness(null);

    try {
      let res;

      if (clientType === "individual") {
        const payload = {
          phoneNumber: individual.phoneNumber.trim(),
          address: individual.address.trim(),
        };

        res = isEdit
          ? await axiosInstance.put("/client-profiles/individual/me", payload)
          : await axiosInstance.post("/client-profiles/individual", payload);

        const meRes = await axiosInstance.get("/auth/me");
        const freshUser = meRes?.data?.data || meRes?.data;

        handleLoginSuccess({
          user: freshUser,
        });

        navigate("/client/dashboard", { replace: true });
        return;
      }

      const payload = {
        phoneNumber: business.phoneNumber.trim(),
        address: business.address.trim(),
        taxCode: business.taxCode.trim(),
        industry: business.industry.trim(),
        businessEmail: business.businessEmail.trim(),
        businessPhone: business.businessPhone.trim(),
      };

      const shouldResubmit = ["NEEDS_CORRECTION", "REJECTED", "FAILED"].includes(business.verificationStatus);

      if (shouldResubmit) {
        res = await axiosInstance.put("/client-profiles/business/resubmit", payload);
      } else if (!isEdit) {
        res = await axiosInstance.post("/client-profiles/business", payload);
      } else {
        res = await axiosInstance.put("/client-profiles/business/me", payload);
      }

      applyBusinessVerificationResult(res.data);
    } catch (err) {
      const { fieldErrors: beErrors, message, businessProfile } = parseApiError(err);

      if (businessProfile) {
        applyBusinessVerificationResult({ businessProfile });
        return;
      }

      // BE trả lock message dạng text, không có businessProfile object
      // Ví dụ: "...Please try again after 2026-06-18 09:51:59 UTC."
      const lockMatch = message?.match(/after\s+([\d-]+\s[\d:]+)\s*UTC/i);
      if (lockMatch) {
        const lockedUntilUtc = lockMatch[1].replace(" ", "T") + "Z";
        setBusiness((prev) => ({
          ...prev,
          verificationLockedUntil: lockedUntilUtc,
        }));
        setGlobalError(message);
        if (!hasAlertedRef.current) {
          hasAlertedRef.current = true;
          alert("Account is banned. Too many failed verification attempts. Please wait.");
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      setGlobalError(message);

      if (Object.keys(beErrors).length > 0) {
        setFieldErrors(beErrors);
      }  else {
      const mappedErrors = {};

      if (message === "Phone number already exists.") {
        mappedErrors.phoneNumber = "This phone number is already in use.";
      }

      if (message === "Business email already exists.") {
        mappedErrors.businessEmail = "This business email is already in use.";
      }

      if (Object.keys(mappedErrors).length > 0) {
        setFieldErrors(mappedErrors);
      } else if (clientType === "business") {

        if (message?.toLowerCase().includes("business phone")) {
          setFieldErrors({ businessPhone: message });
        } else if (message?.toLowerCase().includes("business email")) {
          setFieldErrors({ businessEmail: message });
        } else if (message?.toLowerCase().includes("tax")) {
          setFieldErrors({ taxCode: message });
        } else {
          setFieldErrors({ taxCode: message });
        }

      }
    }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#12151B] text-gray-400">
        <span className="material-symbols-outlined animate-spin text-4xl">autorenew</span>
      </div>
    );
  }

  const form = clientType === "individual" ? individual : business;
  const handleChange = clientType === "individual" ? handleIndividualChange : handleBusinessChange;

  return (
    <div className="min-h-screen bg-[#12151B] text-[#e1e2eb]">
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-[#12151B]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-6 md:px-12">
          <Link to="/select-role" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:text-white">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </Link>
          <span className="text-2xl font-bold"><span className="text-cyan-400">AI</span> Tasker</span>
        </div>
      </nav>

      <main
        className="min-h-screen bg-cover bg-center px-4 pb-24 pt-32"
        style={{ backgroundImage: `linear-gradient(rgba(18,21,27,0.72), rgba(18,21,27,0.72)), url('${BG_IMAGE}')` }}
      >
        <div className="mx-auto max-w-2xl">
          <div className="mb-10 text-center">
            <h1 className="mb-2 text-4xl font-bold">
              {verifiedBusiness ? "Business Verified" : locked ? "Account Banned" : isEdit ? "Update Your Profile" : "Complete Your Profile"}
            </h1>
            <p className="text-sm text-gray-300">
              {clientType === "business" ? "Tax code will be verified automatically by VietQR" : "Help us verify your identity"}
            </p>
          </div>

          {/* Ban banner — ưu tiên cao nhất, có countdown live */}
          {locked && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
              <span className="material-symbols-outlined text-2xl text-red-400">block</span>
              <div className="flex-1">
                <p className="font-semibold text-red-300">Account is banned</p>
                <p className="text-sm text-red-200/80">Too many failed verification attempts. Please wait before trying again.</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-red-400 text-lg font-bold text-red-300">
                {lockSecondsLeft}
              </div>
            </div>
          )}

          {/* Error banner (không hiện khi đang ban — ban banner đã đủ rõ) */}
          {globalError && !locked && (
            <div className="mb-6 flex gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <span className="material-symbols-outlined text-red-400">gpp_bad</span>
              <div>
                <p className="font-semibold text-red-400">Verification Failed</p>
                <p className="text-sm text-red-300">{globalError}</p>
              </div>
            </div>
          )}

          {/* Attempts warning */}
          {clientType === "business" && !verifiedBusiness && !locked && attempts > 0 && (
            <div className="mb-6 rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-yellow-300">
                  <span className="material-symbols-outlined">warning</span>
                  <span className="font-semibold">Failed verification attempts</span>
                </div>
                <span className="rounded-full bg-yellow-400/20 px-3 py-1 text-sm font-bold text-yellow-200">
                  {attempts}
                </span>
              </div>
              <p className="mt-2 text-sm text-yellow-100/80"> Failed attempts are counted by the server.</p>
            </div>
          )}

          {/* Verified success banner */}
          {verifiedBusiness && (
            <div className="mb-6 flex gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4">
              <span className="material-symbols-outlined text-emerald-300">verified</span>
              <div>
                <p className="font-semibold text-emerald-300">Business verified successfully</p>
                <p className="text-sm text-emerald-100/80">Please review your company information before entering the dashboard.</p>
              </div>
            </div>
          )}

          {/* Client Type Toggle */}
          <div className="mb-8 grid grid-cols-2 gap-3">
            {[
              { key: "individual", label: "Individual", icon: "person" },
              { key: "business", label: "Business", icon: "corporate_fare" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                disabled={isEdit || Boolean(verifiedBusiness)}
                onClick={() => setClientType(item.key)}
                className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 font-semibold transition ${
                  clientType === item.key ? "border-cyan-400 bg-cyan-400/10 text-cyan-400" : "border-white/10 bg-[#1D2026]/70 text-gray-400"
                } ${isEdit || verifiedBusiness ? "cursor-not-allowed opacity-60" : "hover:border-cyan-400"}`}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#12151B]/85 p-6 shadow-2xl backdrop-blur-xl md:p-10">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400">Personal Phone Number</label>
                  <input name="phoneNumber" value={form.phoneNumber} onChange={handleChange} placeholder="0912345678"
                    disabled={Boolean(verifiedBusiness) || locked} className={inputClass("phoneNumber")} />
                  <FieldError name="phoneNumber" errors={fieldErrors} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400">Personal Address</label>
                  <input name="address" value={form.address} onChange={handleChange} placeholder="Da Nang"
                    disabled={Boolean(verifiedBusiness) || locked} className={inputClass("address")} />
                  <FieldError name="address" errors={fieldErrors} />
                </div>
              </div>

              {clientType === "business" && (
                <div className="border-t border-white/10 pt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan-400">Business Information</p>
                  <p className="mb-5 text-xs leading-6 text-gray-400">
                    Company name and official company address are checked automatically from the tax code via VietQR lookup.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400">Tax Code</label>
                      <input name="taxCode" value={business.taxCode} onChange={handleBusinessChange} placeholder="0101243150"
                        disabled={locked || Boolean(verifiedBusiness)} className={inputClass("taxCode")} />
                      <FieldError name="taxCode" errors={fieldErrors} />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400">Industry</label>
                      <input name="industry" value={business.industry} onChange={handleBusinessChange} placeholder="Software Development"
                        disabled={locked || Boolean(verifiedBusiness)} className={inputClass("industry")} />
                      <FieldError name="industry" errors={fieldErrors} />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400">Business Email</label>
                        <input name="businessEmail" type="email" value={business.businessEmail} onChange={handleBusinessChange}
                          placeholder="business@example.com" disabled={locked || Boolean(verifiedBusiness)} className={inputClass("businessEmail")} />
                        <FieldError name="businessEmail" errors={fieldErrors} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400">Company Phone Number</label>
                        <input name="businessPhone" value={business.businessPhone} onChange={handleBusinessChange} placeholder="0243768900"
                          disabled={locked || Boolean(verifiedBusiness)} className={inputClass("businessPhone")} />
                        <FieldError name="businessPhone" errors={fieldErrors} />
                      </div>
                    </div>

                    {/* Company info — chỉ hiện sau khi VERIFIED, readonly */}
                    {verifiedBusiness && (
                      <div className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4">
                        <div className="mb-4 flex items-center gap-2 text-emerald-300">
                          <span className="material-symbols-outlined">verified</span>
                          <span className="font-semibold">Verified Company Information</span>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400">Company Name</label>
                            <input value={verifiedBusiness.companyName || ""} readOnly
                              className="w-full rounded-lg border border-emerald-400/30 bg-[#1F2937] px-4 py-3 text-sm text-emerald-200 outline-none" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400">Company Address</label>
                            <textarea value={verifiedBusiness.companyAddress || ""} readOnly rows={3}
                              className="w-full resize-none rounded-lg border border-emerald-400/30 bg-[#1F2937] px-4 py-3 text-sm text-emerald-200 outline-none" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                {verifiedBusiness ? (
                  <button type="button" onClick={() => navigate("/client/dashboard")}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-4 font-bold text-[#002022] shadow-[0_0_20px_rgba(52,211,153,0.35)] hover:bg-emerald-300">
                    Go to Dashboard
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                ) : (
                  <button type="submit" disabled={loading || locked}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-4 font-bold transition ${
                      loading || locked ? "cursor-not-allowed bg-[#1D2026] text-gray-500" : "bg-cyan-400 text-[#002022] shadow-[0_0_20px_rgba(34,211,238,0.35)] hover:bg-cyan-300"
                    }`}>
                    {loading ? (
                      <><span className="material-symbols-outlined animate-spin">autorenew</span>Verifying...</>
                    ) : locked ? (
                      <><span className="material-symbols-outlined">lock</span>Locked {lockSecondsLeft}s</>
                    ) : (
                      <>Submit & Verify<span className="material-symbols-outlined">verified</span></>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}