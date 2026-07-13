// src/modules/client/pages/ClientProfilePage.jsx
// GET /api/client-profiles/me — lấy thông tin profile client

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";
import authService from "../../../services/auth.service";

export default function ClientProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authService.getCurrentUser();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const [passwordFieldErrors, setPasswordFieldErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [focusedPasswordField, setFocusedPasswordField] = useState("");

  // ── TODO (BE): Khi BE thêm endpoint GET /api/client-profiles/me thì không cần sửa gì ──
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get("/client-profiles/me");
        setProfile(res.data);
      } catch (err) {
        setError(err?.response?.data?.message || "Unable to load profile information.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [location.state?.refresh]);

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

    const handlePasswordInputChange = (e) => {
      const { name, value } = e.target;

      setPasswordForm((prev) => ({
        ...prev,
        [name]: value,
      }));

      setPasswordError("");
      setPasswordSuccess("");

      setPasswordFieldErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    };

  const closeChangePasswordModal = () => {
    setShowChangePassword(false);
    setPasswordError("");
    setPasswordSuccess("");
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
    setPasswordFieldErrors({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
    setFocusedPasswordField("");
  };

  const getPasswordErrorFieldFromMessage = (message = "") => {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("current password")) {
      return "currentPassword";
    }

    if (lowerMessage.includes("confirm new password")) {
      return "confirmNewPassword";
    }

    if (lowerMessage.includes("new password")) {
      return "newPassword";
    }

    return "";
  };

  const handleSubmitChangePassword = async (e) => {
    e.preventDefault();

    setPasswordError("");
    setPasswordSuccess("");
    setPasswordFieldErrors({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });

    try {
      setPasswordLoading(true);

      const res = await axiosInstance.post("/auth/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmNewPassword: passwordForm.confirmNewPassword,
      });

      const successMessage = res?.data?.message || "Password changed successfully.";

      setPasswordSuccess(successMessage);

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });

      setPasswordFieldErrors({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });

      setFocusedPasswordField("");

      setTimeout(() => {
        closeChangePasswordModal();
      }, 1800);
    } catch (err) {
      const message = err?.response?.data?.message || "";

      setPasswordError(message);

      const errorField = getPasswordErrorFieldFromMessage(message);

      if (errorField) {
        setPasswordFieldErrors((prev) => ({
          ...prev,
          [errorField]: message,
        }));
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const getPasswordInputStyle = (fieldName) => {
    const hasError = Boolean(passwordFieldErrors[fieldName]);
    const isFocused = focusedPasswordField === fieldName;

    return {
      width: "100%",
      padding: "12px 52px 12px 14px",
      borderRadius: 10,
      border: hasError
        ? "1px solid rgba(239,68,68,0.85)"
        : isFocused
          ? "1px solid rgba(0,240,255,0.8)"
          : "1px solid rgba(255,255,255,0.12)",
      background: "#1d2026",
      color: "#e1e2eb",
      outline: "none",
      boxSizing: "border-box",
      boxShadow: hasError
        ? "0 0 0 3px rgba(239,68,68,0.12), 0 0 18px rgba(239,68,68,0.18)"
        : isFocused
          ? "0 0 0 3px rgba(0,240,255,0.12), 0 0 18px rgba(0,240,255,0.18)"
          : "none",
      transition: "all 0.2s ease",
    };
  };

  const getPasswordIconStyle = (fieldName) => {
    const hasError = Boolean(passwordFieldErrors[fieldName]);
    const isFocused = focusedPasswordField === fieldName;

    return {
      position: "absolute",
      top: "50%",
      right: 14,
      transform: "translateY(-50%)",
      background: "transparent",
      border: "none",
      padding: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: hasError ? "#f87171" : isFocused ? "#00F0FF" : "#8c90a0",
      cursor: passwordLoading ? "not-allowed" : "pointer",
      transition: "all 0.2s ease",
      filter: hasError
        ? "drop-shadow(0 0 8px rgba(239,68,68,0.8))"
        : isFocused
          ? "drop-shadow(0 0 8px rgba(0,240,255,0.8))"
          : "none",
    };
  };

  const fieldErrorText = (fieldName) =>
    passwordFieldErrors[fieldName] ? (
      <p style={{ color: "#f87171", fontSize: 12, marginTop: 8 }}>
        {passwordFieldErrors[fieldName]}
      </p>
    ) : null;

  return (
    <ClientLayout>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px" }}>

        
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 40,
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/client/dashboard")}
            className="mb-5 flex w-fit items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-cyan-400/50 hover:text-cyan-400"
          >
            <span className="material-symbols-outlined text-[18px]">
              arrow_back
            </span>
            Back
          </button>

          <div>
            <h1
              style={{
                fontFamily: "Hanken Grotesk, sans-serif",
                fontSize: 32,
                fontWeight: 700,
                color: "#e1e2eb",
                marginBottom: 8,
              }}
            >
              My Profile
            </h1>

            <p style={{ color: "#c2c6d6" }}>
              Your account and profile information
            </p>
          </div>
        </div>

        {/* User card */}
        <div style={{ background: "rgba(16,19,25,0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 32, marginBottom: 24, display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "#1772eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
              color: "#fff",
              fontFamily: "Hanken Grotesk, sans-serif",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            {profile?.avatarUrl || user?.avatarUrl ? (
              <img
                src={profile?.avatarUrl || user?.avatarUrl}
                alt="Avatar"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              (profile?.fullName || user?.fullName)
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "CL"
            )}
          </div>
          <div>
            <h2 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 22, fontWeight: 700, color: "#e1e2eb", marginBottom: 4 }}>
              {profile?.fullName || user?.fullName}
            </h2>
            <p style={{ color: "#8c90a0", fontSize: 14 }}>
              {profile?.email ?? user?.email ?? "—"}
            </p>
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", background: "rgba(0,240,255,0.1)", border: "1px solid rgba(0,240,255,0.3)", color: "#00F0FF" }}>
                {user?.role ?? "—"}
              </span>
              <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80" }}>
                {profile?.userStatus ?? user?.status ?? "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Profile info */}
        {loading && (
          <div style={{ textAlign: "center", padding: 48, color: "#8c90a0" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, display: "block", marginBottom: 12 }}>hourglass_empty</span>
            Loading information...
          </div>
        )}

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: 24, color: "#f87171", textAlign: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, display: "block", marginBottom: 8 }}>error</span>
            {error}
          </div>
        )}

                {profile && !loading && (
          <>
            <div style={{ background: "rgba(16,19,25,0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 32 }}>

              {/* Section: Thông tin cơ bản */}
              <h3 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em", color: "#00F0FF", marginBottom: 8 }}>
                Basic information
              </h3>

              {infoItem("person", "Full Name", profile?.fullName ?? user?.fullName ?? "—")}
              {infoItem("phone", "Personal Phone Number", profile.phoneNumber)}
              {infoItem("location_on", "Address", profile.address)}

              {/* Section: Doanh nghiệp (nếu có) */}
              {profile.businessProfile && (
                <>
                  <h3 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em", color: "#00F0FF", marginTop: 32, marginBottom: 8 }}>
                    Business information
                  </h3>
                  {infoItem("tag", "Tax Code", profile.businessProfile.taxCode)}
                  {infoItem("corporate_fare", "Company Name", profile.businessProfile.companyName)}
                  {infoItem("category", "Industry", profile.businessProfile.industry)}
                  {infoItem("mail", "Business Email", profile.businessProfile.businessEmail)}
                  {infoItem("call", "Company Phone Number", profile.businessProfile.businessPhone)}
                  {infoItem("location_city", "Company Address", profile.businessProfile.companyAddress || profile.address)}
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
                  Edit profile
                </button>
              </div>
            </div>

            {/* Account Security */}
            <div
              style={{
                background: "rgba(16,19,25,0.8)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 16,
                padding: 32,
                marginTop: 24,
              }}
            >
              <h3
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  color: "#00F0FF",
                  marginBottom: 8,
                }}
              >
                Account Security
              </h3>

              <p style={{ color: "#8c90a0", fontSize: 14, marginBottom: 20 }}>
                Manage your password and account security.
              </p>

              {user?.authProvider === "GOOGLE" ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: 14,
                    borderRadius: 10,
                    background: "rgba(250,204,21,0.08)",
                    border: "1px solid rgba(250,204,21,0.25)",
                    color: "#facc15",
                    fontSize: 14,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    info
                  </span>
                  This account uses Google login. Password is managed by Google.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowChangePassword(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 24px",
                    background: "rgba(0,240,255,0.05)",
                    border: "1px solid rgba(0,240,255,0.3)",
                    borderRadius: 8,
                    color: "#00F0FF",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    fontFamily: "Inter, sans-serif",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,240,255,0.1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,240,255,0.05)")}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    lock_reset
                  </span>
                  Change password
                </button>
              )}
            </div>
          </>
        )}

              {showChangePassword && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 999,
              background: "rgba(0,0,0,0.65)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 460,
                background: "#101319",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 16,
                padding: 28,
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 16,
                  marginBottom: 20,
                }}
              >
                <div>
                  <h2
                    style={{
                      fontFamily: "Hanken Grotesk, sans-serif",
                      fontSize: 22,
                      fontWeight: 700,
                      color: "#e1e2eb",
                      marginBottom: 4,
                    }}
                  >
                    Change Password
                  </h2>

                  <p style={{ color: "#8c90a0", fontSize: 14 }}>
                    Enter your current password and choose a new password.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeChangePasswordModal}
                  disabled={passwordLoading}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "transparent",
                    color: "#c2c6d6",
                    cursor: passwordLoading ? "not-allowed" : "pointer",
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              </div>

              {passwordError && !Object.values(passwordFieldErrors).some(Boolean) && (
                <div
                  style={{
                    marginBottom: 16,
                    padding: 12,
                    borderRadius: 10,
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "#f87171",
                    fontSize: 14,
                  }}
                >
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div
                  style={{
                    marginBottom: 16,
                    padding: 18,
                    borderRadius: 14,
                    background: "rgba(74,222,128,0.1)",
                    border: "1px solid rgba(74,222,128,0.35)",
                    color: "#4ade80",
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    boxShadow: "0 0 24px rgba(74,222,128,0.12)",
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: 28,
                      color: "#4ade80",
                      filter: "drop-shadow(0 0 8px rgba(74,222,128,0.7))",
                    }}
                  >
                    check_circle
                  </span>

                  <div>
                    <p style={{ fontWeight: 700, marginBottom: 2 }}>
                      Password updated
                    </p>
                    <p style={{ margin: 0, color: "#bbf7d0" }}>
                      {passwordSuccess}
                    </p>
                  </div>
                </div>
              )}

              {!passwordSuccess && (
              <form onSubmit={handleSubmitChangePassword}>
                {/* Current Password */}
                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#8c90a0",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Current Password
                  </label>

                  <div style={{ position: "relative" }}>
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      name="currentPassword"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordInputChange}
                      onFocus={() => setFocusedPasswordField("currentPassword")}
                      onBlur={() => setFocusedPasswordField("")}
                      autoComplete="current-password"
                      disabled={passwordLoading}
                      style={getPasswordInputStyle("currentPassword")}
                    />

                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      disabled={passwordLoading}
                      style={getPasswordIconStyle("currentPassword")}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 22 }}
                      >
                        {showCurrentPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>

                  {fieldErrorText("currentPassword")}
                </div>

                {/* New Password */}
                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#8c90a0",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    New Password
                  </label>

                  <div style={{ position: "relative" }}>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordInputChange}
                      onFocus={() => setFocusedPasswordField("newPassword")}
                      onBlur={() => setFocusedPasswordField("")}
                      autoComplete="new-password"
                      disabled={passwordLoading}
                      style={getPasswordInputStyle("newPassword")}
                    />

                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      disabled={passwordLoading}
                      style={getPasswordIconStyle("newPassword")}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 22 }}
                      >
                        {showNewPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>

                  {fieldErrorText("newPassword")}
                </div>

                {/* Confirm New Password */}
                <div style={{ marginBottom: 24 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#8c90a0",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Confirm New Password
                  </label>

                  <div style={{ position: "relative" }}>
                    <input
                      type={showConfirmNewPassword ? "text" : "password"}
                      name="confirmNewPassword"
                      value={passwordForm.confirmNewPassword}
                      onChange={handlePasswordInputChange}
                      onFocus={() => setFocusedPasswordField("confirmNewPassword")}
                      onBlur={() => setFocusedPasswordField("")}
                      autoComplete="new-password"
                      disabled={passwordLoading}
                      style={getPasswordInputStyle("confirmNewPassword")}
                    />

                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                      disabled={passwordLoading}
                      style={getPasswordIconStyle("confirmNewPassword")}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 22 }}
                      >
                        {showConfirmNewPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>

                  {fieldErrorText("confirmNewPassword")}
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    type="button"
                    onClick={closeChangePasswordModal}
                    disabled={passwordLoading}
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "transparent",
                      color: "#c2c6d6",
                      fontWeight: 600,
                      cursor: passwordLoading ? "not-allowed" : "pointer",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={passwordLoading}
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      borderRadius: 10,
                      border: "1px solid rgba(0,240,255,0.3)",
                      background: passwordLoading
                        ? "rgba(0,240,255,0.08)"
                        : "rgba(0,240,255,0.18)",
                      color: "#00F0FF",
                      fontWeight: 700,
                      cursor: passwordLoading ? "not-allowed" : "pointer",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    {passwordLoading ? "Changing..." : "Save"}
                  </button>
                </div>
              </form>
              )}
            </div>
          </div>
        )}

      </div>
    </ClientLayout>
  );
}