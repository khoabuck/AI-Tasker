// src/modules/auth/pages/SetupProfilePage.jsx
// Individual: POST /api/client-profiles/individual  { phoneNumber, address }
// Business:   POST /api/client-profiles/business    { phoneNumber, address, taxCode, industry, businessEmail, businessPhone }
//             PUT  /api/client-profiles/business/resubmit (khi NEEDS_CORRECTION)
//             PUT  /api/client-profiles/business/me (khi đã VERIFIED, chỉnh sửa thường)
// GET data:   GET  /api/client-profiles/me

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

function unwrapAuthUser(response) {
  const data = response?.data;

  return (
    data?.data?.user ||
    data?.data?.User ||
    data?.data ||
    data?.user ||
    data?.User ||
    data
  );
}

function getLockSeconds(lockedUntil) {
  if (!lockedUntil) return 0;

  const lockedUntilTime = new Date(lockedUntil).getTime();

  if (Number.isNaN(lockedUntilTime)) {
    return 0;
  }

  return Math.max(
    0,
    Math.ceil((lockedUntilTime - Date.now()) / 1000)
  );
}

function formatRemainingTime(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);

  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const parts = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0 || days > 0) {
    parts.push(`${minutes}m`);
  }

  parts.push(`${seconds}s`);

  return parts.join(" ");
}

function LockPopup({
  open,
  message,
  secondsLeft,
  lockedUntil,
  onClose,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-[#171B22] p-6 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-500/15">
            <span className="material-symbols-outlined text-2xl text-red-400">
              lock
            </span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-red-300">
              Business verification locked
            </h2>

          </div>
        </div>

        {secondsLeft > 0 && (
          <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-center">
            <p className="text-xs uppercase tracking-widest text-red-200/70">
              Try again in
            </p>

            <p className="mt-1 text-2xl font-bold text-red-300">
              {formatRemainingTime(secondsLeft)}
            </p>

            {lockedUntil && (
              <p className="mt-2 text-xs text-red-100/60">
                Available again at{" "}
                {new Date(lockedUntil).toLocaleString()}
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg bg-red-400 px-4 py-3 font-bold text-[#2A0808] transition hover:bg-red-300"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function parseApiError(err) {
  const status = err?.response?.status;
  const resData = err?.response?.data;

  if (!resData) {
    return {
      fieldErrors: {},
      message: "Could not connect to the server.",
      businessProfile: null,
    };
  }

  const sourceData = resData?.data || resData;
  const fieldErrors = {};

  if (
    sourceData.errors &&
    typeof sourceData.errors === "object" &&
    !Array.isArray(sourceData.errors)
  ) {
    Object.entries(sourceData.errors).forEach(([key, value]) => {
      const normalizedKey =
        key.charAt(0).toLowerCase() + key.slice(1);

      fieldErrors[normalizedKey] = Array.isArray(value)
        ? value[0]
        : String(value);
    });
  }

  if (sourceData.message === "Phone number already exists.") {
    fieldErrors.phoneNumber = "This phone number is already in use.";
  }

  if (sourceData.message === "Business email already exists.") {
    fieldErrors.businessEmail =
      "This business email is already in use.";
  }

  const businessProfile =
    sourceData.businessProfile || null;

  const message =
    sourceData.message ||
    sourceData.title ||
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

  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
  const lockIntervalRef = useRef(null);

  const [lockPopup, setLockPopup] = useState({
    open: false,
    message: "",
  });

  const [individual, setIndividual] = useState({
    phoneNumber: "",
    address: "",
  });

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

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await axiosInstance.get("/client-profiles/me");
        const data = res.data;

        if (data?.userStatus === "ACTIVE") {
          const meRes = await axiosInstance.get("/auth/me");
          const freshUser = unwrapAuthUser(meRes);

          handleLoginSuccess({
            user: freshUser,
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

          const secondsLeft = getLockSeconds(
            bp?.verificationLockedUntil
          );

          const isLockedProfile =
            bp?.verificationStatus === "LOCKED" &&
            secondsLeft > 0;

          if (isLockedProfile) {
            setLockPopup({
              open: true,
              message:
                bp?.verificationNote ||
                "Business verification is temporarily locked.",
            });
          }

          if (bp?.verificationStatus === "VERIFIED") {
            setVerifiedBusiness(bp);
          }
        } else {
          setIndividual({
            phoneNumber: data?.phoneNumber || "",
            address: data?.address || "",
          });
        }
      } catch (err) {
        const status = err?.response?.status;
        const { message } = parseApiError(err);

        if (status === 401) {
          navigate("/login", { replace: true });
          return;
        }

        if (status === 404) {
          setIsEdit(false);
          return;
        }

        setGlobalError(message);
      } finally {
        setFetching(false);
      }
    };

    loadProfile();
  }, [navigate, handleLoginSuccess]);

  useEffect(() => {
    if (lockIntervalRef.current) {
      clearInterval(lockIntervalRef.current);
      lockIntervalRef.current = null;
    }

    if (!business.verificationLockedUntil) {
      setLockSecondsLeft(0);
      return;
    }

    let isSyncing = false;

    const syncProfileAfterLock = async () => {
      if (isSyncing) return;

      isSyncing = true;

      try {
        const res = await axiosInstance.get(
          "/client-profiles/me"
        );

        const data = res.data;
        const bp = data?.businessProfile || null;

        setBusiness((prev) => ({
          ...prev,
          verificationStatus:
            bp?.verificationStatus || "",
          verificationNote:
            bp?.verificationNote || "",
          verificationSubmissionCount:
            bp?.verificationSubmissionCount || 0,
          verificationLockedUntil:
            getLockSeconds(bp?.verificationLockedUntil) > 0
              ? bp.verificationLockedUntil
              : null,
        }));

        if (
          bp?.verificationStatus !== "LOCKED" ||
          getLockSeconds(bp?.verificationLockedUntil) <= 0
        ) {
          setLockPopup({
            open: false,
            message: "",
          });

          setGlobalError("");
          setFieldErrors({});
        }
      } catch (err) {
        const { message } = parseApiError(err);
        setGlobalError(message);
      } finally {
        isSyncing = false;
      }
    };

    const updateCountdown = () => {
      const remainSec = getLockSeconds(
        business.verificationLockedUntil
      );

      setLockSecondsLeft(remainSec);

      if (remainSec <= 0) {
        if (lockIntervalRef.current) {
          clearInterval(lockIntervalRef.current);
          lockIntervalRef.current = null;
        }

        syncProfileAfterLock();
      }
    };

    updateCountdown();

    lockIntervalRef.current = setInterval(
      updateCountdown,
      1000
    );

    return () => {
      if (lockIntervalRef.current) {
        clearInterval(lockIntervalRef.current);
        lockIntervalRef.current = null;
      }
    };
  }, [business.verificationLockedUntil]);

  const locked = clientType === "business" && lockSecondsLeft > 0;
  const attempts = business.verificationSubmissionCount || 0;

  const inputClass = (name) =>
    `w-full rounded-lg border bg-[#232A35] px-4 py-3 text-sm text-[#e1e2eb] outline-none transition placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-60 [color-scheme:dark] autofill:shadow-[inset_0_0_0px_1000px_#232A35] autofill:[-webkit-text-fill-color:#e1e2eb] ${
      fieldErrors[name]
        ? "border-red-500 focus:border-red-500"
        : "border-white/10 focus:border-cyan-400"
    }`;

  const clearError = (name) => {
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }

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

    const nextValue =
      name === "taxCode" || name === "businessPhone"
        ? value.replace(/\D/g, "").slice(0, 10)
        : value;

    setBusiness((prev) => ({ ...prev, [name]: nextValue }));
    clearError(name);
    clearVerifiedBusiness();
  };

  const validateForm = () => {
    const errors = {};
    const f = clientType === "individual" ? individual : business;

    const phoneClean = f.phoneNumber.replace(/[\s-.]/g, "");

    if (!f.phoneNumber.trim()) {
      errors.phoneNumber = "Phone number is required.";
    } else if (
      !/^(0[3-9]\d{8})$/.test(phoneClean) &&
      !/^(\+84[3-9]\d{8})$/.test(phoneClean) &&
      !/^(84[3-9]\d{8})$/.test(phoneClean)
    ) {
      errors.phoneNumber = "Invalid VN phone number. Example: 0912345678.";
    }

    if (!f.address.trim()) {
      errors.address = "Address is required.";
    }

    if (clientType === "business") {
      const taxClean = business.taxCode.trim();

      if (!taxClean) {
        errors.taxCode = "Tax code is required.";
      } else if (!/^\d{10}$/.test(taxClean)) {
        errors.taxCode = "Tax code must have exactly 10 digits.";
      }

      if (!business.industry.trim()) {
        errors.industry = "Industry is required.";
      }

      if (!business.businessEmail.trim()) {
        errors.businessEmail = "Business email is required.";
      } else if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(
          business.businessEmail.trim()
        )
      ) {
        errors.businessEmail = "Invalid email format.";
      }

      const bizPhoneClean = business.businessPhone.replace(/\D/g, "");

    if (!bizPhoneClean) {
      errors.businessPhone = "Company phone number is required.";
    } else if (!/^0\d{9}$/.test(bizPhoneClean)) {
      errors.businessPhone =
        "Company phone number must have exactly 10 digits. Example: 0912345678.";
    }
    }

    return errors;
  };

  const applyBusinessVerificationResult = (data) => {
    const resultData = data?.data || data;
    const bp = resultData?.businessProfile;

    if (!bp) return false;

    setIsEdit(true);

    setBusiness((prev) => ({
      ...prev,
      verificationStatus:
        bp.verificationStatus || "",
      verificationNote:
        bp.verificationNote || "",
      verificationSubmissionCount:
        bp.verificationSubmissionCount || 0,
      verificationLockedUntil:
        bp.verificationLockedUntil || null,
    }));

    if (bp.verificationStatus === "VERIFIED") {
      setVerifiedBusiness(bp);
      setGlobalError("");
      setFieldErrors({});

      setLockPopup({
        open: false,
        message: "",
      });

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return true;
    }

    const message =
      bp.verificationNote ||
      "Business verification failed. Please check your tax code.";

    const secondsLeft = getLockSeconds(
      bp.verificationLockedUntil
    );

    const isLocked =
      bp.verificationStatus === "LOCKED" &&
      secondsLeft > 0;

    if (isLocked) {
      setGlobalError(message);
      setFieldErrors({});

      setLockPopup({
        open: true,
        message,
      });
    } else {
      setGlobalError(message);

      setFieldErrors({
        taxCode: message,
      });
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    return true;
  };

  const handleGoToDashboard = async () => {
    try {
      setLoading(true);
      setGlobalError("");

      const meRes = await axiosInstance.get("/auth/me");
      const freshUser = unwrapAuthUser(meRes);

      handleLoginSuccess({
        user: freshUser,
      });

      navigate("/client/dashboard", {
        replace: true,
      });
    } catch (err) {
      const { message } = parseApiError(err);
      setGlobalError(message);
    } finally {
      setLoading(false);
    }
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
      const message =
        business.verificationNote ||
        "Business verification is temporarily locked.";

      setGlobalError(message);

      setLockPopup({
        open: true,
        message,
      });

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

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
        const freshUser = unwrapAuthUser(meRes);

        handleLoginSuccess({
          user: freshUser,
        });

        navigate("/client/dashboard", { replace: true });
        return;
      }

      const payload = {
        phoneNumber: business.phoneNumber.trim(),
        address: business.address.trim(),
        taxCode: business.taxCode.replace(/\D/g, "").slice(0, 10),
        industry: business.industry.trim(),
        businessEmail: business.businessEmail.trim(),
        businessPhone: business.businessPhone.replace(/\D/g, "").slice(0, 10),
      };

      const shouldResubmit = [
        "NEEDS_CORRECTION",
        "REJECTED",
        "FAILED",
        "LOCKED",
      ].includes(business.verificationStatus);

      if (shouldResubmit) {
        res = await axiosInstance.put(
          "/client-profiles/business/resubmit",
          payload
        );
      } else if (!isEdit) {
        res = await axiosInstance.post("/client-profiles/business", payload);
      } else {
        res = await axiosInstance.put("/client-profiles/business/me", payload);
      }

      applyBusinessVerificationResult(res.data);
    } catch (err) {
      const {
        fieldErrors: beErrors,
        message,
        businessProfile,
      } = parseApiError(err);

      if (businessProfile) {
        applyBusinessVerificationResult({ businessProfile });
        return;
      }

      if (clientType === "business") {
        try {
          const profileRes = await axiosInstance.get(
            "/client-profiles/me"
          );

          const profileData = profileRes.data;
          const bp = profileData?.businessProfile || null;

          const secondsLeft = getLockSeconds(
            bp?.verificationLockedUntil
          );

          const isLocked =
            bp?.verificationStatus === "LOCKED" &&
            secondsLeft > 0;

          if (isLocked) {
            const lockMessage =
              bp?.verificationNote ||
              message;

            setBusiness((prev) => ({
              ...prev,
              verificationStatus:
                bp.verificationStatus || "",
              verificationNote:
                bp.verificationNote || "",
              verificationSubmissionCount:
                bp.verificationSubmissionCount || 0,
              verificationLockedUntil:
                bp.verificationLockedUntil || null,
            }));

            setGlobalError(lockMessage);
            setFieldErrors({});

            setLockPopup({
              open: true,
              message: lockMessage,
            });

            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });

            return;
          }
        } catch {
          // Giữ lỗi gốc của request submit.
        }
      }

      setGlobalError(message);

      if (Object.keys(beErrors).length > 0) {
        setFieldErrors(beErrors);
      } else {
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
          setFieldErrors({ taxCode: message });
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
        <span className="material-symbols-outlined animate-spin text-4xl">
          autorenew
        </span>
      </div>
    );
  }

  const form = clientType === "individual" ? individual : business;
  const handleChange =
    clientType === "individual" ? handleIndividualChange : handleBusinessChange;

  return (
    <div className="min-h-screen bg-[#12151B] text-[#e1e2eb]">
      <LockPopup
        open={lockPopup.open}
        message={lockPopup.message}
        secondsLeft={lockSecondsLeft}
        lockedUntil={business.verificationLockedUntil}
        onClose={() =>
          setLockPopup({
            open: false,
            message: "",
          })
        }
      />
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-[#12151B]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-6 md:px-12">
          <Link
            to="/select-role"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:text-white"
          >
            <span className="material-symbols-outlined text-xl">
              arrow_back
            </span>
          </Link>
          <span className="text-2xl font-bold">
            <span className="text-cyan-400">AI</span> Tasker
          </span>
        </div>
      </nav>

      <main
        className="min-h-screen bg-cover bg-center px-4 pb-24 pt-32"
        style={{
          backgroundImage: `linear-gradient(rgba(18,21,27,0.72), rgba(18,21,27,0.72)), url('${BG_IMAGE}')`,
        }}
      >
        <div className="mx-auto max-w-2xl">
          <div className="mb-10 text-center">
            <h1 className="mb-2 text-4xl font-bold">
              {verifiedBusiness
                ? "Business Verified"
                : locked
                  ? "Verification Locked"
                  : isEdit
                    ? "Update Your Profile"
                    : "Complete Your Profile"}
            </h1>
            <p className="text-sm text-gray-300">
              {clientType === "business"
                ? "Tax code will be verified automatically by VietQR"
                : "Help us verify your identity"}
            </p>
          </div>

          {locked && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
              <span className="material-symbols-outlined text-2xl text-red-400">
                block
              </span>
              <div className="flex-1">
                <p className="font-semibold text-red-300">
                  Business verification is locked
                </p>
                <p className="text-sm text-red-200/80">
                  Too many failed verification submissions. Please wait before
                  trying again.
                </p>
              </div>
              <div className="flex min-w-[120px] items-center justify-center rounded-xl border-2 border-red-400 px-3 py-2 text-base font-bold text-red-300">
                {formatRemainingTime(lockSecondsLeft)}
              </div>
            </div>
          )}

          {globalError && !locked && (
            <div className="mb-6 flex gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <span className="material-symbols-outlined text-red-400">
                gpp_bad
              </span>
              <div>
                <p className="font-semibold text-red-400">
                  Verification Failed
                </p>
                <p className="text-sm text-red-300">{globalError}</p>
              </div>
            </div>
          )}

          {clientType === "business" &&
            !verifiedBusiness &&
            !locked &&
            attempts > 0 && (
              <div className="mb-6 rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-yellow-300">
                    <span className="material-symbols-outlined">warning</span>
                    <span className="font-semibold">
                      Failed verification attempts
                    </span>
                  </div>
                  <span className="rounded-full bg-yellow-400/20 px-3 py-1 text-sm font-bold text-yellow-200">
                    {attempts}
                  </span>
                </div>
                <p className="mt-2 text-sm text-yellow-100/80">
                  Unsuccessful submissions recorded by the server.
                </p>
              </div>
            )}

          {verifiedBusiness && (
            <div className="mb-6 flex gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4">
              <span className="material-symbols-outlined text-emerald-300">
                verified
              </span>
              <div>
                <p className="font-semibold text-emerald-300">
                  Business verified successfully
                </p>
                <p className="text-sm text-emerald-100/80">
                  Please review your company information before entering the
                  dashboard.
                </p>
              </div>
            </div>
          )}

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
                  clientType === item.key
                    ? "border-cyan-400 bg-cyan-400/10 text-cyan-400"
                    : "border-white/10 bg-[#1D2026]/70 text-gray-400"
                } ${
                  isEdit || verifiedBusiness
                    ? "cursor-not-allowed opacity-60"
                    : "hover:border-cyan-400"
                }`}
              >
                <span className="material-symbols-outlined text-xl">
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#12151B]/85 p-6 shadow-2xl backdrop-blur-xl md:p-10">
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400">Personal Phone Number</label>
                  <input
                    name="phoneNumber"
                    value={form.phoneNumber}
                    onChange={handleChange}
                    placeholder="0912345678"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    disabled={Boolean(verifiedBusiness) || locked}
                    className={inputClass("phoneNumber")}
                  />
                  <FieldError name="phoneNumber" errors={fieldErrors} />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400">Personal Address</label>
                  <input
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Ha Noi"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    disabled={Boolean(verifiedBusiness) || locked}
                    className={inputClass("address")}
                  />
                  <FieldError name="address" errors={fieldErrors} />
                </div>
              </div>

              {clientType === "business" && (
                <div className="border-t border-white/10 pt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan-400">
                    Business Information
                  </p>
                  <p className="mb-5 text-xs leading-6 text-gray-400">
                    Company name and official company address are checked
                    automatically from the tax code via VietQR lookup.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400">Tax Code</label>
                      <input
                        name="taxCode"
                        value={business.taxCode}
                        onChange={handleBusinessChange}
                        placeholder="0101243150"
                        inputMode="numeric"
                        maxLength={10}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        disabled={locked || Boolean(verifiedBusiness)}
                        className={inputClass("taxCode")}
                      />
                      <FieldError name="taxCode" errors={fieldErrors} />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400">Industry</label>
                      <input
                        name="industry"
                        value={business.industry}
                        onChange={handleBusinessChange}
                        placeholder="Industry"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        disabled={locked || Boolean(verifiedBusiness)}
                        className={inputClass("industry")}
                      />
                      <FieldError name="industry" errors={fieldErrors} />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400">Business Email</label>
                        <input
                          name="businessEmail"
                          type="email"
                          value={business.businessEmail}
                          onChange={handleBusinessChange}
                          placeholder="business@example.com"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck={false}
                          disabled={locked || Boolean(verifiedBusiness)}
                          className={inputClass("businessEmail")}
                        />
                        <FieldError name="businessEmail" errors={fieldErrors} />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400">Company Phone Number</label>
                        <input
                          name="businessPhone"
                          value={business.businessPhone}
                          onChange={handleBusinessChange}
                          placeholder="0912345678"
                          inputMode="numeric"
                          maxLength={10}
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck={false}
                          disabled={locked || Boolean(verifiedBusiness)}
                          className={inputClass("businessPhone")}
                        />
                        <FieldError name="businessPhone" errors={fieldErrors} />
                      </div>
                    </div>

                    {verifiedBusiness && (
                      <div className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4">
                        <div className="mb-4 flex items-center gap-2 text-emerald-300">
                          <span className="material-symbols-outlined">
                            verified
                          </span>
                          <span className="font-semibold">
                            Verified Company Information
                          </span>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400">
                              Company Name
                            </label>
                            <input
                              value={verifiedBusiness.companyName || ""}
                              readOnly
                              className="w-full rounded-lg border border-emerald-400/30 bg-[#1F2937] px-4 py-3 text-sm text-emerald-200 outline-none"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-gray-400">
                              Company Address
                            </label>
                            <textarea
                              value={verifiedBusiness.companyAddress || ""}
                              readOnly
                              rows={3}
                              className="w-full resize-none rounded-lg border border-emerald-400/30 bg-[#1F2937] px-4 py-3 text-sm text-emerald-200 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                {verifiedBusiness ? (
                  <button
                      type="button"
                      onClick={handleGoToDashboard}
                      disabled={loading}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-4 font-bold transition ${
                        loading
                          ? "cursor-not-allowed bg-[#1D2026] text-gray-500"
                          : "bg-emerald-400 text-[#002022] shadow-[0_0_20px_rgba(52,211,153,0.35)] hover:bg-emerald-300"
                      }`}
                    >
                    {loading ? "Loading..." : "Go to Dashboard"}
                    <span className="material-symbols-outlined">
                      arrow_forward
                    </span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading || locked}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-4 font-bold transition ${
                      loading || locked
                        ? "cursor-not-allowed bg-[#1D2026] text-gray-500"
                        : "bg-cyan-400 text-[#002022] shadow-[0_0_20px_rgba(34,211,238,0.35)] hover:bg-cyan-300"
                    }`}
                  >
                    {loading ? (
                      <>
                        <span className="material-symbols-outlined animate-spin">
                          autorenew
                        </span>
                        Verifying...
                      </>
                    ) : locked ? (
                      <>
                        <span className="material-symbols-outlined">lock</span>
                        Locked {formatRemainingTime(lockSecondsLeft)}
                      </>
                    ) : (
                      <>
                        Submit & Verify
                        <span className="material-symbols-outlined">
                          verified
                        </span>
                      </>
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