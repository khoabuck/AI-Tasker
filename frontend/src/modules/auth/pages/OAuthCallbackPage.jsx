import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axiosInstance";
import { useAuth } from "../../../context/AuthContext";
import { clearAuth } from "../../../utils/auth.utils";

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { handleLoginSuccess } = useAuth();

  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const handleOAuthCallback = async () => {
      try {
        // Dọn token legacy. JWT thật nằm trong HttpOnly cookie.
        localStorage.removeItem("accessToken");
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");

        const response = await axiosInstance.get("/auth/me");

        if (cancelled) return;

        const rawUser =
          response?.data?.data?.user ||
          response?.data?.user ||
          response?.data?.data ||
          response?.data;

        const user = normalizeUser(rawUser);

        if (!user?.userId || !user?.status) {
          throw new Error(
            "Google authentication response does not contain user information."
          );
        }

        handleLoginSuccess({
          user,
        });

        navigate(getNextPath(user), { replace: true });
      } catch (err) {
        if (cancelled) return;

        clearAuth();

        const message =
          err?.response?.data?.message ||
          err?.response?.data?.title ||
          err?.message ||
          "Google authentication failed. Please try again.";

        setError(message);
      }
    };

    handleOAuthCallback();

    return () => {
      cancelled = true;
    };
  }, [handleLoginSuccess, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#101319] px-6 text-center text-[#e1e2eb]">
        <span className="material-symbols-outlined mb-4 text-6xl text-red-400">
          error
        </span>

        <h2 className="mb-2 text-2xl font-bold">Authentication Failed</h2>

        <p className="mb-6 max-w-md text-sm text-gray-400">{error}</p>

        <button
          type="button"
          onClick={() => navigate("/login", { replace: true })}
          className="rounded-xl bg-[#00F0FF] px-8 py-3 text-sm font-bold text-[#002022]"
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#101319] text-[#e1e2eb]">
      <span className="material-symbols-outlined mb-4 animate-spin text-6xl text-[#00F0FF]">
        autorenew
      </span>

      <h2 className="mb-2 text-2xl font-bold">Signing you in...</h2>

      <p className="text-sm text-gray-400">
        Please wait while we verify your account.
      </p>
    </div>
  );
}

function normalizeUser(user) {
  if (!user) return null;

  return {
    userId: user?.userId || user?.UserId || user?.id || user?.Id || 0,
    email: user?.email || user?.Email || "",
    fullName: user?.fullName || user?.FullName || "",
    role: user?.role || user?.Role || "",
    status: user?.status || user?.Status || "",
    authProvider:
      user?.authProvider || user?.AuthProvider || user?.provider || "GOOGLE",
    avatarUrl:
      user?.avatarUrl ||
      user?.AvatarUrl ||
      user?.photoUrl ||
      user?.PhotoUrl ||
      null,
  };
}

function getNextPath(user) {
  const role = String(user?.role || "").toUpperCase();
  const status = String(user?.status || "").toUpperCase();

  if (status === "PENDING_EMAIL_VERIFICATION") {
    return "/verify-email-notice";
  }

  if (status === "PENDING_ROLE" || !role) {
    return "/select-role";
  }

  if (status === "PENDING_PROFILE") {
    if (role === "EXPERT") return "/expert/setup-profile";
    if (role === "CLIENT") return "/setup-profile";

    return "/select-role";
  }

  if (status === "ACTIVE") {
    if (role === "EXPERT") return "/expert/dashboard";
    if (role === "CLIENT") return "/client/dashboard";
    if (role === "ADMIN") return "/admin/dashboard";
  }

  return "/login";
}