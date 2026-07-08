import { createContext, useContext, useEffect, useRef, useState } from "react";
import { getMeApi, logoutApi } from "../api/auth.api";
import {
  getAccessToken,
  saveAuth,
  clearAuth,
  getUserFromStorage,
} from "../utils/auth.utils";
import {
  ACCOUNT_BLOCKED_EVENT,
  AUTH_ERROR_EVENT,
} from "../api/axiosInstance";

const AuthContext = createContext(null);

const ACCOUNT_STATUS_CHECK_INTERVAL_MS = 15000;

const BLOCKED_STATUSES = [
  "LOCKED",
  "BANNED",
  "BAN",
  "SUSPENDED",
  "DISABLED",
  "INACTIVE",
  "BLOCKED",
];

function getUserStatus(user) {
  return String(
    user?.status ||
      user?.userStatus ||
      user?.accountStatus ||
      user?.Status ||
      user?.UserStatus ||
      user?.AccountStatus ||
      ""
  )
    .trim()
    .toUpperCase();
}

function isBlockedUserStatus(user) {
  return BLOCKED_STATUSES.includes(getUserStatus(user));
}

function getBlockedReason(user) {
  return (
    user?.lockReason ||
    user?.LockReason ||
    user?.banReason ||
    user?.BanReason ||
    user?.reason ||
    user?.Reason ||
    ""
  );
}

function getBlockedUntil(user) {
  return (
    user?.lockoutEnd ||
    user?.LockoutEnd ||
    user?.lockedUntil ||
    user?.LockedUntil ||
    user?.lockUntil ||
    user?.LockUntil ||
    ""
  );
}

function getBlockedStatusPayload(user) {
  const status = getUserStatus(user);
  const reason = getBlockedReason(user);
  const until = getBlockedUntil(user);

  if (status === "LOCKED" || status === "SUSPENDED") {
    return {
      title: "Your account is temporarily locked",
      description:
        "Your account has been temporarily restricted by the administrator.",
      reason,
      until,
    };
  }

  if (status === "BANNED" || status === "BAN") {
    return {
      title: "Your account has been banned",
      description:
        "Your account can no longer access the system because it was banned by the administrator.",
      reason,
      until: "",
    };
  }

  return {
    title: "Your account is restricted",
    description:
      "Your account is currently restricted. Please contact support if you believe this is a mistake.",
    reason,
    until,
  };
}

function getSessionExpiredPayload() {
  return {
    title: "Session expired",
    description: "Your session is no longer valid. Please login again.",
    reason: "",
    until: "",
  };
}

function getErrorData(err) {
  return err?.response?.data || {};
}

function getErrorText(err) {
  const data = getErrorData(err);

  return String(
    data?.message ||
      data?.title ||
      data?.detail ||
      data?.error ||
      data ||
      err?.message ||
      ""
  );
}

function getErrorStatusText(err) {
  const data = getErrorData(err);

  return String(
    data?.status ||
      data?.userStatus ||
      data?.accountStatus ||
      data?.Status ||
      data?.UserStatus ||
      data?.AccountStatus ||
      ""
  )
    .trim()
    .toUpperCase();
}

function getErrorReason(err) {
  const data = getErrorData(err);

  return (
    data?.reason ||
    data?.Reason ||
    data?.lockReason ||
    data?.LockReason ||
    data?.banReason ||
    data?.BanReason ||
    data?.message ||
    data?.detail ||
    ""
  );
}

function getErrorUntil(err) {
  const data = getErrorData(err);

  return (
    data?.lockoutEnd ||
    data?.LockoutEnd ||
    data?.lockedUntil ||
    data?.LockedUntil ||
    data?.lockUntil ||
    data?.LockUntil ||
    ""
  );
}

function getBlockedPayloadFromError(err) {
  const statusText = getErrorStatusText(err);
  const text = getErrorText(err).toLowerCase();
  const reason = getErrorReason(err);
  const until = getErrorUntil(err);

  const isLocked =
    statusText === "LOCKED" ||
    statusText === "SUSPENDED" ||
    text.includes("locked") ||
    text.includes("lock") ||
    text.includes("suspended") ||
    text.includes("tạm khóa") ||
    text.includes("khoá") ||
    text.includes("khóa");

  const isBanned =
    statusText === "BANNED" ||
    statusText === "BAN" ||
    text.includes("banned") ||
    text.includes("ban") ||
    text.includes("cấm");

  if (isLocked) {
    return {
      title: "Your account is temporarily locked",
      description:
        "Your account has been temporarily restricted by the administrator.",
      reason,
      until,
    };
  }

  if (isBanned) {
    return {
      title: "Your account has been banned",
      description:
        "Your account can no longer access the system because it was banned by the administrator.",
      reason,
      until: "",
    };
  }

  return getSessionExpiredPayload();
}

function dispatchBlockedEvent(user) {
  window.dispatchEvent(
    new CustomEvent(ACCOUNT_BLOCKED_EVENT, {
      detail: getBlockedStatusPayload(user),
    })
  );
}

function dispatchBlockedErrorEvent(err) {
  window.dispatchEvent(
    new CustomEvent(ACCOUNT_BLOCKED_EVENT, {
      detail: getBlockedPayloadFromError(err),
    })
  );
}

function dispatchSessionExpiredEvent() {
  window.dispatchEvent(
    new CustomEvent(ACCOUNT_BLOCKED_EVENT, {
      detail: getSessionExpiredPayload(),
    })
  );
}

function unwrapMeResponse(res) {
  return res?.data?.data || res?.data || res;
}

function clearLocalDrafts() {
  localStorage.removeItem("aitasker_expert_profile_setup_draft");
  localStorage.removeItem("aitasker_expert_profile_edit_draft");
  localStorage.removeItem("aitasker_expert_profile_correction_draft");
}

function shouldTreatAsBlockedError(err) {
  const statusText = getErrorStatusText(err);
  const text = getErrorText(err).toLowerCase();

  return (
    BLOCKED_STATUSES.includes(statusText) ||
    text.includes("locked") ||
    text.includes("lockout") ||
    text.includes("banned") ||
    text.includes("ban") ||
    text.includes("suspended") ||
    text.includes("disabled") ||
    text.includes("blocked") ||
    text.includes("inactive") ||
    text.includes("tạm khóa") ||
    text.includes("khóa") ||
    text.includes("khoá") ||
    text.includes("cấm")
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkingAuthErrorRef = useRef(false);

  const [blockedModal, setBlockedModal] = useState({
    open: false,
    title: "",
    message: "",
    reason: "",
    until: "",
  });

  const verifyAuthErrorWithMe = async () => {
    if (checkingAuthErrorRef.current) return;

    checkingAuthErrorRef.current = true;

    try {
      const res = await getMeApi();
      const freshUser = unwrapMeResponse(res);

      if (isBlockedUserStatus(freshUser)) {
        dispatchBlockedEvent(freshUser);
        clearAuth();
        setUser(null);
        return;
      }

      setUser(freshUser);
      saveAuth({ user: freshUser });
    } catch (err) {
      const status = err?.response?.status;

      if (status === 401 || status === 403) {
        if (shouldTreatAsBlockedError(err)) {
          dispatchBlockedErrorEvent(err);
        } else if (getAccessToken()) {
          dispatchSessionExpiredEvent();
        }

        clearAuth();
        setUser(null);
      }
    } finally {
      checkingAuthErrorRef.current = false;
    }
  };

  useEffect(() => {
    const restore = async () => {
      const storedUser = getUserFromStorage();

      const storedStatus = String(storedUser?.status || "").toUpperCase();
      const isIncompleteOnboarding = [
        "PENDING_ROLE",
        "PENDING_EMAIL_VERIFICATION",
      ].includes(storedStatus);

      if (isIncompleteOnboarding && storedUser) {
        setUser(storedUser);
        setLoading(false);
        return;
      }

      try {
        const res = await getMeApi();
        const freshUser = unwrapMeResponse(res);

        if (isBlockedUserStatus(freshUser)) {
          dispatchBlockedEvent(freshUser);
          return;
        }

        setUser(freshUser);
        saveAuth({ user: freshUser });
      } catch (err) {
        const status = err?.response?.status;

        if (status === 401 || status === 403) {
          if (getAccessToken()) {
            if (shouldTreatAsBlockedError(err)) {
              dispatchBlockedErrorEvent(err);
            } else {
              dispatchSessionExpiredEvent();
            }
          }

          clearAuth();
          setUser(null);
        } else if (storedUser) {
          setUser(storedUser);
        }
      } finally {
        setLoading(false);
      }
    };

    restore();
  }, []);

  useEffect(() => {
    const handleAccountBlocked = (event) => {
      setBlockedModal({
        open: true,
        title: event?.detail?.title || "Account Restricted",
        message:
          event?.detail?.description ||
          event?.detail?.message ||
          "Your account is currently restricted. Please login again.",
        reason: event?.detail?.reason || "",
        until: event?.detail?.until || "",
      });
    };

    const handleAuthError = () => {
      verifyAuthErrorWithMe();
    };

    window.addEventListener(ACCOUNT_BLOCKED_EVENT, handleAccountBlocked);
    window.addEventListener(AUTH_ERROR_EVENT, handleAuthError);

    return () => {
      window.removeEventListener(ACCOUNT_BLOCKED_EVENT, handleAccountBlocked);
      window.removeEventListener(AUTH_ERROR_EVENT, handleAuthError);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const intervalId = window.setInterval(async () => {
      try {
        const res = await getMeApi();
        const freshUser = unwrapMeResponse(res);

        if (isBlockedUserStatus(freshUser)) {
          dispatchBlockedEvent(freshUser);
          return;
        }

        setUser(freshUser);
        saveAuth({ user: freshUser });
      } catch (err) {
        const status = err?.response?.status;

        if (status === 401 || status === 403) {
          if (shouldTreatAsBlockedError(err)) {
            dispatchBlockedErrorEvent(err);
          } else {
            dispatchSessionExpiredEvent();
          }
        }
      }
    }, ACCOUNT_STATUS_CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [user]);

  const handleLoginSuccess = (authData) => {
    saveAuth(authData);
    setUser(authData.user);
  };

  const refreshUser = async () => {
    try {
      const res = await getMeApi();
      const freshUser = unwrapMeResponse(res);

      if (isBlockedUserStatus(freshUser)) {
        dispatchBlockedEvent(freshUser);
        return null;
      }

      setUser(freshUser);
      saveAuth({ user: freshUser });

      return freshUser;
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        if (shouldTreatAsBlockedError(err)) {
          dispatchBlockedErrorEvent(err);
        } else if (getAccessToken()) {
          dispatchSessionExpiredEvent();
        }

        clearAuth();
        setUser(null);
      } else {
        const stored = localStorage.getItem("user");
        if (stored) setUser(JSON.parse(stored));
      }

      return null;
    }
  };

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // vẫn clear FE nếu BE logout lỗi
    }

    clearAuth();
    clearLocalDrafts();

    setUser(null);
  };

  const handleBlockedModalOk = async () => {
    try {
      await logoutApi();
    } catch {
      // vẫn clear FE
    }

    clearAuth();
    clearLocalDrafts();

    setUser(null);

    setBlockedModal({
      open: false,
      title: "",
      message: "",
      reason: "",
      until: "",
    });

    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        handleLoginSuccess,
        handleLogout,
        refreshUser,
      }}
    >
      {children}

      {blockedModal.open && (
        <AccountBlockedModal
          title={blockedModal.title}
          message={blockedModal.message}
          reason={blockedModal.reason}
          until={blockedModal.until}
          onOk={handleBlockedModalOk}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải dùng bên trong AuthProvider");
  return ctx;
}

function AccountBlockedModal({ title, message, reason, until, onOk }) {
  const normalizedTitle = String(title || "").toLowerCase();

  const isSessionExpired = normalizedTitle.includes("session");
  const isBanned =
    normalizedTitle.includes("banned") || normalizedTitle.includes("ban");
  const isLocked =
    normalizedTitle.includes("locked") ||
    normalizedTitle.includes("temporarily");

  const icon = isSessionExpired
    ? "shield_lock"
    : isBanned
    ? "block"
    : isLocked
    ? "lock_clock"
    : "admin_panel_settings";

  const toneClass = isSessionExpired
    ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-300"
    : "border-red-400/40 bg-red-400/10 text-red-300";

  const buttonClass = isSessionExpired
    ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-300 hover:bg-yellow-400"
    : "border-red-400/50 bg-red-400/10 text-red-300 hover:bg-red-400";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#151a22] p-6 shadow-2xl">
        <div
          className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border ${toneClass}`}
        >
          <span className="material-symbols-outlined text-3xl">{icon}</span>
        </div>

        <h2 className="text-center text-2xl font-black text-white">
          {title || "Account Restricted"}
        </h2>

        <p className="mt-4 text-center text-sm leading-6 text-gray-300">
          {message ||
            (isSessionExpired
              ? "Your session is no longer valid. Please login again."
              : "Your account is currently restricted. Please login again.")}
        </p>

        {reason && !isSessionExpired && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Reason
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-200">{reason}</p>
          </div>
        )}

        {until && !isSessionExpired && (
          <div className="mt-3 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-yellow-300">
              Locked Until
            </p>
            <p className="mt-2 text-sm font-semibold text-yellow-100">
              {formatBlockedUntil(until)}
            </p>
          </div>
        )}

        <p className="mt-5 text-center text-xs leading-5 text-gray-500">
          You will be redirected to the login page after confirming.
        </p>

        <button
          type="button"
          onClick={onOk}
          className={`mt-6 w-full rounded-xl border px-5 py-3 text-sm font-bold transition hover:text-black ${buttonClass}`}
        >
          OK, back to login
        </button>
      </div>
    </div>
  );
}

function formatBlockedUntil(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString();
}