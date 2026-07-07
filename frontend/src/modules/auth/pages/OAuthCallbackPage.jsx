import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axiosInstance";

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      const response = await axiosInstance.get("/auth/me");
      const user = normalizeUser(response.data?.data || response.data);

      localStorage.setItem("user", JSON.stringify(user));

      navigate(getNextPath(user), { replace: true });
    } catch (err) {
      console.error("OAUTH CALLBACK ERROR:", err?.response?.data || err);

      localStorage.removeItem("user");

      setError("Google authentication failed. Please try again.");
    }
  };

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#101319] px-6 text-center text-[#e1e2eb]">
        <span className="material-symbols-outlined mb-4 text-6xl text-red-400">
          error
        </span>

        <h2 className="mb-2 text-2xl font-bold">Authentication Failed</h2>

        <p className="mb-6 max-w-md text-sm text-gray-400">{error}</p>

        <button
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
  return {
    userId: user?.userId || user?.UserId || 0,
    email: user?.email || user?.Email || "",
    fullName: user?.fullName || user?.FullName || "",
    role: user?.role || user?.Role || "",
    status: user?.status || user?.Status || "",
    authProvider: user?.authProvider || user?.AuthProvider || "",
    avatarUrl: user?.avatarUrl || user?.AvatarUrl || null,
  };
}

function getNextPath(user) {
  const role = String(user?.role || "").toUpperCase();
  const status = String(user?.status || "").toUpperCase();

  if (status === "PENDING_ROLE") {
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