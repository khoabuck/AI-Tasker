import axios from "axios";

const cleanUrl = (url) => String(url || "").trim().replace(/\/+$/, "");

const getApiBaseUrl = () => {
  const apiBaseUrl = cleanUrl(import.meta.env.VITE_API_BASE_URL);

  if (!apiBaseUrl) {
    throw new Error("Missing VITE_API_BASE_URL");
  }

  return apiBaseUrl;
};

const ACCOUNT_BLOCKED_EVENT = "aitasker-account-blocked";
const AUTH_ERROR_EVENT = "aitasker-auth-error";

const normalizeRequestUrl = (config) => {
  return String(config?.url || "").toLowerCase();
};

const isAuthMeRequest = (config) => {
  return normalizeRequestUrl(config).includes("/auth/me");
};

const isPublicAuthRequest = (config) => {
  const url = normalizeRequestUrl(config);

  const publicAuthPaths = [
    "/auth/login",
    "/auth/register",
    "/auth/google-login",
    "/auth/google-callback",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/auth/verify-email",
    "/auth/resend-verification",
    "/auth/logout",
  ];

  return publicAuthPaths.some((path) => url.includes(path));
};

const dispatchAuthErrorEvent = (error) => {
  if (typeof window === "undefined") return;

  // /auth/me được AuthContext tự xử lý để phân biệt:
  // - chưa đăng nhập
  // - hết phiên
  // - bị lock/ban
  if (isAuthMeRequest(error?.config)) return;

  // Không mở modal session cho API public.
  if (isPublicAuthRequest(error?.config)) return;

  window.dispatchEvent(
    new CustomEvent(AUTH_ERROR_EVENT, {
      detail: {
        status: error?.response?.status,
        url: error?.config?.url || "",
      },
    })
  );
};

const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log("REQUEST URL:", `${config.baseURL}${config.url}`);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401 || status === 403) {
      dispatchAuthErrorEvent(error);
    }

    return Promise.reject(error);
  }
);

export { ACCOUNT_BLOCKED_EVENT, AUTH_ERROR_EVENT };
export default axiosInstance;