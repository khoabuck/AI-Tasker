import { createContext, useContext, useEffect, useRef, useState } from "react";
import { getMeApi, logoutApi } from "../api/auth.api";
import { saveAuth, clearAuth, getUserFromStorage } from "../utils/auth.utils";
import {
  ACCOUNT_BLOCKED_EVENT,
  AUTH_ERROR_EVENT,
} from "../api/axiosInstance";
import { formatDateTime } from "../utils/dateTime.utils";

const AuthContext = createContext(null);

const ACCOUNT_STATUS_CHECK_INTERVAL_MS = 15000;

const PUBLIC_AUTH_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/verify-email-notice",
  "/oauth/callback",
  "/privacy-policy",
  "/terms-of-service",
  "/dispute-policy",
];

const BLOCKED_STATUSES = [
  "LOCKED",
  "BANNED",
  "BAN",
  "SUSPENDED",
  "DISABLED",
  "INACTIVE",
  "BLOCKED",
];

function isPublicAuthPage() {
  if (typeof window === "undefined") return false;

  const pathname = window.location.pathname;

  return PUBLIC_AUTH_PATHS.includes(pathname);
}

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

function getErrorData(error) {
  return error?.response?.data || {};
}

function getErrorText(error) {
  const data = getErrorData(error);

  if (typeof data === "string") {
    return data;
  }

  return String(
    data?.message ||
      data?.title ||
      data?.detail ||
      data?.error ||
      error?.message ||
      ""
  );
}

function getErrorStatusText(error) {
  const data = getErrorData(error);

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

function getErrorReason(error) {
  const data = getErrorData(error);

  if (typeof data === "string") {
    return data;
  }

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

function getErrorUntil(error) {
  const data = getErrorData(error);

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

function shouldTreatAsBlockedError(error) {
  const statusText = getErrorStatusText(error);
  const text = getErrorText(error).toLowerCase();

  return (
    BLOCKED_STATUSES.includes(statusText) ||
    text.includes("locked") ||
    text.includes("lockout") ||
    text.includes("banned") ||
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

function getBlockedPayloadFromError(error) {
  const statusText = getErrorStatusText(error);
  const text = getErrorText(error).toLowerCase();
  const reason = getErrorReason(error);
  const until = getErrorUntil(error);

  const isLocked =
    statusText === "LOCKED" ||
    statusText === "SUSPENDED" ||
    text.includes("locked") ||
    text.includes("lockout") ||
    text.includes("suspended") ||
    text.includes("tạm khóa") ||
    text.includes("khóa") ||
    text.includes("khoá");

  const isBanned =
    statusText === "BANNED" ||
    statusText === "BAN" ||
    text.includes("banned") ||
    text.includes("permanently banned") ||
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

  return {
    title: "Your account is restricted",
    description:
      "Your account has been restricted by the administrator. Please contact support if you believe this is a mistake.",
    reason,
    until,
  };
}

function dispatchAccountEvent(payload) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(ACCOUNT_BLOCKED_EVENT, {
      detail: payload,
    })
  );
}

function dispatchBlockedEvent(user) {
  dispatchAccountEvent(getBlockedStatusPayload(user));
}

function dispatchBlockedErrorEvent(error) {
  dispatchAccountEvent(getBlockedPayloadFromError(error));
}

function dispatchSessionExpiredEvent() {
  dispatchAccountEvent(getSessionExpiredPayload());
}

function unwrapMeResponse(response) {
  return (
    response?.data?.data?.user ||
    response?.data?.user ||
    response?.data?.data ||
    response?.data ||
    response
  );
}

function clearLocalDrafts() {
  localStorage.removeItem("aitasker_expert_profile_setup_draft");
  localStorage.removeItem("aitasker_expert_profile_edit_draft");
  localStorage.removeItem("aitasker_expert_profile_correction_draft");
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkingAuthErrorRef = useRef(false);
  const userRef = useRef(null);

  const [blockedModal, setBlockedModal] = useState({
    open: false,
    title: "",
    message: "",
    reason: "",
    until: "",
  });

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const clearCurrentSession = () => {
    clearAuth();
    setUser(null);
    userRef.current = null;
  };

  const processAuthError = (
    error,
    {
      hadKnownUser = Boolean(userRef.current),
      allowSessionPopup = true,
      allowRestrictedPopup = true,
    } = {}
  ) => {
    const status = error?.response?.status;

    if (status !== 401 && status !== 403) {
      return false;
    }

    const isBlocked = shouldTreatAsBlockedError(error);

    if (isBlocked && allowRestrictedPopup) {
      dispatchBlockedErrorEvent(error);
    } else if (status === 403 && allowRestrictedPopup) {
      dispatchAccountEvent({
        title: "Your account is restricted",
        description:
          "Your account has been restricted by the administrator. Please contact support if you believe this is a mistake.",
        reason: getErrorReason(error),
        until: getErrorUntil(error),
      });
    } else if (
      status === 401 &&
      hadKnownUser &&
      allowSessionPopup &&
      !isPublicAuthPage()
    ) {
      dispatchSessionExpiredEvent();
    }

    clearCurrentSession();
    return true;
  };

  const verifyAuthErrorWithMe = async () => {
    if (checkingAuthErrorRef.current) return;

    checkingAuthErrorRef.current = true;

    const hadKnownUser = Boolean(userRef.current || getUserFromStorage());

    try {
      const response = await getMeApi();
      const freshUser = unwrapMeResponse(response);

      if (isBlockedUserStatus(freshUser)) {
        dispatchBlockedEvent(freshUser);
        clearCurrentSession();
        return;
      }

      setUser(freshUser);
      userRef.current = freshUser;
      saveAuth({ user: freshUser });
    } catch (error) {
      processAuthError(error, {
        hadKnownUser,
        allowSessionPopup: hadKnownUser,
        allowRestrictedPopup: hadKnownUser,
      });
    } finally {
      checkingAuthErrorRef.current = false;
    }
  };

  useEffect(() => {
    const restore = async () => {
      const storedUser = getUserFromStorage();

      const storedStatus = getUserStatus(storedUser);
      const isIncompleteOnboarding = [
        "PENDING_ROLE",
        "PENDING_EMAIL_VERIFICATION",
      ].includes(storedStatus);

      if (isIncompleteOnboarding && storedUser) {
        setUser(storedUser);
        userRef.current = storedUser;
        setLoading(false);
        return;
      }

      try {
        const response = await getMeApi();
        const freshUser = unwrapMeResponse(response);

        if (isBlockedUserStatus(freshUser)) {
          dispatchBlockedEvent(freshUser);
          clearCurrentSession();
          return;
        }

        setUser(freshUser);
        userRef.current = freshUser;
        saveAuth({ user: freshUser });
      } catch (error) {
        const status = error?.response?.status;

        if (status === 401 || status === 403) {
          processAuthError(error, {
            hadKnownUser: Boolean(storedUser),
            allowSessionPopup: Boolean(storedUser) && !isPublicAuthPage(),
            allowRestrictedPopup: Boolean(storedUser),
          });
        } else if (storedUser) {
          setUser(storedUser);
          userRef.current = storedUser;
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
          "Your account is currently restricted.",
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
      const hadKnownUser = Boolean(userRef.current);

      try {
        const response = await getMeApi();
        const freshUser = unwrapMeResponse(response);

        if (isBlockedUserStatus(freshUser)) {
          dispatchBlockedEvent(freshUser);
          clearCurrentSession();
          return;
        }

        setUser(freshUser);
        userRef.current = freshUser;
        saveAuth({ user: freshUser });
      } catch (error) {
        processAuthError(error, {
          hadKnownUser,
          allowSessionPopup: true,
          allowRestrictedPopup: true,
        });
      }
    }, ACCOUNT_STATUS_CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [user]);

  const handleLoginSuccess = (authData) => {
    const nextUser = authData?.user || null;

    if (!nextUser) return;

    saveAuth({ user: nextUser });
    setUser(nextUser);
    userRef.current = nextUser;

    setBlockedModal({
      open: false,
      title: "",
      message: "",
      reason: "",
      until: "",
    });
  };

  const refreshUser = async () => {
    const hadKnownUser = Boolean(userRef.current || getUserFromStorage());

    try {
      const response = await getMeApi();
      const freshUser = unwrapMeResponse(response);

      if (isBlockedUserStatus(freshUser)) {
        dispatchBlockedEvent(freshUser);
        clearCurrentSession();
        return null;
      }

      setUser(freshUser);
      userRef.current = freshUser;
      saveAuth({ user: freshUser });

      return freshUser;
    } catch (error) {
      processAuthError(error, {
        hadKnownUser,
        allowSessionPopup: hadKnownUser && !isPublicAuthPage(),
        allowRestrictedPopup: hadKnownUser,
      });

      return null;
    }
  };

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // Vẫn clear FE nếu API logout lỗi.
    }

    clearCurrentSession();
    clearLocalDrafts();

    setBlockedModal({
      open: false,
      title: "",
      message: "",
      reason: "",
      until: "",
    });
  };

  const handleBlockedModalOk = async () => {
    try {
      await logoutApi();
    } catch {
      // Vẫn clear FE nếu API logout lỗi.
    }

    clearCurrentSession();
    clearLocalDrafts();

    setBlockedModal({
      open: false,
      title: "",
      message: "",
      reason: "",
      until: "",
    });

    window.location.replace("/login");
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
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth phải dùng bên trong AuthProvider");
  }

  return context;
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
              : "Your account is currently restricted.")}
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
              {formatDateTime(until, String(until))}
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

