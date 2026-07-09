// src/modules/auth/pages/SelectRolePage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import axiosInstance from "../../../api/axiosInstance";
import authService from "../../../services/auth.service";

const BG_IMAGE =
  "https://lh3.googleusercontent.com/aida/ADBb0uiAogMCN4ONd1eV0ckwyeNv8QfTOCxlvbOfag-KSL1Cdba-otv2YjPez9ovCM3FL-qyGKTDeVirDziA80hhQSTs6XXast-3vn_rIy5jZgYjYUXxWbn7589Hj6JdyzhvkZYNXQ9pQUbNptjiPkROg5Kp1z8ZHsKZL28Xmx-Rtm9fYag14W6IkJdjjWBtwCUOnpOhakWfAR9l6aohBmWnTPgav2fsqTD4ZFoyetZhmIs7tPIQxkGVlrRy0gVd";

const ROLES = [
  {
    key: "CLIENT",
    icon: "corporate_fare",
    title: "Client",
    desc: "I want to hire an AI Expert to handle the project.",
    features: [
      "Post a job opening.",
      "AI Matching Experts",
      "Project Management & Payments",
    ],
    color: "#00F0FF",
  },
  {
    key: "EXPERT",
    icon: "psychology",
    title: "AI Expert",
    desc: "I am an AI expert looking to take on projects.",
    features: [
      "Receive suitable job offers",
      "AI-powered job recommendations",
      "Build a professional portfolio",
    ],
    color: "#adc6ff",
  },
];

export default function SelectRolePage() {
  const navigate = useNavigate();
  const { handleLoginSuccess } = useAuth();

  const [selected, setSelected] = useState(null);
  const [lockedRole, setLockedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return;

    const user = JSON.parse(storedUser);
    const role = String(user?.role || "").toUpperCase();
    const status = String(user?.status || "").toUpperCase();

    if (status === "PENDING_ROLE" || !role) {
      setLockedRole(null);
      return;
    }

    if (status === "PENDING_PROFILE") {
      // User đã chọn role rồi, cho hiện lại trang chọn role
      // nhưng khóa role hiện tại, không tự đá về setup nữa.
      setSelected(role);
      setLockedRole(role);
      return;
    }

    if (status === "ACTIVE") {
      if (role === "CLIENT") navigate("/client/dashboard", { replace: true });
      else if (role === "EXPERT") navigate("/expert/dashboard", { replace: true });
      else if (role === "ADMIN") navigate("/admin/dashboard", { replace: true });
      else navigate("/", { replace: true });
    }
  }, [navigate]);

  const redirectAfterRoleSelected = (role) => {
    const normalizedRole = String(role || "").toUpperCase();

    if (normalizedRole === "EXPERT") {
      navigate("/expert/setup-profile", { replace: true });
      return;
    }

    if (normalizedRole === "CLIENT") {
      navigate("/setup-profile", { replace: true });
      return;
    }

    navigate("/setup-profile", { replace: true });
  };

  const redirectExistingUser = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const role = String(user?.role || "").toUpperCase();
    const status = String(user?.status || "").toUpperCase();

    if (status === "ACTIVE") {
      if (role === "CLIENT") {
        navigate("/client/dashboard", { replace: true });
        return;
      }

      if (role === "EXPERT") {
        navigate("/expert/dashboard", { replace: true });
        return;
      }

      if (role === "ADMIN") {
        navigate("/admin/dashboard", { replace: true });
        return;
      }

      navigate("/", { replace: true });
      return;
    }

    if (status === "PENDING_PROFILE") {
      if (role === "EXPERT") {
        navigate("/expert/setup-profile", { replace: true });
        return;
      }

      navigate("/setup-profile", { replace: true });
      return;
    }

    navigate("/setup-profile", { replace: true });
  };

  const handleConfirm = async () => {
    if (!selected) return;

    // Nếu role đã được chọn trước đó rồi thì không gọi API select-role nữa.
    // Chỉ cho user tiếp tục về đúng trang setup profile.
    if (lockedRole) {
      redirectAfterRoleSelected(lockedRole);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const selectResponse = await axiosInstance.post("/auth/select-role", {
        role: selected,
      });

      const responseData = selectResponse?.data || {};
      const oldUser = JSON.parse(localStorage.getItem("user") || "{}");

      const userFromResponse =
        responseData.user ||
        responseData.User ||
        responseData.data?.user ||
        responseData.data?.User ||
        responseData.data ||
        responseData;

      const selectedUser = authService.normalizeUser({
        ...oldUser,
        ...userFromResponse,
        role: selected,
        status: userFromResponse?.status || userFromResponse?.Status || "PENDING_PROFILE",
      });

      localStorage.setItem("user", JSON.stringify(selectedUser));

      if (handleLoginSuccess) {
        handleLoginSuccess({
          user: selectedUser,
        });
      }

      redirectAfterRoleSelected(selected);
    } catch (err) {
      console.error("SELECT ROLE ERROR:", err?.response?.data || err);

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        "An error occurred during role selection.";

      if (message === "User is not in pending role status.") {
        redirectExistingUser();
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: "#12151B",
        color: "#e1e2eb",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <nav
        style={{
          position: "fixed",
          top: 0,
          width: "100%",
          zIndex: 50,
          background: "rgba(18,21,27,0.8)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "0 48px",
            height: 80,
            display: "flex",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: "Hanken Grotesk, sans-serif",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            <span style={{ color: "#00F0FF" }}>AI</span>{" "}
            <span style={{ color: "#e1e2eb" }}>Tasker</span>
          </span>
        </div>
      </nav>

      <main
        style={{
          flex: 1,
          paddingTop: 128,
          paddingBottom: 96,
          backgroundImage: `linear-gradient(rgba(18,21,27,0.7), rgba(18,21,27,0.7)), url('${BG_IMAGE}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 16px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h1
              style={{
                fontFamily: "Hanken Grotesk, sans-serif",
                fontSize: 40,
                fontWeight: 700,
                color: "#e1e2eb",
                marginBottom: 12,
              }}
            >
              What is your role?
            </h1>

            <p style={{ color: "#c2c6d6", fontSize: 16 }}>
              Select your role to personalize your experience
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
              marginBottom: 32,
            }}
          >
            {ROLES.map((role) => {
              const isSelected = selected === role.key;
              const isLockedOtherRole = lockedRole && role.key !== lockedRole;

              return (
                <div
                  key={role.key}
                  onClick={() => {
                    if (loading) return;

                    if (isLockedOtherRole) {
                      setError("You already selected a role. Please continue with your current role.");
                      return;
                    }

                    setSelected(role.key);
                    setError("");
                  }}
                  style={{
                    background: isSelected
                      ? `rgba(${
                          role.key === "CLIENT" ? "0,240,255" : "173,198,255"
                        },0.05)`
                      : "rgba(18,21,27,0.8)",
                    backdropFilter: "blur(24px)",
                    border: `2px solid ${
                      isSelected ? role.color : "rgba(255,255,255,0.1)"
                    }`,
                    borderRadius: 16,
                    padding: 32,
                    cursor: loading || isLockedOtherRole ? "not-allowed" : "pointer",
                    opacity: isLockedOtherRole ? 0.45 : 1,
                    transition: "all 0.2s",
                    boxShadow: isSelected
                      ? `0 0 20px ${role.color}22`
                      : "none",
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 14,
                      background: isSelected
                        ? `${role.color}15`
                        : "rgba(255,255,255,0.05)",
                      border: `1px solid ${
                        isSelected ? role.color : "rgba(255,255,255,0.1)"
                      }`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 20,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: 28,
                        color: isSelected ? role.color : "#8c90a0",
                      }}
                    >
                      {role.icon}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontFamily: "Hanken Grotesk, sans-serif",
                      fontSize: 22,
                      fontWeight: 700,
                      color: isSelected ? role.color : "#e1e2eb",
                      marginBottom: 8,
                    }}
                  >
                    {role.title}
                  </h3>

                  <p
                    style={{
                      fontSize: 14,
                      color: "#8c90a0",
                      marginBottom: 20,
                      lineHeight: 1.6,
                    }}
                  >
                    {role.desc}
                  </p>

                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    {role.features.map((feature) => (
                      <li
                        key={feature}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 13,
                          color: "#c2c6d6",
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{
                            fontSize: 16,
                            color: isSelected ? role.color : "#414754",
                          }}
                        >
                          check_circle
                        </span>

                        {feature}
                      </li>
                    ))}
                  </ul>

                  {isSelected && (
                    <div
                      style={{
                        marginTop: 20,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        color: role.color,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 16 }}
                      >
                        check_circle
                      </span>
                      Selected
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 8,
                padding: "12px 16px",
                color: "#f87171",
                fontSize: 14,
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={!selected || loading}
            style={{
              width: "100%",
              background: selected ? "#00F0FF" : "rgba(255,255,255,0.05)",
              color: selected ? "#002022" : "#414754",
              fontFamily: "Hanken Grotesk, sans-serif",
              fontWeight: 700,
              fontSize: 16,
              padding: "18px",
              borderRadius: 12,
              border: "none",
              cursor: selected && !loading ? "pointer" : "not-allowed",
              transition: "all 0.2s",
              boxShadow: selected ? "0 0 20px rgba(0,240,255,0.3)" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined">
                  progress_activity
                </span>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Confirm & Continue</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}

function normalizeUser(user, selectedRole) {
  return {
    userId: user?.userId || user?.UserId || 0,
    email: user?.email || user?.Email || "",
    fullName: user?.fullName || user?.FullName || "",
    role: user?.role || user?.Role || selectedRole,
    status: user?.status || user?.Status || "PENDING_PROFILE",
    authProvider: user?.authProvider || user?.AuthProvider || "LOCAL",
    avatarUrl: user?.avatarUrl || user?.AvatarUrl || null,
  };
}