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
        setError("");

        /*
         * Dọn các token cũ trong localStorage.
         * JWT hiện tại được backend lưu trong HttpOnly cookie.
         */
        localStorage.removeItem("accessToken");
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");

        /*
         * Xác minh phiên đăng nhập Google thông qua HttpOnly cookie
         * và lấy thông tin user mới nhất từ backend.
         */
        const response = await axiosInstance.get("/auth/me");

        if (cancelled) return;

        const rawUser =
          response?.data?.data?.user ||
          response?.data?.data?.User ||
          response?.data?.user ||
          response?.data?.User ||
          response?.data?.data ||
          response?.data;

        const user = normalizeUser(rawUser);

        if (!isValidUser(user)) {
          throw new Error(
            "Google authentication response does not contain valid user information."
          );
        }

        /*
         * Cập nhật AuthContext và lưu user cache theo auth flow hiện tại.
         * Không tự ghi localStorage ở page này.
         */
        handleLoginSuccess({
          user,
        });

        navigate(getNextPath(user), {
          replace: true,
        });
      } catch (err) {
        if (cancelled) return;

        clearAuth();

        const message =
          getErrorMessage(err) ||
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
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-400/30 bg-red-400/10 text-red-300">
          <span className="material-symbols-outlined text-4xl">
            error
          </span>
        </div>

        <h2 className="mt-5 text-2xl font-black text-white">
          Authentication Failed
        </h2>

        <p className="mt-2 max-w-md text-sm leading-6 text-gray-400">
          {error}
        </p>

        <button
          type="button"
          onClick={() =>
            navigate("/login", {
              replace: true,
            })
          }
          className="mt-6 rounded-xl bg-cyan-400 px-6 py-3 text-sm font-black text-black transition hover:bg-cyan-300"
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#101319] px-6 text-center text-[#e1e2eb]">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
        <span className="material-symbols-outlined animate-spin text-4xl">
          progress_activity
        </span>
      </div>

      <h2 className="mt-5 text-2xl font-black text-white">
        Signing you in...
      </h2>

      <p className="mt-2 text-sm text-gray-400">
        Please wait while we verify your Google account.
      </p>
    </div>
  );
}

function normalizeUser(user) {
  if (!user) return null;

  return {
    userId:
      user?.userId ||
      user?.UserId ||
      user?.id ||
      user?.Id ||
      0,

    email:
      user?.email ||
      user?.Email ||
      "",

    fullName:
      user?.fullName ||
      user?.FullName ||
      user?.name ||
      user?.Name ||
      "",

    role:
      user?.role ||
      user?.Role ||
      "",

    status:
      user?.status ||
      user?.Status ||
      user?.userStatus ||
      user?.UserStatus ||
      "",

    authProvider:
      user?.authProvider ||
      user?.AuthProvider ||
      user?.provider ||
      user?.Provider ||
      "GOOGLE",

    avatarUrl:
      user?.avatarUrl ||
      user?.AvatarUrl ||
      user?.photoUrl ||
      user?.PhotoUrl ||
      null,
  };
}

function isValidUser(user) {
  const userId = Number(user?.userId || 0);
  const email = String(user?.email || "").trim();

  return userId > 0 && Boolean(email);
}

function getNextPath(user) {
  const role = String(user?.role || "")
    .trim()
    .toUpperCase();

  const status = String(user?.status || "")
    .trim()
    .toUpperCase();

  if (status === "PENDING_EMAIL_VERIFICATION") {
    return "/verify-email-notice";
  }

  if (status === "PENDING_ROLE" || !role) {
    return "/select-role";
  }

  if (status === "PENDING_PROFILE") {
    if (role === "EXPERT") {
      return "/expert/setup-profile";
    }

    if (role === "CLIENT") {
      return "/setup-profile";
    }

    return "/select-role";
  }

  if (status === "ACTIVE") {
    if (role === "EXPERT") {
      return "/expert/dashboard";
    }

    if (role === "CLIENT") {
      return "/client/dashboard";
    }

    if (role === "ADMIN") {
      return "/admin/dashboard";
    }
  }

  return "/login";
}

function getErrorMessage(err) {
  const data = err?.response?.data;

  if (typeof data === "string") {
    return data;
  }

  if (data?.message) {
    return data.message;
  }

  if (data?.title) {
    return data.title;
  }

  if (data?.detail) {
    return data.detail;
  }

  if (err?.message) {
    return err.message;
  }

  return "";
}